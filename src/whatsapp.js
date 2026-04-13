'use strict';

/**
 * whatsapp.js
 * Maneja toda la interacción con WhatsApp Web mediante whatsapp-web.js.
 *
 * Responsabilidades:
 *  - Inicializar el cliente y autenticar via QR (una sola vez; sesión persistida)
 *  - Enviar los mensajes de solicitud de cochera
 *  - Escuchar mensajes entrantes del canal de cocheras
 *  - Manejar timeout si no llega respuesta en el tiempo configurado
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { config } = require('../config');
const logger = require('./logger');
const { parse } = require('./parser');

let client = null;

/**
 * Inicializa el cliente de WhatsApp Web.
 * La primera vez muestra un QR code en la terminal.
 * Las veces siguientes usa la sesión guardada en disco.
 *
 * @returns {Promise<void>} Resuelve cuando el cliente está listo para usar.
 */
function initClient() {
  return new Promise((resolve, reject) => {
    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: config.whatsapp.sessionPath,
      }),
      puppeteer: {
        // Necesario en entornos sin pantalla (servidor, Termux)
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      },
    });

    client.on('qr', (qr) => {
      logger.info('Escanea el QR con WhatsApp (Ajustes → Dispositivos vinculados):');
      qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', () => {
      logger.info('WhatsApp autenticado correctamente.');
    });

    client.on('ready', () => {
      logger.info('Cliente WhatsApp listo.');
      resolve();
    });

    client.on('auth_failure', (msg) => {
      logger.error(`Fallo de autenticación: ${msg}`);
      reject(new Error(`WhatsApp auth failure: ${msg}`));
    });

    client.on('disconnected', (reason) => {
      logger.warn(`WhatsApp desconectado: ${reason}`);
    });

    client.initialize();
  });
}

/**
 * Envía los mensajes de solicitud de cochera al número configurado.
 * Espera 2 segundos entre mensajes para imitar comportamiento humano.
 */
async function sendBookingRequest() {
  const { targetNumber, messages } = config.whatsapp;

  for (const msg of messages) {
    await client.sendMessage(targetNumber, msg);
    logger.info(`Mensaje enviado → "${msg}"`);
    await delay(2000);
  }
}

/**
 * Escucha respuestas del canal de cocheras.
 *
 * @returns {Promise<{status, boxNumber, raw}>}
 *   Resuelve con el resultado parseado de la primera respuesta relevante,
 *   o con { status: 'TIMEOUT' } si vence el tiempo máximo.
 */
function waitForResponse() {
  return new Promise((resolve) => {
    const { targetNumber, responseTimeoutMs } = config.whatsapp;

    const timeoutHandle = setTimeout(() => {
      logger.warn('Timeout alcanzado — sin respuesta del canal de cocheras.');
      client.removeAllListeners('message');
      resolve({ status: 'TIMEOUT', boxNumber: null, raw: null });
    }, responseTimeoutMs);

    client.on('message', async (message) => {
      // Solo nos interesan mensajes del número de cocheras
      if (message.from !== targetNumber) return;

      const text = message.body;
      logger.info(`Mensaje recibido de cocheras: "${text}"`);

      const result = parse(text);

      // Ignorar mensajes que no se puedan clasificar (ej: acuse de recibo, "Hola!")
      if (result.status === 'UNKNOWN') {
        logger.debug('Mensaje no clasificable, seguimos esperando...');
        return;
      }

      clearTimeout(timeoutHandle);
      client.removeAllListeners('message');
      resolve(result);
    });
  });
}

/**
 * Cierra el cliente de WhatsApp de forma segura.
 */
async function destroyClient() {
  if (client) {
    await client.destroy();
    client = null;
    logger.info('Cliente WhatsApp cerrado.');
  }
}

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

module.exports = { initClient, sendBookingRequest, waitForResponse, destroyClient };
