# 🏥 Clínica WhatsApp Bot — Guía de instalación

## ¿Cómo funciona?

```
Paciente escribe en WhatsApp
        ↓
   Twilio recibe el mensaje
        ↓
   Tu servidor (Railway) lo procesa
        ↓
   El bot genera la respuesta
        ↓
   Twilio la envía de vuelta al paciente
```

---

## PASO 1 — Crear cuenta en Twilio (gratis)

1. Entrá a **https://www.twilio.com/try-twilio** y registrate.
2. Confirmá tu email y tu número de celular.
3. En el panel, anotá dos datos que van a aparecer:
   - **Account SID** (empieza con `AC...`)
   - **Auth Token** (hacé clic en "Show" para verlo)

---

## PASO 2 — Activar el Sandbox de WhatsApp

1. En el menú izquierdo de Twilio, andá a:
   **Messaging → Try it out → Send a WhatsApp message**

2. Vas a ver instrucciones para unirte al sandbox. 
   Desde tu celular, mandá un WhatsApp al número que indica Twilio 
   (algo como `+1 415 523 8886`) con el código que te muestra 
   (ej: `join puppy-forest`).

3. ✅ Ya podés recibir y enviar mensajes de WhatsApp en modo prueba.

---

## PASO 3 — Subir el bot a Railway (gratis, sin experiencia técnica)

1. Creá cuenta en **https://railway.app** (podés entrar con GitHub).

2. Hacé clic en **"New Project" → "Deploy from GitHub repo"**
   - Si no tenés GitHub: usá **"Deploy from template" → Node.js**
   - Subí los archivos de esta carpeta.

3. En el panel de Railway, andá a **Variables** y agregá:
   ```
   TWILIO_ACCOUNT_SID    = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN     = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_WHATSAPP_FROM  = whatsapp:+14155238886
   PORT                  = 3000
   CLINIC_NAME           = Clínica Salud Vital
   CLINIC_PHONE          = +54 11 4500-1234
   CLINIC_ADDRESS        = Av. Corrientes 1500, Buenos Aires
   ```

4. Railway te va a dar una URL pública, algo como:
   `https://clinica-bot-production.up.railway.app`

---

## PASO 4 — Conectar Twilio con tu servidor

1. En Twilio, andá a:
   **Messaging → Settings → WhatsApp Sandbox Settings**

2. En el campo **"When a message comes in"**, pegá tu URL de Railway + `/webhook`:
   ```
   https://clinica-bot-production.up.railway.app/webhook
   ```
   Método: **HTTP POST**

3. Hacé clic en **Save**.

---

## PASO 5 — ¡Probar!

Desde tu celular (el que conectaste al sandbox en el Paso 2), 
mandá un mensaje de WhatsApp al número de Twilio.

Deberías recibir la respuesta del bot en segundos. ✅

---

## ¿Qué puede responder el bot?

| El paciente escribe... | El bot responde con... |
|---|---|
| "hola" | Saludo + menú de opciones |
| "1" o "turno" | Inicio del flujo de reserva |
| "2" o "horarios" | Horarios por día con estado actual |
| "3" o "especialidades" | Lista de especialidades |
| "4" o "dónde están" | Dirección y cómo llegar |
| "5" o "obras sociales" | Lista de coberturas |
| "6" o "guardia" | Info de emergencias |

### Flujo completo de reserva de turno:
```
Paciente: turno
  Bot: ¿Qué especialidad? (lista numerada)
Paciente: 1
  Bot: ¿Qué horario? (lista numerada)
Paciente: 3
  Bot: ¿Nombre completo?
Paciente: Juan Pérez
  Bot: Resumen + confirmación
Paciente: SI
  Bot: ¡Turno confirmado! 🎉
```

---

## Pasar de Sandbox a número real (cuando tengas pacientes reales)

1. En Twilio comprás un número de teléfono (~$1/mes).
2. Pedís habilitación de WhatsApp Business para ese número (Meta lo aprueba en 1-3 días).
3. Cambiás `TWILIO_WHATSAPP_FROM` en Railway por tu nuevo número.
4. ¡Listo! Cualquier persona puede escribirte sin pasos previos.

---

## Costos aproximados

| Servicio | Costo |
|---|---|
| Railway (hasta 500hs/mes) | **Gratis** |
| Twilio Sandbox | **Gratis** (solo para pruebas) |
| Twilio número real | ~$1 USD/mes |
| Mensajes enviados | ~$0.005 USD por mensaje |

Para una clínica mediana (~500 mensajes/mes) = **menos de $5 USD/mes** en total.

---

## ¿Necesitás ayuda?

📞 Documentación de Twilio WhatsApp: https://www.twilio.com/docs/whatsapp
🚂 Documentación de Railway: https://docs.railway.app
