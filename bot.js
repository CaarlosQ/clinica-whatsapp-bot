// ─── DATOS DE LA CLÍNICA ──────────────────────────────────────────────────────
const CLINIC = {
  nombre:    process.env.CLINIC_NAME    || "Clínica Salud Vital",
  telefono:  process.env.CLINIC_PHONE   || "+54 11 4500-1234",
  direccion: process.env.CLINIC_ADDRESS || "Av. Corrientes 1500, Buenos Aires",

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

// ─── ESTADO DE SESIONES (en memoria, una por número de teléfono) ───────────────
// En producción reemplazá esto con Redis o una base de datos
const sessions = new Map();

function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, { flow: null, step: null, data: {} });
  }
  return sessions.get(phone);
}

function setSession(phone, update) {
  const current = getSession(phone);
  sessions.set(phone, { ...current, ...update });
}

function clearSession(phone) {
  sessions.set(phone, { flow: null, step: null, data: {} });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getDayName() {
  const days = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  return days[new Date().getDay()];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "¡Buenos días! ☀️";
  if (h < 18) return "¡Buenas tardes! 🌤️";
  return "¡Buenas noches! 🌙";
}

function isOpen() {
  return CLINIC.horarios[getDayName()] !== "Cerrado";
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
      const dia = d.charAt(0).toUpperCase() + d.slice(1);
      return `${esHoy ? "▶ *" : "   "}${dia}${esHoy ? "*" : ""}: ${h}${esHoy ? " ← hoy" : ""}`;
    })
    .join("\n");

  const estado = isOpen()
    ? `✅ Ahora estamos *abiertos*. (${CLINIC.horarios[hoy]})`
    : `❌ Hoy estamos *cerrados*.\n🚨 Guardia disponible 24hs.`;

  return `⏰ *Horarios de atención:*\n\n${rows}\n\n${estado}`;
}

// ─── MOTOR DE RESPUESTAS ──────────────────────────────────────────────────────
function processMessage(phone, rawMsg) {
  const msg   = rawMsg.trim();
  const lower = msg.toLowerCase();
  const sess  = getSession(phone);

  // ── Flujo de turno activo ──────────────────────────────────────────────────
  if (sess.flow === "turno") {
    return processTurnoFlow(phone, msg, lower, sess);
  }

  // ── Detección de intención ─────────────────────────────────────────────────

  // Saludos / inicio
  if (/^(hola|buenas|buenos|hey|hi|inicio|menu|menú|1|start)/.test(lower) || lower.length <= 3) {
    return (
      `${getGreeting()}\n\n` +
      `Bienvenido/a a *${CLINIC.nombre}* 🏥\n\n` +
      menuPrincipal()
    );
  }

  // Turno (opción 1 o palabras clave)
  if (/^1$/.test(lower) || /turno|cita|reserva|sacar|pedir|agendar/.test(lower)) {
    setSession(phone, { flow: "turno", step: "especialidad", data: {} });
    const lista = CLINIC.especialidades
      .map((e, i) => `${i + 1}. ${e.emoji} ${e.nombre}`)
      .join("\n");
    return `📋 *Reserva de turno*\n\n¿Qué especialidad necesitás?\n\n${lista}\n\n_Respondé con el número._`;
  }

  // Horarios (opción 2)
  if (/^2$/.test(lower) || /horario|hora|cuando|abre|cierra|atiend/.test(lower)) {
    return horariosTexto();
  }

  // Especialidades (opción 3)
  if (/^3$/.test(lower) || /especialidad|médico|doctor|servicio/.test(lower)) {
    const lista = CLINIC.especialidades.map(e => `${e.emoji} ${e.nombre}`).join("\n");
    return `👨‍⚕️ *Nuestras especialidades:*\n\n${lista}\n\n_¿Querés sacar un turno? Respondé *turno*._`;
  }

  // Ubicación (opción 4)
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

  // Obras sociales (opción 5)
  if (/^5$/.test(lower) || /obra social|prepaga|osde|pami|galeno|swiss|cobertura|ioma/.test(lower)) {
    return (
      `💳 *Obras sociales y prepagas:*\n\n` +
      `Trabajamos con más de *30 coberturas*, incluyendo:\n\n` +
      `• OSDE\n• Swiss Medical\n• Galeno\n• PAMI\n• Medifé\n• IOMA\n• Y muchas más...\n\n` +
      `Consultá tu cobertura al ${CLINIC.telefono}`
    );
  }

  // Guardia (opción 6)
  if (/^6$/.test(lower) || /emergencia|urgencia|guardia|grave|dolor/.test(lower)) {
    return (
      `🚨 *EMERGENCIAS Y GUARDIA*\n\n` +
      `Si es una urgencia inmediata, llamá al *107 (SAME)*.\n\n` +
      `Nuestra guardia médica:\n` +
      `📍 ${CLINIC.direccion}\n` +
      `📞 Guardia directa: ${CLINIC.telefono}\n` +
      `⚡ Atención *24 horas*, los 365 días del año.`
    );
  }

  // Fallback
  return (
    `No entendí bien tu consulta 😅\n\n` +
    `Podés contactarnos directamente:\n` +
    `📞 ${CLINIC.telefono}\n` +
    `📧 info@saludvital.com.ar\n\n` +
    menuPrincipal()
  );
}

