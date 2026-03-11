// ─── DATOS DE LA CLÍNICA ──────────────────────────────────────────────────────
const CLINIC = {
  nombre:         process.env.CLINIC_NAME            || "Clínica Salud Vital",
  telefono:       process.env.CLINIC_PHONE           || "+54 11 4500-1234",
  direccion:      process.env.CLINIC_ADDRESS         || "Av. Corrientes 1500, Buenos Aires",
  notificaciones: process.env.CLINIC_NOTIFY_WHATSAPP || null,

  // Horarios de atención del BOT (hora inicio, hora fin en formato 24hs, zona Argentina GMT-3)
  // El bot solo responde consultas completas dentro de este rango.
  // Fuera de horario avisa que está cerrado.
  botHorarios: {
    lunes:      { abre: 8,  cierra: 20 },
    martes:     { abre: 8,  cierra: 20 },
    miércoles:  { abre: 8,  cierra: 20 },
    jueves:     { abre: 8,  cierra: 20 },
    viernes:    { abre: 8,  cierra: 18 },
    sábado:     { abre: 9,  cierra: 14 },
    domingo:    null, // cerrado
  },

  horarios: {
    lunes:      "08:00 – 20:00",
    martes:     "08:00 – 20:00",
    miércoles:  "08:00 – 20:00",
    jueves:     "08:00 – 20:00",
    viernes:    "08:00 – 18:00",
    sábado:     "09:00 – 14:00",
    domingo:    "Cerrado",
  },

  especialidades: [
    { id: 1, nombre: "Medicina General", emoji: "🩺" },
    { id: 2, nombre: "Cardiología",      emoji: "❤️" },
    { id: 3, nombre: "Pediatría",        emoji: "👶" },
    { id: 4, nombre: "Traumatología",    emoji: "🦴" },
    { id: 5, nombre: "Nutrición",        emoji: "🥗" },
    { id: 6, nombre: "Psicología",       emoji: "🧠" },
  ],

  medicos: [
    { nombre: "Dra. Martínez", esp: "Medicina General", turnos: ["09:00", "10:30", "12:00", "15:00", "16:30"] },
    { nombre: "Dr. Rodríguez", esp: "Cardiología",      turnos: ["08:00", "09:30", "11:00", "14:00", "15:30"] },
    { nombre: "Dra. López",    esp: "Pediatría",        turnos: ["10:00", "11:30", "16:00", "17:30"] },
    { nombre: "Dr. García",    esp: "Traumatología",    turnos: ["08:30", "10:00", "13:00", "15:30"] },
    { nombre: "Lic. Pérez",    esp: "Nutrición",        turnos: ["09:00", "10:30", "12:00", "17:00"] },
    { nombre: "Lic. Sánchez",  esp: "Psicología",       turnos: ["11:00", "13:00", "16:00", "18:00"] },
  ],
};

// ─── ESTADO DE SESIONES ───────────────────────────────────────────────────────
const sessions = new Map();

function getSession(phone) {
  if (!sessions.has(phone)) sessions.set(phone, { flow: null, step: null, data: {} });
  return sessions.get(phone);
}
function setSession(phone, update) {
  sessions.set(phone, { ...getSession(phone), ...update });
}
function clearSession(phone) {
  sessions.set(phone, { flow: null, step: null, data: {} });
}

// ─── HELPERS DE TIEMPO (zona Argentina GMT-3) ─────────────────────────────────
function getNowArgentina() {
  // Convierte la hora UTC actual a hora de Argentina (UTC-3)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + (-3) * 3600000);
}

function getDayName() {
  const days = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  return days[getNowArgentina().getDay()];
}

function getHour() {
  return getNowArgentina().getHours();
}

// Devuelve true si ahora mismo el bot está en horario de atención
function isBotOpen() {
  const dia    = getDayName();
  const hora   = getHour();
  const config = CLINIC.botHorarios[dia];
  if (!config) return false;
  return hora >= config.abre && hora < config.cierra;
}

// Próximo horario de apertura
function proximaApertura() {
  const dias = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  const hoy  = getNowArgentina().getDay();

  for (let i = 1; i <= 7; i++) {
    const idx  = (hoy + i) % 7;
    const dia  = dias[idx];
    const conf = CLINIC.botHorarios[dia];
    if (conf) {
      const nombre = dia.charAt(0).toUpperCase() + dia.slice(1);
      return `${nombre} a las ${conf.abre}:00 hs`;
    }
  }
  return "próximamente";
}

