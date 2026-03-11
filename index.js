require("dotenv").config();

const express = require("express");
const twilio  = require("twilio");
const { processMessage } = require("./bot");

const app  = express();
const port = process.env.PORT || 3000;

// Twilio envía datos como form-urlencoded
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Clínica WhatsApp Bot",
    timestamp: new Date().toISOString(),
  });
});

// ─── WEBHOOK DE TWILIO ────────────────────────────────────────────────────────
// Este endpoint recibe los mensajes entrantes de WhatsApp
app.post("/webhook", (req, res) => {
  const from = req.body.From;   // Ej: "whatsapp:+5491155554444"
  const body = req.body.Body;   // Texto del mensaje

  console.log(`📩 Mensaje de ${from}: "${body}"`);

  // Procesamos el mensaje con nuestro motor de respuestas
  const reply = processMessage(from, body || "hola");

  console.log(`📤 Respuesta: "${reply.substring(0, 80)}..."`);

  // Respondemos con TwiML (formato que Twilio espera)
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);

  res.type("text/xml").send(twiml.toString());
});

// ─── WEBHOOK DE ESTADO (opcional, para ver entrega de mensajes) ───────────────
app.post("/status", (req, res) => {
  const { MessageSid, MessageStatus, To } = req.body;
  console.log(`📊 Estado del mensaje ${MessageSid} para ${To}: ${MessageStatus}`);
  res.sendStatus(200);
});

// ─── INICIO ───────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log("─────────────────────────────────────────────");
  console.log(`🏥  Clínica WhatsApp Bot corriendo en puerto ${port}`);
  console.log(`🔗  Webhook URL: http://localhost:${port}/webhook`);
  console.log("─────────────────────────────────────────────");
});
