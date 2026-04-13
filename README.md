# Automatic Parking Booker

Automatización de reserva de cochera por WhatsApp — **RD-001 v1.0**

Envía automáticamente el mensaje de reserva al canal de cocheras cada domingo a las 23:59 hs, espera la respuesta (hasta 10 horas), y te notifica el resultado en tu celular via push notification.

---

## Arquitectura

```
node-cron (domingo 23:59)
        │
        ▼
whatsapp-web.js ──► envía mensajes al canal de cocheras
        │
        ▼ (espera respuesta, máx. 10 hs)
     parser.js ──► detecta keywords de confirmación / negativa
        │
        ▼
    ntfy.sh ──► push notification al celular
```

**Stack:** Node.js · whatsapp-web.js · node-cron · ntfy.sh

---

## Setup

### 1. Requisitos

- Node.js >= 18
- Chromium instalado (para Puppeteer)
  - Ubuntu/Debian: `sudo apt install chromium-browser`
  - macOS: `brew install chromium`
  - Android (Termux): ver sección Termux más abajo

### 2. Instalación

```bash
git clone https://github.com/tomascaldera/automatic-parking-booker.git
cd automatic-parking-booker
npm install
```

### 3. Configuración

```bash
cp .env.example .env
# Editar .env con tus datos:
nano .env
```

Variables a completar:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `COCHERA_PHONE_NUMBER` | Número del canal de cocheras en formato WhatsApp | `5493512345678@c.us` |
| `NTFY_TOPIC` | Topic de ntfy para recibir notificaciones | `cochera-tomi` |

**Cómo obtener el número en formato WhatsApp:**
- País Argentina: `54`
- Sin el `+`, sin espacios
- Ejemplo `+54 9 351 123-4567` → `5493511234567@c.us`

### 4. Configurar notificaciones push (ntfy)

1. Instalar la app **ntfy** en tu Android ([Play Store](https://play.google.com/store/apps/details?id=io.heckel.ntfy))
2. Tocar **+** y suscribirse al topic que pusiste en `NTFY_TOPIC`
3. Las notificaciones llegarán como push nativas, sin necesidad de tener la app abierta

### 5. Vincular WhatsApp (una sola vez)

```bash
node src/index.js
```

La primera vez mostrará un **QR code** en la terminal. Escanearlo desde WhatsApp:
> **WhatsApp → Ajustes → Dispositivos vinculados → Vincular dispositivo**

La sesión queda guardada en `.wwebjs_auth/` — no necesitarás volver a escanear.

### 6. Mantener el proceso corriendo

Con PM2 (recomendado):

```bash
npm install -g pm2
pm2 start src/index.js --name cochera-bot
pm2 save
pm2 startup  # para que arranque automáticamente con el sistema
```

---

## Comandos útiles

```bash
# Iniciar en modo normal (espera el próximo domingo 23:59)
node src/index.js

# Test: disparar el flujo ahora mismo (sin esperar el cron)
node src/index.js --test-send

# Test del parser con casos reales del RD
node src/parser.js --test

# Test de notificaciones push
node src/notifier.js --test
```

---

## Flujo de mensajes (sección 10 del RD)

**Mensajes enviados:**
1. `Hola buenas noches`
2. `Te escribo para reservar cochera para el día Miércoles`

**Respuesta confirmada detecta:** `te dejo reservado` / `box [N]` / `piso 6`

**Respuesta negativa detecta:** `sin disponibilidad` / `no tengo cocheras disponibles` / `no contamos con lugar libre` / `lista de espera`

**Timeout:** 10 horas sin respuesta → notificación de acción manual requerida

---

## Android con Termux (sin servidor externo)

```bash
# En Termux
pkg update && pkg install nodejs chromium
git clone ...
cd automatic-parking-booker
npm install
# Configurar .env
node src/index.js
```

> Asegurarse de que la batería no se agote y que la app no sea matada por el sistema.
> Configurar en Ajustes → Batería → Optimización de batería → Termux → No optimizar.

---

## Estructura del proyecto

```
├── src/
│   ├── index.js      # Orquestador principal
│   ├── scheduler.js  # Cron job semanal (domingo 23:59)
│   ├── whatsapp.js   # Cliente WhatsApp Web (envío + escucha)
│   ├── parser.js     # Interpretación semántica de respuestas
│   ├── notifier.js   # Notificaciones push via ntfy.sh
│   └── logger.js     # Logger con timestamps y zona horaria AR
├── config.js         # Configuración centralizada
├── .env.example      # Template de variables de entorno
└── package.json
```

---

**RD-001 v1.0 · Tomi Caldera · Abril 2026**
