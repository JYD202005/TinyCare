Listed directory TinyCare

Para seguir usando la comodidad de escanear un **código QR** sin tener que conectar tu teléfono por cable, necesitamos compilar tu aplicación en los servidores de Expo en la nube (usando **EAS Build**).

Al compilarla en la nube, Expo te dará un código QR para que descargues tu propia aplicación personalizada de desarrollo (que ya incluirá el motor de base de datos de WatermelonDB).

Sigue estos pasos en tu terminal:

### 1. Instalar la herramienta de Expo Application Services (EAS)

Si aún no la tienes, instala la CLI globalmente:

```bash
npm install -g eas-cli
```

### 2. Iniciar sesión y configurar tu proyecto

Inicia sesión con tu cuenta de Expo (la misma que usas en la app de tu teléfono):

```bash
eas login
```

Luego, inicializa la configuración de EAS en tu proyecto (si te pregunta qué plataformas, elige "All" o "Android"):

```bash
eas build:configure
```

### 3. Mandar a compilar tu app a la nube

Ejecuta el siguiente comando para iniciar la compilación de tu "Development Build" para Android:

```bash
eas build --profile development --platform android
```

> _Nota: Este proceso puede tardar entre 10 y 15 minutos porque se está compilando en los servidores de Expo._

### 4. Escanear e Instalar

Cuando la compilación termine, **te aparecerá un código QR en la terminal**.

1. Escanea ese código QR con la cámara de tu celular.
2. Descarga e instala el archivo `.apk`.
3. Ahora tendrás una nueva aplicación instalada en tu teléfono llamada **"TinyCare"**.

### 5. Cómo encender tu servidor a partir de ahora

Ya no usarás la app de "Expo Go". Para conectarte a tu código local, abre tu nueva app "TinyCare" instalada, y en tu terminal ejecuta:

```bash
npx expo start --dev-client
```

Escanea el código QR que te da este comando **desde dentro de tu nueva app TinyCare**, ¡y listo! Todo funcionará perfectamente de forma inalámbrica.
