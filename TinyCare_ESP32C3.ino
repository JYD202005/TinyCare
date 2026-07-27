// ============================================================
//  TinyCare Sensor v2 — ESP32-C3 Super Mini
//  Con algoritmo de fusion sensorial anti-artefactos de movimiento
//  VERSION CORREGIDA
//
//  SENSORES:
//    GY-906 MLX90614  — Temperatura IR (-70 a 380 C)
//    MAX30100/MAX30102 — Frecuencia cardiaca + SpO2
//    MPU6050           — Acelerometro 3 ejes + Giroscopio 3 ejes (6 DOF)
//
//  ALGORITMO DE FUSION:
//    El movimiento del bebe corrompe las lecturas opticas del MAX3010x.
//    Este firmware combina el acelerometro Y el giroscopio del MPU6050
//    para calcular un "motion_score". Con ese score:
//      1. Ajusta dinamicamente el filtro EMA (suavizado adaptativo)
//      2. Calcula un "confidence score" [0.0 - 1.0]
//      3. Solo confirma alertas si N lecturas consecutivas de ALTA
//         confianza muestran valores anomalos (anti falsas alarmas)
//
//  BLE:
//    UUIDs identicos a src/services/ble/bleTypes.ts de la app TinyCare
//    Service : 4fafc201-1fb5-459e-8fcc-c5c9c331914b
//    Char    : beb5483e-36e1-4688-b7f5-ea07361b26a8
//
//  JSON enviado:
//    { "bpm": 120, "spo2": 98, "temp": 36.5, "activity": "Reposo", "conf": 0.92 }
//
// ============================================================
//  LIBRERIAS REQUERIDAS (Arduino Library Manager):
//    NimBLE-Arduino          h2zero/NimBLE-Arduino  (>= v1.4.2 recomendado)
//    Adafruit MLX90614       Adafruit
//    Adafruit MPU6050        Adafruit
//    Adafruit Unified Sensor Adafruit
//
//    Si usas MAX30100:
//      MAX30100lib           oxullo/Arduino-MAX30100
//
//    Si usas MAX30102 (RECOMENDADO, mas preciso):
//      SparkFun MAX3010x     SparkFun Electronics
//      ("SparkFun MAX3010x Pulse and Proximity Sensor Library")
//
//  BOARD : "ESP32C3 Dev Module" en Arduino IDE
//  CORE  : esp32 by Espressif >= 2.0.14
// ============================================================


// ============================================================
//  SELECTOR DE SENSOR OPTICO
//  Descomenta UNA linea segun el sensor que uses:
// ============================================================
// #define USE_MAX30102    // MAX30102 (morado, mas preciso)
#define USE_MAX30100       // MAX30100 (rojo, activo por defecto)


// ============================================================
//  INCLUDES CONDICIONALES segun sensor seleccionado
// ============================================================
#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

#ifdef USE_MAX30102
  // Libreria: SparkFun MAX3010x Pulse and Proximity Sensor Library
  #include "MAX30105.h"
  #include "spo2_algorithm.h"
  MAX30105 particleSensor;

  #define BUFFER_LENGTH 100
  uint32_t irBuffer[BUFFER_LENGTH];
  uint32_t redBuffer[BUFFER_LENGTH];
  int32_t  spo2Calculated      = 0;
  int8_t   validSPO2           = 0;
  int32_t  heartRateCalculated = 0;
  int8_t   validHeartRate      = 0;

  // Estado de la ventana deslizante NO bloqueante
  uint8_t  max30102_newSamples = 0;  // Cuantas muestras nuevas se acumularon
  bool     max30102_ready      = false; // Buffer inicial relleno
#else
  // Libreria: MAX30100lib (oxullo/Arduino-MAX30100)
  #include "MAX30100_PulseOximeter.h"
  PulseOximeter pox;
  void onBeatDetected() { Serial.println("[MAX30100] Latido."); }
#endif

// ---------- BLE (NimBLE nativo del ESP32) ----------
#include <NimBLEDevice.h>
#include <NimBLEServer.h>
#include <NimBLEUtils.h>
#include <NimBLECharacteristic.h>


// ============================================================
//  UUIDs BLE — deben coincidir con bleTypes.ts de la app
// ============================================================
#define TINYCARE_SERVICE_UUID  "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BIOMETRICS_CHAR_UUID   "beb5483e-36e1-4688-b7f5-ea07361b26a8"


// ============================================================
//  PINES I2C — ESP32-C3 Super Mini
// ============================================================
#define I2C_SDA 8
#define I2C_SCL 9


