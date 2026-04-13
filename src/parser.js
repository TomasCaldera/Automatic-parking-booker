'use strict';

/**
 * parser.js
 * Interpreta la respuesta del canal de cocheras según los patrones
 * relevados en la sección 10 del RD-001.
 *
 * Retorna uno de tres estados:
 *  - 'CONFIRMED'    → cochera asignada
 *  - 'UNAVAILABLE'  → sin disponibilidad
 *  - 'UNKNOWN'      → no se pudo determinar (no coincidió ningún keyword)
 */

const { config } = require('../config');
const logger = require('./logger');

/**
 * Normaliza texto: minúsculas y sin tildes para comparación flexible.
 * Permite matchear "Cocheras" con "cocheras", "Miércoles" con "miercoles", etc.
 */
function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // elimina diacríticos
}

/**
 * Extrae el número de box de un mensaje confirmado.
 * Ejemplo: "Box 127, piso 6" → "127"
 */
function extractBoxNumber(text) {
  const match = text.match(/box\s+(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Analiza el texto de respuesta y determina el resultado.
 *
 * @param {string} text - Texto del mensaje recibido de cocheras
 * @returns {{ status: 'CONFIRMED'|'UNAVAILABLE'|'UNKNOWN', boxNumber: string|null, raw: string }}
 */
function parse(text) {
  const normalized = normalize(text);

  const positiveNormalized = config.parser.positiveKeywords.map(normalize);
  const negativeNormalized = config.parser.negativeKeywords.map(normalize);

  const isPositive = positiveNormalized.some((kw) => normalized.includes(kw));
  const isNegative = negativeNormalized.some((kw) => normalized.includes(kw));

  if (isPositive && !isNegative) {
    const boxNumber = extractBoxNumber(text);
    logger.info(`Parser → CONFIRMED. Box: ${boxNumber ?? 'no detectado'}`);
    return { status: 'CONFIRMED', boxNumber, raw: text };
  }

  if (isNegative) {
    logger.info('Parser → UNAVAILABLE');
    return { status: 'UNAVAILABLE', boxNumber: null, raw: text };
  }

  logger.warn(`Parser → UNKNOWN. Texto recibido: "${text}"`);
  return { status: 'UNKNOWN', boxNumber: null, raw: text };
}

module.exports = { parse };

// ─── Test rápido (node src/parser.js --test) ─────────────────────────────────
if (require.main === module && process.argv.includes('--test')) {
  const cases = [
    {
      input: 'Sí! Te dejo reservado para el día miércoles 08/04, en cochera frente a EPEC: Box 127, piso 6. Saludos! Franco',
      expected: 'CONFIRMED',
    },
    {
      input: 'Hola! Lo siento, estamos sin disponibilidad para ese día.',
      expected: 'UNAVAILABLE',
    },
    {
      input: 'Hola! No tengo Cocheras Disponibles para el miércoles, queda en lista de espera.',
      expected: 'UNAVAILABLE',
    },
    {
      input: 'Hola! No contamos con lugar libre para el miércoles. Lista de espera. Hector',
      expected: 'UNAVAILABLE',
    },
    {
      input: 'Hola buen día, ¿en qué te puedo ayudar?',
      expected: 'UNKNOWN',
    },
  ];

  console.log('\n=== Parser test ===\n');
  let passed = 0;
  for (const { input, expected } of cases) {
    const result = parse(input);
    const ok = result.status === expected;
    console.log(`${ok ? '✓' : '✗'} [${result.status}] ${input.slice(0, 60)}...`);
    if (result.boxNumber) console.log(`    Box detectado: ${result.boxNumber}`);
    if (ok) passed++;
  }
  console.log(`\n${passed}/${cases.length} tests pasados\n`);
  process.exit(passed === cases.length ? 0 : 1);
}
