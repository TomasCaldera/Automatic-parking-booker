'use strict';

/**
 * scheduler.js
 * Configura el cron job semanal que dispara la reserva de cochera.
 *
 * Trigger: todos los domingos a las 23:59 hs (hora Argentina) — RF-01
 * Esto cubre la ventana de 48 hs antes del miércoles.
 */

const cron = require('node-cron');
const { config } = require('../config');
const logger = require('./logger');

/**
 * Registra el cron job semanal.
 *
 * @param {Function} jobFn - Función async que ejecuta el flujo completo de reserva.
 *                           Debe manejar sus propios errores internamente.
 */
function registerWeeklyJob(jobFn) {
  const { cronExpression, timezone } = config.scheduler;

  const task = cron.schedule(
    cronExpression,
    async () => {
      logger.info('=== Cron disparado: iniciando flujo de reserva de cochera ===');
      try {
        await jobFn();
      } catch (err) {
        logger.error(`Error no controlado en el job: ${err.message}`);
      }
    },
    {
      scheduled: true,
      timezone,
    }
  );

  logger.info(
    `Job semanal registrado [${cronExpression}] — ` +
    `próxima ejecución: domingos 23:59 hs (${timezone})`
  );

  return task;
}

module.exports = { registerWeeklyJob };