// ============================================================
//  PARAMETROS DEL ALGORITMO DE FUSION
//  (calibrar segun el bebe y el montaje fisico del sensor)
// ============================================================

// --- Filtro EMA adaptativo ---
// Alpha alto = respuesta rapida (poca memoria del pasado)
// Alpha bajo = suavizado fuerte (mas estable ante movimiento)
#define EMA_ALPHA_HIGH  0.30f   // En reposo: lectura confiable
#define EMA_ALPHA_LOW   0.05f   // En movimiento: anclar al historico

// --- Motion Score ---
// motion_score = ACCEL_WEIGHT * dynamic_accel + GYRO_WEIGHT * gyro_mag
// dynamic_accel = |accel_mag - 9.81|  (elimina la componente gravitacional)
#define ACCEL_WEIGHT    0.6f
#define GYRO_WEIGHT     0.4f

// --- Umbrales de confidence ---
// score <= MOTION_LOW  -> confidence = 1.0 (reposo total)
// score >= MOTION_HIGH -> confidence = 0.0 (movimiento intenso)
#define MOTION_LOW      0.30f
#define MOTION_HIGH     3.50f

// --- Confirmacion de alertas anti-ruido ---
// La alerta solo se activa tras ALERT_CONFIRM_COUNT lecturas
// consecutivas anomalas con confidence >= CONFIDENCE_THRESHOLD
#define ALERT_CONFIRM_COUNT   4
#define CONFIDENCE_THRESHOLD  0.60f

// --- Umbrales clinicos para bebe ---
#define HR_MIN_ALERT    80       // BPM minima (bradicardia)
#define HR_MAX_ALERT    220      // BPM maxima (taquicardia)
#define SPO2_MIN_ALERT  90       // % SpO2 minima (hipoxemia)
#define TEMP_MIN_ALERT  36.0f    // Temperatura minima (°C)
#define TEMP_MAX_ALERT  38.5f    // Temperatura maxima / fiebre (°C)

// --- Tiempos ---
#define REPORTING_PERIOD_MS  1000   // Telemetria BLE cada 1 s
#define ACTIVITY_WINDOW_MS   2000   // Ventana de clasificacion de actividad


// ============================================================
//  OBJETOS DE SENSORES
// ============================================================
Adafruit_MLX90614 mlx;
Adafruit_MPU6050  mpu;

NimBLEServer*         pServer    = nullptr;
NimBLECharacteristic* pBiometric = nullptr;
bool deviceConnected = false;


// ============================================================
//  ESTADO INTERNO DEL ALGORITMO DE FUSION
// ============================================================
float   emaHR          = 0.0f;
float   emaSPO2        = 0.0f;
// FIX: uint8_t se desbordaria a 0 en alertas sostenidas; usar uint16_t
uint16_t alertCounter  = 0;
bool     alertActive   = false;
float    lastConfidence = 1.0f;
String   currentActivity = "Reposo";

// Acumuladores para ventana de actividad
float    accelMagSum   = 0.0f;
float    gyroMagSum    = 0.0f;
// FIX: uint32_t puede acumular durante horas; reset de seguridad incluido
uint32_t motionSamples = 0;
uint32_t tsActivityWindow = 0;
uint32_t tsLastReport     = 0;


// ============================================================
//  CALLBACKS BLE
//
//  FIX: La firma de onConnect cambio en NimBLE-Arduino v1.4.2+
//  de (NimBLEServer*, ble_gap_conn_desc*) a (NimBLEServer*, NimBLEConnInfo&)
//  Usamos la firma nueva (compatible con versiones modernas del core ESP32).
// ============================================================
class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* pSrv, NimBLEConnInfo& connInfo) override {
    deviceConnected = true;
    Serial.println("[BLE] Cliente conectado.");
  }
  void onDisconnect(NimBLEServer* pSrv, NimBLEConnInfo& connInfo, int reason) override {
    deviceConnected = false;
    Serial.println("[BLE] Cliente desconectado — reiniciando advertising...");
    NimBLEDevice::startAdvertising();
  }
};


// ============================================================
//  FUNCIONES DEL ALGORITMO DE FUSION
// ============================================================

// Calcula el motion_score combinando aceleracion dinamica y giroscopio
float computeMotionScore(float accelMag, float gyroMag) {
  float dynamicAccel = fabsf(accelMag - 9.81f); // Eliminar gravedad estatica
  return ACCEL_WEIGHT * dynamicAccel + GYRO_WEIGHT * gyroMag;
}

