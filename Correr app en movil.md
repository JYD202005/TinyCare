El firewall de Windows bloquea el puerto 8081. La solución más rápida es usar el modo **tunnel**:

Ran command: `npx expo start --clear --tunnel`

El servidor anterior sigue corriendo. **En tu terminal activa** haz esto:

1. Presiona `Ctrl+C` para detener el servidor actual
2. Luego ejecuta:

```bash
npx expo start --clear --tunnel
```

**¿Por qué `--tunnel`?** Crea una URL pública (via ngrok) que el teléfono puede alcanzar aunque el firewall de Windows bloquee el puerto 8081 en la red local. El QR cambia a una URL `exp.direct://...` que funciona sobre internet.

> **Alternativa (sin tunnel):** Abre el puerto 8081 en el Firewall de Windows:
>
> ```powershell
> netsh advfirewall firewall add rule name="Expo Metro" dir=in action=allow protocol=TCP localport=8081
> ```
>
> Luego `npx expo start --clear` normalmente.

Con el LokiJS fallback que implementamos, la app ya funciona aunque no tengas el dev client con SQLite nativo instalado. Tus datos estarán en memoria mientras desarrollas.