// ─── FLUJO DE RESERVA DE TURNO ────────────────────────────────────────────────
function processTurnoFlow(phone, msg, lower, sess) {
  const { step, data } = sess;

  // PASO 1: Elegir especialidad
  if (step === "especialidad") {
    const idx = parseInt(lower) - 1;
    const esp = CLINIC.especialidades[idx];

    if (!esp) {
      const lista = CLINIC.especialidades
        .map((e, i) => `${i + 1}. ${e.emoji} ${e.nombre}`)
        .join("\n");
      return `Por favor elegí una opción del 1 al ${CLINIC.especialidades.length}:\n\n${lista}`;
    }

    const medico = CLINIC.medicos.find(m => m.esp === esp.nombre);
    setSession(phone, { flow: "turno", step: "horario", data: { esp, medico } });

    const horarios = medico.turnos
      .map((t, i) => `${i + 1}. 🕐 ${t} hs`)
      .join("\n");

    return (
      `${esp.emoji} *${esp.nombre}*\n` +
      `Médico: *${medico.nombre}*\n\n` +
      `¿Qué horario preferís para hoy?\n\n${horarios}\n\n` +
      `_Respondé con el número._`
    );
  }

  // PASO 2: Elegir horario
  if (step === "horario") {
    const idx  = parseInt(lower) - 1;
    const hora = data.medico?.turnos[idx];

    if (!hora) {
      const horarios = data.medico.turnos
        .map((t, i) => `${i + 1}. 🕐 ${t} hs`)
        .join("\n");
      return `Por favor elegí un horario:\n\n${horarios}`;
    }

    setSession(phone, { flow: "turno", step: "nombre", data: { ...data, hora } });
    return `Perfecto ✅\n\n¿Cuál es tu *nombre completo*?`;
  }

  // PASO 3: Nombre del paciente
  if (step === "nombre") {
    const paciente = msg.trim();
    if (paciente.length < 3) return "Por favor ingresá tu nombre completo.";

    setSession(phone, { flow: "turno", step: "confirmar", data: { ...data, paciente } });

    const fechaHoy = new Date().toLocaleDateString("es-AR", {
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

  // PASO 4: Confirmar
  if (step === "confirmar") {
    if (/^(si|sí|s|yes|ok|confirmar|confirmo)$/i.test(lower)) {
      const turnoId = Math.floor(Math.random() * 9000) + 1000;
      clearSession(phone);

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

  // Si el flujo está roto, resetear
  clearSession(phone);
  return processMessage(phone, msg);
}

module.exports = { processMessage };