// Mapea motion_score a un confidence score en [0.0, 1.0]
float motionScoreToConfidence(float score) {
  if (score <= MOTION_LOW)  return 1.0f;
  if (score >= MOTION_HIGH) return 0.0f;
  return 1.0f - (score - MOTION_LOW) / (MOTION_HIGH - MOTION_LOW);
}

// Alpha del filtro EMA interpolado segun confianza
float adaptiveAlpha(float confidence) {
  return EMA_ALPHA_LOW + confidence * (EMA_ALPHA_HIGH - EMA_ALPHA_LOW);
}

// Aplica el filtro EMA; inicializa con newVal si prev == 0
float applyEMA(float prev, float newVal, float alpha) {
  if (prev == 0.0f) return newVal;
  return alpha * newVal + (1.0f - alpha) * prev;
}


// ============================================================
//  EVALUACION DE ALERTAS CLINICAS CON CONFIRMACION
//
//  Solo activa alerta si hay ALERT_CONFIRM_COUNT lecturas
//  consecutivas anomalas con confidence suficiente.
//  Si el valor vuelve a normal se resetea el contador.
//  Si hay movimiento (baja confianza) el contador no avanza
//  pero tampoco se resetea (espera datos estables).
// ============================================================
void evaluateAlert(float hr, float spo2, float temp, float confidence) {
  bool anomaly = (hr   < HR_MIN_ALERT   || hr   > HR_MAX_ALERT  ||
                  spo2  < SPO2_MIN_ALERT  ||
                  temp  < TEMP_MIN_ALERT  || temp  > TEMP_MAX_ALERT);

  if (anomaly && confidence >= CONFIDENCE_THRESHOLD) {
    if (alertCounter < 0xFFFF) alertCounter++; // Evitar overflow uint16_t
    if (alertCounter >= ALERT_CONFIRM_COUNT) {
      alertActive = true;
    }
  } else if (!anomaly) {
    // Lectura normal: resetear contador y alerta
    alertCounter = 0;
    alertActive  = false;
  }
  // Si hay anomalia pero baja confianza: no cambiar estado (esperar)

  if (alertActive) {
    Serial.println("[ALERTA] Anomalia confirmada con alta confianza!");
  }
}


// ============================================================
//  CLASIFICACION DE ACTIVIDAD
//  Basada en la aceleracion dinamica promedio de la ventana.
//
//  CONTRATO CON LA APP (src/types/medical.ts):
//    EstadoActividad = 'Reposo' | 'Sueño' | 'Inquieto' | 'Llanto'
//
//  IMPORTANTE: el parser de la app usa JSON.parse sobre UTF-8.
//  La ñ de 'Sueño' se envia como \xC3\xB1 (UTF-8 de 2 bytes),
//  que es valido en JSON y BLE. Arduino String lo maneja correctamente.
// ============================================================
String classifyActivity(float avgDynamicAccel) {
  if (avgDynamicAccel < 0.4f) return "Reposo";
  if (avgDynamicAccel < 1.0f) return "Sue\xC3\xB1o"; // 'Sueño' UTF-8 — coincide con EstadoActividad
  if (avgDynamicAccel < 3.0f) return "Inquieto";
  return "Llanto";
}


// ============================================================
//  INICIALIZAR BLE
//
//  FIX Advertising API — NimBLE-Arduino v2:
//    setScanResponse(true)  -> enableScanResponse(true)
//    setMinPreferred(x)     -> setPreferredParams(x, 0x12)
// ============================================================
void setupBLE() {
  NimBLEDevice::init("TinyCare_Sensor");
  NimBLEDevice::setPower(ESP_PWR_LVL_P9); // +9 dBm, valido en ESP32-C3

  pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  NimBLEService* pService = pServer->createService(TINYCARE_SERVICE_UUID);

  // READ + NOTIFY — la app usa monitorCharacteristicForDevice (requiere NOTIFY)
  pBiometric = pService->createCharacteristic(
    BIOMETRICS_CHAR_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );

  pService->start();

  NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
  pAdv->addServiceUUID(TINYCARE_SERVICE_UUID);
  pAdv->enableScanResponse(true);            // FIX: era setScanResponse()
  pAdv->setPreferredParams(0x06, 0x12);      // FIX: era setMinPreferred()
  NimBLEDevice::startAdvertising();

  Serial.println("[BLE] TinyCare_Sensor anunciandose...");
}


// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=== TinyCare Sensor v2 - Fusion Sensorial ===");

  Wire.begin(I2C_SDA, I2C_SCL);
  // FIX: Fijar I2C a 100 kHz — el MAX30100 es sensible a velocidades altas
  // y puede fallar en buses que otros modulos elevan a 400 kHz
  Wire.setClock(100000);

  // ---- MLX90614 (addr 0x5A) ----
  Serial.print("[MLX90614] Iniciando... ");
  if (!mlx.begin()) {
    Serial.println("ERROR - Verifica I2C (SDA=GPIO8, SCL=GPIO9).");
    while (1) delay(100);
  }
  Serial.println("OK");

  // ---- MPU6050 (addr 0x68) ----
  Serial.print("[MPU6050] Iniciando... ");
  if (!mpu.begin(0x68, &Wire)) {
    Serial.println("ERROR - Verifica I2C (addr 0x68).");
    while (1) delay(100);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  Serial.println("OK");

  // ---- Sensor optico (addr 0x57 para MAX30100, 0x57 para MAX30102) ----
#ifdef USE_MAX30102
  Serial.print("[MAX30102] Iniciando... ");
  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) { // 100 kHz
    Serial.println("ERROR - Verifica I2C.");
    while (1) delay(100);
  }
  // 60 = brillo LED, 4 = promedio, 2 = modo (Red+IR), 25 Hz, 411 us, 4096 rango
  particleSensor.setup(60, 4, 2, 25, 411, 4096);
  Serial.println("OK");

  // Llenar el buffer inicial de forma BLOQUEANTE solo una vez en setup()
  // (no en loop para evitar que el watchdog del ESP32 dispare un reset)
  Serial.println("[MAX30102] Llenando buffer inicial (~4 s)...");
  for (byte i = 0; i < BUFFER_LENGTH; i++) {
    while (!particleSensor.available()) {
      particleSensor.check();
      yield(); // Evita watchdog reset en ESP32
    }
    redBuffer[i] = particleSensor.getRed();
    irBuffer[i]  = particleSensor.getIR();
    particleSensor.nextSample();
  }
  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, BUFFER_LENGTH, redBuffer,
    &spo2Calculated, &validSPO2,
    &heartRateCalculated, &validHeartRate
  );
  emaHR   = (validHeartRate  && heartRateCalculated > 0) ? (float)heartRateCalculated : 0.0f;
  emaSPO2 = (validSPO2       && spo2Calculated      > 0) ? (float)spo2Calculated      : 0.0f;
  max30102_ready = true;
  Serial.println("[MAX30102] Buffer listo.");

#else
  // MAX30100 (addr 0x57) — no hay conflicto con MLX90614 (0x5A) ni MPU6050 (0x68)
  Serial.print("[MAX30100] Iniciando... ");
  if (!pox.begin()) {
    Serial.println("ERROR - Verifica I2C (addr 0x57).");
    while (1) delay(100);
  }
  pox.setIRLedCurrent(MAX30100_LED_CURR_27_1MA); // 27.1 mA, optimo para SpO2
  pox.setOnBeatDetectedCallback(onBeatDetected);
  Serial.println("OK");
#endif

  setupBLE();

  tsActivityWindow = millis();
  Serial.println("=== Sistema listo. Iniciando fusion sensorial... ===");
}


