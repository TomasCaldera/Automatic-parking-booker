'use strict';

/**
 * index.js — Orquestador principal
 *
 * Flujo completo (sección 3 del RD-001):
 *  1. Cron dispara el domingo 23:59 hs
 *  2. Envía mensajes de solicitud de cochera
 *  3. Notifica al usuario que la solicitud fue enviada
 *  4. Espera respuesta del canal (hasta 10 horas)
 *  5. Parsea la respuesta y notifica al usuario con el resultado
 *
 * Modos de ejecución:
 *  - node src/index.js            → modo normal (cron activo, espera el domingo)
 *  - node src/index.js --test-send → dispara el flujo inmediatamente (para testear)
 */

const { validate } = require('../config');
const logger = require('./logger');
const notifier = require('./notifier');
const { initClient, sendBookingRequest, waitForResponse, destroyClient } = require('./whatsapp');
const { registerWeeklyJob } = require('./scheduler');

// ─── Flujo principal de reserva ───────────────────────────────────────────────

async function runBookingFlow() {
  try {
    // Paso 2: Enviar mensajes al canal de cocheras (RF-02)
    logger.info('Enviando solicitud de reserva...');
    await sendBookingRequest();

    // Paso 3: Notificar al usuario que el mensaje fue enviado (RF-05/06 - feedback inicial)
    await notifier.notifyStarted();

    // Paso 4: Escuchar respuesta del canal (RF-03 — timeout 10 horas)
    logger.info('Esperando respuesta del canal de cocheras (máx. 10 hs)...');
    const result = await waitForResponse();

    // Paso 5: Interpretar y notificar al usuario (RF-04, RF-05, RF-06, RF-07)
    switch (result.status) {
      case 'CONFIRMED':
        logger.info(`Cochera confirmada. Box: ${result.boxNumber}`);
        await notifier.notifyConfirmed(result.boxNumber);
        break;

      case 'UNAVAILABLE':
        logger.info('Sin disponibilidad para esta semana.');
        await notifier.notifyUnavailable();
        break;

      case 'TIMEOUT':
        logger.warn('Sin respuesta en 10 horas — notificando al usuario para acción manual.');
        await notifier.notifyTimeout();
        break;

      default:
        logger.warn(`Estado inesperado: ${result.status}`);
        await notifier.notifyError(`Estado inesperado: ${result.status}`);
    }
  } catch (err) {
    logger.error(`Error en el flujo de reserva: ${err.message}`);
    await notifier.notifyError(err.message);
    throw err;
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function main() {
  // Validar configuración antes de arrancar
  try {
    validate();
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }

  logger.info('Iniciando Automatic Parking Booker...');

  // Inicializar cliente WhatsApp (una sola vez al arrancar)
  // La primera vez mostrará el QR para vincular el dispositivo
  try {
    await initClient();
  } catch (err) {
    logger.error(`No se pudo inicializar WhatsApp: ${err.message}`);
    await notifier.notifyError(`Fallo al iniciar WhatsApp: ${err.message}`);
    process.exit(1);
  }

  // ── Modo test: ejecutar flujo inmediatamente y salir ──────────────────────
  if (process.argv.includes('--test-send')) {
    logger.info('Modo --test-send: ejecutando flujo ahora mismo...');
    await runBookingFlow();
    await destroyClient();
    process.exit(0);
  }

  // ── Modo normal: registrar cron semanal ───────────────────────────────────
  registerWeeklyJob(runBookingFlow);
  logger.info('Sistema activo. Esperando el próximo domingo 23:59 hs...');

  // Manejar señales de cierre para apagar limpiamente
  async function shutdown(signal) {
    logger.info(`Señal ${signal} recibida — cerrando...`);
    await destroyClient();
    process.exit(0);
  }

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
