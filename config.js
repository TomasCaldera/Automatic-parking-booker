require('dotenv').config();

const config = {
  // ─── WhatsApp ────────────────────────────────────────────────────────────────
  whatsapp: {
    // Número del canal de cocheras en formato internacional sin '+' ni espacios
    // Ejemplo: '5493512345678@c.us'  (código país 54 + código área + número)
    targetNumber: process.env.COCHERA_PHONE_NUMBER || '',

    // Directorio donde se guarda la sesión de WhatsApp Web (evita re-escanear QR)
    sessionPath: './.wwebjs_auth',

    // Mensajes a enviar (en ese orden)
    messages: [
      'Hola buenas noches',
      'Te escribo para reservar cochera para el día Miércoles',
    ],

    // Tiempo máximo de espera de respuesta: 10 horas en milisegundos (RF-07)
    responseTimeoutMs: 10 * 60 * 60 * 1000,
  },

  // ─── Scheduler ───────────────────────────────────────────────────────────────
  scheduler: {
    // Cron expression: 23:59 todos los domingos (RF-01)
    // Formato: segundo minuto hora díaMes mes díaSemana
    // 0 = domingo en node-cron
    cronExpression: '0 59 23 * * 0',

    // Zona horaria (Argentina, UTC-3)
    timezone: 'America/Argentina/Cordoba',
  },

  // ─── Notificaciones push (ntfy.sh) ───────────────────────────────────────────
  notifier: {
    // Topic de ntfy — debe coincidir con el suscripto en la app ntfy de Android
    // Instrucciones: instalar app ntfy en Android, suscribirse a este topic
    ntfyTopic: process.env.NTFY_TOPIC || 'cochera-tomi',

    // URL base de ntfy (puede ser instancia propia o la pública)
    ntfyBaseUrl: process.env.NTFY_BASE_URL || 'https://ntfy.sh',
  },

  // ─── Parsing de respuestas (sección 10 del RD) ───────────────────────────────
  parser: {
    // Keywords que indican cochera ASIGNADA (cualquiera = positivo)
    positiveKeywords: [
      'te dejo reservado',
      'box',
      'piso 6',
    ],

    // Keywords que indican SIN DISPONIBILIDAD (cualquiera = negativo)
    negativeKeywords: [
      'sin disponibilidad',
      'no tengo cocheras disponibles',
      'no contamos con lugar libre',
      'lista de espera',
      'no tengo cocheras',
      'no contamos con lugar',
    ],
  },
};

// Validar configuración mínima al iniciar
function validate() {
  if (!config.whatsapp.targetNumber) {
    throw new Error(
      'COCHERA_PHONE_NUMBER no está configurado. ' +
      'Copia .env.example a .env y completá el número.'
    );
  }
  if (!config.notifier.ntfyTopic) {
    throw new Error('NTFY_TOPIC no está configurado.');
  }
}

module.exports = { config, validate };