// ============================================================
//  LOOP
// ============================================================
void loop() {

  // ==========================================================
  //  1. ACTUALIZAR SENSOR OPTICO
  // ==========================================================
#ifdef USE_MAX30102
  // Ventana deslizante NO bloqueante:
  // Leer muestras disponibles hasta completar 25 (1 segundo a 25 Hz)
  while (particleSensor.available() && max30102_newSamples < 25) {
    // Desplazar el buffer hacia atras para hacer sitio a la muestra nueva
    for (byte i = 1; i < BUFFER_LENGTH; i++) {
      redBuffer[i - 1] = redBuffer[i];
      irBuffer[i - 1]  = irBuffer[i];
    }
    redBuffer[BUFFER_LENGTH - 1] = particleSensor.getRed();
    irBuffer[BUFFER_LENGTH - 1]  = particleSensor.getIR();
    particleSensor.nextSample();
    max30102_newSamples++;
  }
  particleSensor.check(); // Solicitar mas datos al sensor

  float rawHR   = emaHR;   // Mantener ultimo valor valido por defecto
  float rawSPO2 = emaSPO2;

  // Recalcular solo cuando tenemos 25 muestras nuevas (actualiza ~1 vez/s)
  if (max30102_newSamples >= 25) {
    maxim_heart_rate_and_oxygen_saturation(
      irBuffer, BUFFER_LENGTH, redBuffer,
      &spo2Calculated, &validSPO2,
      &heartRateCalculated, &validHeartRate
    );
    if (validHeartRate && heartRateCalculated > 0) rawHR   = (float)heartRateCalculated;
    if (validSPO2      && spo2Calculated      > 0) rawSPO2 = (float)spo2Calculated;
    max30102_newSamples = 0;
  }

#else
  // FIX: pox.update() debe llamarse en cada iteracion del loop
  pox.update();

  // FIX: getSpO2() retorna uint8_t, no int; cast explicito a float
  float rawHR   = pox.getHeartRate();
  float rawSPO2 = (float)(uint8_t)pox.getSpO2();
#endif

  // ==========================================================
  //  2. LEER MPU6050 — acelerometro + giroscopio 6 DOF
  // ==========================================================
  sensors_event_t accelEvt, gyroEvt, tempEvt;
  mpu.getEvent(&accelEvt, &gyroEvt, &tempEvt);

  float ax = accelEvt.acceleration.x;
  float ay = accelEvt.acceleration.y;
  float az = accelEvt.acceleration.z;
  float accelMag = sqrtf(ax*ax + ay*ay + az*az);

  float gx = gyroEvt.gyro.x;
  float gy = gyroEvt.gyro.y;
  float gz = gyroEvt.gyro.z;
  float gyroMag = sqrtf(gx*gx + gy*gy + gz*gz);

  // Acumular para clasificacion de actividad
  float dynamicAccel = fabsf(accelMag - 9.81f);
  accelMagSum  += dynamicAccel;
  gyroMagSum   += gyroMag;
  motionSamples++;

  // FIX: reset de seguridad para evitar overflow de acumuladores
  if (motionSamples > 50000) {
    accelMagSum   = dynamicAccel;
    gyroMagSum    = gyroMag;
    motionSamples = 1;
  }

  // ==========================================================
  //  3. CALCULAR MOTION SCORE Y CONFIDENCE
  // ==========================================================
  float motionScore = computeMotionScore(accelMag, gyroMag);
  float confidence  = motionScoreToConfidence(motionScore);
  lastConfidence    = confidence;

  // ==========================================================
  //  4. FILTRO EMA ADAPTATIVO
  //     Alpha pequeno en movimiento = lectura "congelada" cerca
  //     del ultimo valor confiable (no sigue el ruido optico)
  // ==========================================================
  float alpha = adaptiveAlpha(confidence);
  emaHR   = applyEMA(emaHR,   rawHR,   alpha);
  emaSPO2 = applyEMA(emaSPO2, rawSPO2, alpha);

  // ==========================================================
  //  5. CLASIFICACION DE ACTIVIDAD (cada ACTIVITY_WINDOW_MS)
  // ==========================================================
  if (millis() - tsActivityWindow >= ACTIVITY_WINDOW_MS && motionSamples > 0) {
    float avgDynAccel = accelMagSum / (float)motionSamples;
    currentActivity   = classifyActivity(avgDynAccel);
    accelMagSum   = 0.0f;
    gyroMagSum    = 0.0f;
    motionSamples = 0;
    tsActivityWindow = millis();
  }

  // ==========================================================
  //  6. REPORTAR POR BLE (cada REPORTING_PERIOD_MS)
  // ==========================================================
  if (millis() - tsLastReport >= REPORTING_PERIOD_MS) {
    tsLastReport = millis();

    float tempC = mlx.readObjectTempC();

    // Evaluar alertas clinicas con confirmacion anti-ruido
    evaluateAlert(emaHR, emaSPO2, tempC, confidence);

    // Construir JSON
    // Campos requeridos por parseESP32Payload: bpm, spo2, temp, activity
    // Campo extra conf: informativo (la app lo acepta por JSON.parse pero no lo usa aun)
    String payload = "{";
    payload += "\"bpm\":"        + String((int)emaHR)          + ",";
    payload += "\"spo2\":"       + String((int)emaSPO2)        + ",";
    payload += "\"temp\":"       + String(tempC, 1)            + ",";
    payload += "\"activity\":\"" + currentActivity             + "\",";
    payload += "\"conf\":"       + String(lastConfidence, 2);
    payload += "}";

    // Log de depuracion en el monitor serie
    Serial.printf("[FUSION] BPM:%.1f SpO2:%.1f Temp:%.1f Act:%s Conf:%.2f Score:%.2f Alpha:%.2f Alert:%s\n",
      emaHR, emaSPO2, tempC,
      currentActivity.c_str(),
      confidence, motionScore, alpha,
      alertActive ? "SI" : "no"
    );

    // Enviar por BLE si hay cliente conectado
    if (deviceConnected) {
      pBiometric->setValue(payload.c_str());
      pBiometric->notify(); // Dispara onUpdate() en la app via monitorCharacteristicForDevice
    }
  }
}
