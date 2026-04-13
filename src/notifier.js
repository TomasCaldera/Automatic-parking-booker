'use strict';

/**
 * notifier.js
 * Envía notificaciones push al celular del usuario mediante ntfy.sh.
 *
 * Setup en Android:
 *  1. Instalar la app "ntfy" desde Play Store
 *  2. Suscribirse al topic configurado en NTFY_TOPIC
 *  3. ¡Listo! Las notificaciones llegan como push nativas.
 *
 * Documentación: https://ntfy.sh/docs/
 */

const axios = require('axios');
const { config } = require('../config');
const logger = require('./logger');

const NTFY_URL = `${config.notifier.ntfyBaseUrl}/${config.notifier.ntfyTopic}`;

/**
 * Envía una notificación push.
 *
 * @param {object} options
 * @param {string} options.title   - Título de la notificación
 * @param {string} options.message - Cuerpo del mensaje
 * @param {string} [options.priority] - 'min'|'low'|'default'|'high'|'urgent'
 * @param {string} [options.tags]     - Tags de emoji: 'white_check_mark,car'
 */
async function send({ title, message, priority = 'default', tags = '' }) {
  try {
    await axios.post(NTFY_URL, message, {
      headers: {
        Title:    title,
        Priority: priority,
        Tags:     tags,
        'Content-Type': 'text/plain',
      },
      timeout: 10_000,
    });
    logger.info(`Notificación enviada → "${title}"`);
  } catch (err) {
    logger.error(`Error al enviar notificación: ${err.message}`);
    // No relanzamos — la notificación fallida no debe cortar el flujo principal
  }
}

// ─── Notificaciones predefinidas según estado ─────────────────────────────────

async function notifyConfirmed(boxNumber) {
  const boxText = boxNumber ? ` — Box ${boxNumber}, piso 6` : '';
  await send({
    title:    'Cochera confirmada para el miercoles',
    message:  `Tu cochera fue reservada exitosamente${boxText}. No necesitas hacer nada.`,
    priority: 'high',
    tags:     'white_check_mark,car',
  });
}

async function notifyUnavailable() {
  await send({
    title:    'Sin cochera para el miercoles',
    message:  'No hay disponibilidad esta semana. Planifica transporte alternativo.',
    priority: 'default',
    tags:     'x,car',
  });
}

async function notifyTimeout() {
  await send({
    title:    'Cochera: sin respuesta — accion manual requerida',
    message:  'Pasaron 10 horas sin respuesta del canal de cocheras. Revisa WhatsApp y gestiona manualmente.',
    priority: 'urgent',
    tags:     'warning,car',
  });
}

async function notifyError(errorMessage) {
  await send({
    title:    'Error en automatizacion de cochera',
    message:  `El sistema encontro un error: ${errorMessage}`,
    priority: 'urgent',
    tags:     'rotating_light',
  });
}

async function notifyStarted() {
  await send({
    title:    'Cochera: solicitud enviada',
    message:  'Mensaje enviado al canal de cocheras. Esperando respuesta (hasta 10 hs).',
    priority: 'low',
    tags:     'hourglass_flowing_sand,car',
  });
}

module.exports = {
  send,
  notifyConfirmed,
  notifyUnavailable,
  notifyTimeout,
  notifyError,
  notifyStarted,
};

// ─── Test (node src/notifier.js --test) ──────────────────────────────────────
if (require.main === module && process.argv.includes('--test')) {
  (async () => {
    console.log('Enviando notificación de prueba a ntfy...');
    await send({
      title:   'Test — Automatizacion Cochera',
      message: 'Si ves esto, las notificaciones funcionan correctamente.',
      priority: 'default',
      tags:    'white_check_mark',
    });
    console.log('Listo. Revisa la app ntfy en tu celular.');
  })();
}