function getGreeting() {
  const h = getHour();
  if (h < 12) return "¡Buenos días! ☀️";
  if (h < 18) return "¡Buenas tardes! 🌤️";
  return "¡Buenas noches! 🌙";
}

function menuPrincipal() {
  return (
    `¿En qué puedo ayudarte? Elegí una opción:\n\n` +
    `1️⃣ Sacar turno\n` +
    `2️⃣ Ver horarios\n` +
    `3️⃣ Especialidades\n` +
    `4️⃣ Dónde estamos\n` +
    `5️⃣ Obras sociales\n` +
    `6️⃣ Guardia / Urgencias\n\n` +
    `_Respondé con el número o escribí tu consulta._`
  );
}

function horariosTexto() {
  const hoy = getDayName();
  const rows = Object.entries(CLINIC.horarios)
    .map(([d, h]) => {
      const esHoy = d === hoy;
      const dia   = d.charAt(0).toUpperCase() + d.slice(1);
      return `${esHoy ? "▶ *" : "   "}${dia}${esHoy ? "*" : ""}: ${h}${esHoy ? " ← hoy" : ""}`;
    }).join("\n");
  const estado = isBotOpen()
    ? `✅ Ahora estamos *abiertos*. (${CLINIC.horarios[hoy]})`
    : `❌ Hoy estamos *cerrados*.\n🚨 Guardia disponible 24hs.`;
  return `⏰ *Horarios de atención:*\n\n${rows}\n\n${estado}`;
}

// Mensaje que se envía fuera de horario
function mensajeFueraDeHorario() {
  const dia  = getDayName().charAt(0).toUpperCase() + getDayName().slice(1);
  const hora = getHour();
  const next = proximaApertura();

  return (
    `${getGreeting()}\n\n` +
    `Gracias por contactar a *${CLINIC.nombre}* 🏥\n\n` +
    `😴 En este momento estamos *fuera de horario de atención*.\n` +
    `_(${dia}, ${hora}:00 hs — Argentina)_\n\n` +
    `⏰ *Nuestros horarios:*\n` +
    `Lun–Jue: 08:00 – 20:00\n` +
    `Viernes: 08:00 – 18:00\n` +
    `Sábados: 09:00 – 14:00\n` +
    `Domingos: Cerrado\n\n` +
    `📅 Volvemos a atender el *${next}*.\n\n` +
    `🚨 Si es una *emergencia*, llamá al *107 (SAME)* o dirigite a nuestra guardia:\n` +
    `📍 ${CLINIC.direccion}\n` +
    `📞 ${CLINIC.telefono}`
  );
}

// ─── NOTIFICACIÓN A LA CLÍNICA ────────────────────────────────────────────────
async function notificarClinica(turno, pacientePhone) {
  if (!CLINIC.notificaciones) return;
  try {
    const twilio = require("twilio");
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const numeroPaciente = pacientePhone.replace("whatsapp:", "");
    const fecha = getNowArgentina().toLocaleDateString("es-AR", {
      weekday: "long", day: "numeric", month: "long",
    });
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to:   CLINIC.notificaciones,
      body:
        `🔔 *NUEVO TURNO CONFIRMADO*\n\n` +
        `📋 Nro: *#${turno.id}*\n` +
        `👤 *Paciente:* ${turno.paciente}\n` +
        `📱 *Teléfono:* ${numeroPaciente}\n` +
        `👨‍⚕️ *Médico:* ${turno.medico}\n` +
        `🏥 *Especialidad:* ${turno.especialidad}\n` +
        `📅 *Fecha:* ${fecha}\n` +
        `🕐 *Horario:* ${turno.hora} hs\n\n` +
        `_Turno registrado automáticamente por el bot._`,
    });
    console.log(`✅ Notificación enviada a la clínica`);
  } catch (err) {
    console.error("❌ Error al notificar a la clínica:", err.message);
  }
}

