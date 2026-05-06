# Roadmap de Desarrollo: TinyCare (InnovaTecNM 2026)

Este documento registra las tareas estratégicas necesarias para asegurar que TinyCare cumpla al 100% con los lineamientos de la categoría **1.4 Tecnologías para la Salud Humana** y evitar cualquier exclusión de la convocatoria.

## Fase 1: Fundamento y Mitigación de Exclusiones (Lo que ya tenemos)
- [x] **Motor de Evaluación Pediátrica:** Lógica implementada en `src/utils/evaluadorMedico.ts` basada en las tablas oficiales pediátricas de la Secretaría de Salud y el IMSS. Cumple con la exigencia de **análisis inteligente**.
- [x] **Medicina de Precisión:** Cuestionario de Onboarding (`app/onboarding.tsx`) capaz de distinguir entre Neonatos, Lactantes, Niños y condiciones especiales (Prematurez, Riesgo SDR) garantizando que el análisis se hace con precisión y no con rangos de adulto.
- [x] **Arquitectura de Expediente (Base de Datos):** Implementación offline-first con `WatermelonDB` para asegurar un repositorio local de datos en el dispositivo que funciona sin internet y estructura perfiles médicos sólidos.

---

## Fase 2: Tareas Pendientes (Plan de Acción Paso a Paso)

### Paso 1: Conexión de Telemetría Bluetooth y Alertas Críticas
**Objetivo:** Darle vida al "Motor de Evaluación" y cumplir la regla de asistencia clínica en tiempo real.
- [x] **Tarea 1.1:** Interconectar el flujo de datos de la ESP32 (vía `bleService.ts`) directamente con la función principal del `evaluadorMedico.ts`.
- [x] **Tarea 1.2:** Programar el sistema de Alertas. Si el motor detecta un patrón de "Alerta Roja" (ej. Taquicardia severa o sospecha de Apnea FR=0), el sistema debe registrar el evento en WatermelonDB y disparar una notificación local crítica de alta prioridad.
- [x] **Solución Esperada:** Una pantalla "Home / Dashboard" que muestre el estado de los signos vitales coloreados por riesgo clínico (Verde, Amarillo, Rojo).

### Paso 2: El Historial Médico y la Exportación para el Pediatra
**Objetivo:** Romper el "aislamiento funcional" del prototipo y cumplir con la regla de Integración con el Ecosistema de Salud Pública/Privada.
- [x] **Tarea 2.1:** Diseñar la vista de "Historial", extrayendo de WatermelonDB el registro de lecturas y alarmas previas.
- [x] **Tarea 2.2:** Programar un botón de "Generar Reporte Clínico", que compile un resumen de alertas y promedios y lo prepare (ya sea en formato PDF, Excel o Compartir Texto) para que el padre pueda enviarlo vía WhatsApp/Correo al médico pediatra.
- [x] **Solución Esperada:** Empoderamiento real del usuario al facilitar un diagnóstico remoto asistido por datos.

### Paso 3: Interfaz Final de Usuario y Pruebas
**Objetivo:** Pulir la estética multiplataforma y realizar simulaciones.
- [x] **Tarea 3.1:** Crear el componente que permita intercambiar fácilmente entre los diferentes "Bebés" registrados en la app.
- [x] **Tarea 3.2:** Ejecutar pruebas de simulación inyectando datos ficticios críticos para comprobar la estabilidad de la app ante crisis médicas.

### Fase 4: Monetización, Nube y Familia (Implementado)
**Objetivo:** Permitir el crecimiento comercial y colaborativo de TinyCare.
- [x] **Seguridad y Atomización:** Asegurar las subidas a Supabase, confirmando que perfil y biometría suban juntos sin corrupción. Row Level Security configurado basado en "plan_suscripcion".
- [x] **Sincronización Cloud:** Trasladar la base local WatermelonDB a la nube de manera silenciosa para usuarios Premium.
- [x] **Plan Familiar:** Creación de un sistema de invitaciones por correo donde 1 cuenta Premium ampara a 3 cuidadores gratuitos en modo lectura remota.
- [x] **Notificaciones en 2do Plano:** Sistema de notificaciones persistentes (Foreground Service) estilo reproductor de música para el monitoreo de constantes vitales en background sin necesidad de mantener la pantalla encendida.
