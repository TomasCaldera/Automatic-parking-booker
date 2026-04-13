'use strict';

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

function timestamp() {
  return new Date().toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Cordoba',
    hour12: false,
  });
}

function log(level, ...args) {
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;
  const prefix = `[${timestamp()}] [${level}]`;
  if (level === 'ERROR') {
    console.error(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

const logger = {
  debug: (...args) => log('DEBUG', ...args),
  info:  (...args) => log('INFO',  ...args),
  warn:  (...args) => log('WARN',  ...args),
  error: (...args) => log('ERROR', ...args),
};

module.exports = logger;