// ─── MOTOR DE RESPUESTAS ──────────────────────────────────────────────────────
function processMessage(phone, rawMsg) {
  const msg   = rawMsg.trim();
  const lower = msg.toLowerCase();
  const sess  = getSession(phone);

  // ── FUERA DE HORARIO ──────────────────────────────────────────────────────
  // Excepciones: si hay un flujo de turno activo o pregunta por emergencia/horario,
  // igual se responde aunque esté cerrado.
  if (!isBotOpen()) {
    // Flujo de turno activo: se cancela y avisa
    if (sess.flow === "turno") {
      clearSession(phone);
    }
    // Emergencia: siempre se responde
    if (/emergencia|urgencia|guardia|grave|dolor/.test(lower)) {
      return (
        `🚨 *EMERGENCIAS Y GUARDIA*\n\n` +
        `Llamá al *107 (SAME)* o dirigite a:\n` +
        `📍 ${CLINIC.direccion}\n` +
        `📞 ${CLINIC.telefono}\n` +
        `⚡ Guardia *24 horas*, los 365 días.`
      );
    }
    // Cualquier otro mensaje: aviso de horario cerrado
    return mensajeFueraDeHorario();
  }

  // ── EN HORARIO ────────────────────────────────────────────────────────────

  // Flujo de turno activo
  if (sess.flow === "turno") {
    return processTurnoFlow(phone, msg, lower, sess);
  }

  // Saludos / inicio
  if (/^(hola|buenas|buenos|hey|hi|inicio|menu|menú|start)/.test(lower)) {
    return (
      `${getGreeting()}\n\n` +
      `Bienvenido/a a *${CLINIC.nombre}* 🏥\n\n` +
      menuPrincipal()
    );
  }

  // Turno
  if (/^1$/.test(lower) || /\bturno\b|\bcita\b|\breserva\b|\bsacar\b|\bpedir\b|\bagendar\b/.test(lower)) {
    setSession(phone, { flow: "turno", step: "especialidad", data: {} });
    const lista = CLINIC.especialidades.map((e, i) => `${i + 1}. ${e.emoji} ${e.nombre}`).join("\n");
    return `📋 *Reserva de turno*\n\n¿Qué especialidad necesitás?\n\n${lista}\n\n_Respondé con el número._`;
  }

  // Horarios
  if (/^2$/.test(lower) || /horario|hora|cuando|abre|cierra|atiend/.test(lower)) {
    return horariosTexto();
  }

  // Especialidades
  if (/^3$/.test(lower) || /especialidad|médico|doctor|servicio/.test(lower)) {
    const lista = CLINIC.especialidades.map(e => `${e.emoji} ${e.nombre}`).join("\n");
    return `👨‍⚕️ *Nuestras especialidades:*\n\n${lista}\n\n_¿Querés sacar un turno? Respondé *turno*._`;
  }

  // Ubicación
  if (/^4$/.test(lower) || /dónde|donde|dirección|ubicaci|llegar/.test(lower)) {
    return (
      `📍 *¿Cómo llegar?*\n\n` +
      `${CLINIC.direccion}\n\n` +
      `🚇 Subte B – Est. Uruguay\n` +
      `🚌 Líneas: 12, 29, 70, 99\n` +
      `🅿️ Estacionamiento a 50m\n\n` +
      `📞 ${CLINIC.telefono}`
    );
  }

  // Obras sociales
  if (/^5$/.test(lower) || /obra social|prepaga|osde|pami|galeno|swiss|cobertura|ioma/.test(lower)) {
    return (
      `💳 *Obras sociales y prepagas:*\n\n` +
      `Trabajamos con más de *30 coberturas*:\n\n` +
      `• OSDE • Swiss Medical\n• Galeno • PAMI\n• Medifé • IOMA\n• Y muchas más...\n\n` +
      `Consultá tu cobertura al ${CLINIC.telefono}`
    );
  }

  // Guardia
  if (/^6$/.test(lower) || /emergencia|urgencia|guardia|grave|dolor/.test(lower)) {
    return (
      `🚨 *EMERGENCIAS Y GUARDIA*\n\n` +
      `Si es urgente llamá al *107 (SAME)*.\n\n` +
      `📍 ${CLINIC.direccion}\n` +
      `📞 ${CLINIC.telefono}\n` +
      `⚡ Guardia *24 horas*, los 365 días.`
    );
  }

  // Fallback
  return (
    `No entendí bien tu consulta 😅\n\n` +
    `📞 ${CLINIC.telefono}\n` +
    `📧 info@saludvital.com.ar\n\n` +
    menuPrincipal()
  );
}

// ─── FLUJO DE RESERVA DE TURNO ────────────────────────────────────────────────
function processTurnoFlow(phone, msg, lower, sess) {
  const { step, data } = sess;

  if (step === "especialidad") {
    const idx = parseInt(lower) - 1;
    const esp = CLINIC.especialidades[idx];
    if (!esp) {
      const lista = CLINIC.especialidades.map((e, i) => `${i + 1}. ${e.emoji} ${e.nombre}`).join("\n");
      return `Por favor elegí una opción del 1 al ${CLINIC.especialidades.length}:\n\n${lista}`;
    }
    const medico = CLINIC.medicos.find(m => m.esp === esp.nombre);
    setSession(phone, { flow: "turno", step: "horario", data: { esp, medico } });
    const horarios = medico.turnos.map((t, i) => `${i + 1}. 🕐 ${t} hs`).join("\n");
    return (
      `${esp.emoji} *${esp.nombre}*\n` +
      `Médico: *${medico.nombre}*\n\n` +
      `¿Qué horario preferís?\n\n${horarios}\n\n_Respondé con el número._`
    );
  }

  if (step === "horario") {
    const idx  = parseInt(lower) - 1;
    const hora = data.medico?.turnos[idx];
    if (!hora) {
      const horarios = data.medico.turnos.map((t, i) => `${i + 1}. 🕐 ${t} hs`).join("\n");
      return `Por favor elegí un horario:\n\n${horarios}`;
    }
    setSession(phone, { flow: "turno", step: "nombre", data: { ...data, hora } });
    return `Perfecto ✅\n\n¿Cuál es tu *nombre completo*?`;
  }

  if (step === "nombre") {
    const paciente = msg.trim();
    if (paciente.length < 3) return "Por favor ingresá tu nombre completo.";
    setSession(phone, { flow: "turno", step: "confirmar", data: { ...data, paciente } });
    const fechaHoy = getNowArgentina().toLocaleDateString("es-AR", {
      weekday: "long", day: "numeric", month: "long",
    });
    return (
      `📋 *Resumen del turno:*\n\n` +
      `👤 *Paciente:* ${paciente}\n` +
      `👨‍⚕️ *Médico:* ${data.medico.nombre}\n` +
      `🏥 *Especialidad:* ${data.esp.nombre}\n` +
      `📅 *Fecha:* ${fechaHoy}\n` +
      `🕐 *Horario:* ${data.hora} hs\n\n` +
      `¿Confirmás el turno?\n\n✅ Respondé *SI* para confirmar\n❌ Respondé *NO* para cancelar`
    );
  }

  if (step === "confirmar") {
    if (/^(si|sí|s|yes|ok|confirmar|confirmo)$/i.test(lower)) {
      const turnoId = Math.floor(Math.random() * 9000) + 1000;
      const turno = {
        id: turnoId, paciente: data.paciente,
        medico: data.medico.nombre, especialidad: data.esp.nombre, hora: data.hora,
      };
      clearSession(phone);
      notificarClinica(turno, phone);
      return (
        `🎉 *¡Turno confirmado!*\n\n` +
        `📋 *Número de turno: #${turnoId}*\n\n` +
        `👤 ${data.paciente}\n` +
        `👨‍⚕️ ${data.medico.nombre}\n` +
        `🏥 ${data.esp.nombre}\n` +
        `🕐 Hoy a las ${data.hora} hs\n` +
        `📍 ${CLINIC.direccion}\n\n` +
        `📌 _Presentate 10 minutos antes._\n` +
        `¡Hasta pronto! 😊`
      );
    }
    if (/^(no|n|cancelar|cancel)$/i.test(lower)) {
      clearSession(phone);
      return `Entendido, turno cancelado. ¿En qué más puedo ayudarte?\n\n${menuPrincipal()}`;
    }
    return `Por favor respondé *SI* para confirmar o *NO* para cancelar.`;
  }

  clearSession(phone);
  return processMessage(phone, msg);
}

module.exports = { processMessage };
