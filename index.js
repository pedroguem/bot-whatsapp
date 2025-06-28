const venom = require('venom-bot');
const fs = require('fs');

let citas = [];
try {
  citas = JSON.parse(fs.readFileSync('./citas.json', 'utf8'));
} catch (error) {
  citas = [];
  fs.writeFileSync('./citas.json', JSON.stringify(citas, null, 2));
}

const estadoConversacion = {};
const recordatorios = {};

function guardarCitas() {
  fs.writeFileSync('./citas.json', JSON.stringify(citas, null, 2));
}

function programarRecordatorioPendiente(from) {
  if (recordatorios[from]) clearTimeout(recordatorios[from]);
  recordatorios[from] = setTimeout(() => {
    const estado = estadoConversacion[from];
    if (estado && ['esperando_promocion', 'esperando_dia', 'esperando_fecha', 'esperando_hora', 'esperando_nombre'].includes(estado.paso)) {
      client.sendText(from, '🔔 *¿Aún deseas continuar con tu cita?*\nResponde para completar el proceso y asegurar tu atención.');
    }
  }, 20 * 60 * 1000);
}

function programarRecordatorioCita(from, fechaCita, nombre, hora, servicio) {
  const unaHoraAntes = new Date(fechaCita.getTime() - 60 * 60 * 1000);
  const tiempo = unaHoraAntes.getTime() - Date.now();
  if (tiempo > 0) {
    setTimeout(() => {
      client.sendText(from,
        `🔔 *Recordatorio de cita*\n\nHola ${nombre},\nTe recordamos tu cita de *${servicio}* programada para las *${hora}*.\n\nSi necesitas *reprogramar* tu cita, responde con la palabra *reprogramar* antes de tu cita.`
      );
    }, tiempo);
  }
}

let client;

venom.create({
  session: 'bot-whatsapp',
  multidevice: true,
  headless: true,
  browserArgs: ['--no-sandbox', '--disable-setuid-sandbox']
}).then((cl) => {
  client = cl;
  console.log('✅ Bot iniciado. Esperando mensajes...');

  client.onMessage(async (message) => {
    if (!message || !message.body || !message.from) return;

    const msg = message.body.trim().toLowerCase();
    const from = message.from;

    const comandosIniciales = [
  'hola',
  'precios',
  'consulta',
  'información',
  'quiero información',
  'quiero agendar',
  'quiero reservar',
  'nueva cita',
  'quiero una cita',
  'hola, quiero información',
  '¡hola! quiero reservar mi cita con la campaña s/50 de consulta + electrocardiograma 🩺✨',
  'hola, quiero reservar mi cita con la campaña de 50 soles',
  'hola, me interesa la campaña de consulta y electrocardiograma',
  '¡hola! podrías darme más información de...',
  '¡hola! podrías darme más información de'
];


    // ---- RESPUESTA AL "NO" EN CAMPAÑA (segunda vez) ----
    if (
      estadoConversacion[from] &&
      estadoConversacion[from].paso === 'esperando_promocion' &&
      estadoConversacion[from].segundaVez &&
      (msg === 'no' || msg === 'no gracias')
    ) {
      delete estadoConversacion[from];
      await client.sendText(from, '👌 Entendido. Si deseas reservar tu cita más adelante, solo escríbenos. ¡Que tengas un excelente día! 💙');
      return;
    }

    // ---- RESPUESTA AL "SÍ" DESDE LA PROMOCIÓN (en cualquier vuelta) ----
    if (
      estadoConversacion[from] &&
      estadoConversacion[from].paso === 'esperando_promocion' &&
      (msg === 'sí' || msg === 'si')
    ) {
      estadoConversacion[from] = { paso: 'esperando_dia' };
      await client.sendText(from,
        '📅 *Nuestros horarios de julio son:*\n\n' +
        '🗓 Lunes (7)\n 👩‍⚕️ Dra. Sanchez – 08:00 a 11:00\n\n' +
        '🗓 Lunes (14)\n 👩‍⚕️ Dra. Medina – 10:00 a 13:00\n\n' +
        '🗓 Lunes (21)\n 👩‍⚕️ Dra. Pazzara – 09:00 a 12:00\n\n' +
        '🗓 Martes (1, 8, 15)\n 👩‍⚕️ Dra. Pazzara – 09:00 a 12:00\n\n' +
        '🗓 Miércoles (2, 9, 16, 23, 30)\n 👩‍⚕️ Dra. Sánchez – 08:00 a 11:00\n\n' +
        '🗓 Jueves (3, 10, 17, 24, 31)\n 👩‍⚕️ Dra. Pinillos – 09:00 a 12:00\n\n' +
        '🗓 Viernes (4)\n 👩‍⚕️ Dra. Medina – 10:00 a 13:00\n' +
        '🗓 Viernes (25)\n 👩‍⚕️ Dra. Pazzara – 09:00 a 12:00\n\n' +
        '✏️ *Escribe el día que prefieres tu cita (ejemplo: martes, miércoles)*'
      );
      programarRecordatorioPendiente(from);
      return;
    }

    // ----- BIENVENIDA Y CAMPAÑA -----
    if (comandosIniciales.includes(msg) || msg === 'campaña') {
      estadoConversacion[from] = { paso: 'esperando_promocion', segundaVez: msg === 'campaña' };
      await client.sendText(from,
        '🌟 *¡ATENCIÓN! Oportunidad única solo este mes* 🌟\n\n' +
        '💥 *CAMPAÑA EXCLUSIVA S/ 50* 💥\nIncluye: *Consulta médica personalizada + Electrocardiograma + Glucosa capilar*\n👨‍⚕️🩺🧪 ¡Ahorra más del 40% en una sola visita!\n\n' +
        '¿Te gustaría separar tu cupo?\nResponde *Sí* para reservar, o *Lista* para descubrir todos los servicios y precios.' +
        (msg === 'campaña' ? '\nO responde *No* si deseas reservar más adelante.' : '') +
        '\n⚡️ *¡Los cupos son LIMITADOS!* ⚡️'
      );
      programarRecordatorioPendiente(from);
      return;
    }

    // ----- LISTA DE PRECIOS -----
    if (msg === 'lista') {
      await client.sendText(from,
        '📋 *Lista de precios actualizada:*\n\n' +
        '1. 🩺 Consulta médica – S/ 29\n' +
        '2. 📉 Riesgo quirúrgico – S/ 52.5\n' +
        '3. 🛠 Interconsulta Salud Ocupacional – S/ 67\n' +
        '4. 📄 Informe médico – S/ 27.5\n' +
        '5. ❤️ MAPA – S/ 160\n' +
        '6. ❤️ Holter – S/ 160\n' +
        '7. 📊 Electrocardiograma – S/ 41\n' +
        '8. 🫀 Ecocardiograma – S/ 103\n\n' +
        'Escribe *campaña* para volver a conocer nuestra *promoción especial*.\n' +
        'O escribe *cita* para agendar tu *consulta médica*.'
      );
      return;
    }

    // ----- FLUJO CITA -----
    if (msg === 'cita') {
      estadoConversacion[from] = { paso: 'esperando_dia' };
      await client.sendText(from,
        '📅 *Nuestros horarios de julio son:*\n\n' +
        '🗓 Lunes (7)\n 👩‍⚕️ Dra. Sanchez – 08:00 a 11:00\n\n' +
        '🗓 Lunes (14)\n 👩‍⚕️ Dra. Medina – 10:00 a 13:00\n\n' +
        '🗓 Lunes (21)\n 👩‍⚕️ Dra. Pazzara – 09:00 a 12:00\n\n' +
        '🗓 Martes (1, 8, 15)\n 👩‍⚕️ Dra. Pazzara – 09:00 a 12:00\n\n' +
        '🗓 Miércoles (2, 9, 16, 23, 30)\n 👩‍⚕️ Dra. Sánchez – 08:00 a 11:00\n\n' +
        '🗓 Jueves (3, 10, 17, 24, 31)\n 👩‍⚕️ Dra. Pinillos – 09:00 a 12:00\n\n' +
        '🗓 Viernes (4)\n 👩‍⚕️ Dra. Medina – 10:00 a 13:00\n' +
        '🗓 Viernes (25)\n 👩‍⚕️ Dra. Pazzara – 09:00 a 12:00\n\n' +
        '✏️ *Escribe el día que prefieres tu cita (ejemplo: martes, miércoles)*'
      );
      programarRecordatorioPendiente(from);
      return;
    }

    // ----- Paso: Elige DÍA -----
    if (estadoConversacion[from] && estadoConversacion[from].paso === 'esperando_dia') {
      const diasDisponibles = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];
      const diaElegido = msg.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (!diasDisponibles.includes(diaElegido)) {
        await client.sendText(from, '❌ Día no válido. Escribe: lunes, martes, miércoles, jueves o viernes.');
        return;
      }
      // Define fechas válidas para cada día
      const fechasPorDia = {
        'lunes': ['7', '14', '21'],
        'martes': ['1', '8', '15'],
        'miércoles': ['2', '9', '16', '23', '30'],
        'jueves': ['3', '10', '17', '24', '31'],
        'viernes': ['4', '25']
      };
      estadoConversacion[from] = { paso: 'esperando_fecha', dia: diaElegido };
      await client.sendText(from, `🗓 ¿Qué fecha deseas para tu cita de *${capitalize(diaElegido)}*? Fechas disponibles: ${fechasPorDia[diaElegido].join(', ')} (solo número de día, ejemplo: 9)`);
      programarRecordatorioPendiente(from);
      return;
    }

    // ----- Paso: Elige FECHA -----
    if (estadoConversacion[from] && estadoConversacion[from].paso === 'esperando_fecha') {
      const { dia } = estadoConversacion[from];
      const fechasPorDia = {
        'lunes': ['7', '14', '21'],
        'martes': ['1', '8', '15'],
        'miércoles': ['2', '9', '16', '23', '30'],
        'jueves': ['3', '10', '17', '24', '31'],
        'viernes': ['4', '25']
      };
      if (!fechasPorDia[dia].includes(msg)) {
        await client.sendText(from, `❌ Fecha no válida para ${capitalize(dia)}. Elige entre: ${fechasPorDia[dia].join(', ')}.`);
        return;
      }

      estadoConversacion[from] = { paso: 'esperando_hora', dia, fecha: msg };

      // Horarios exactos por día y fecha
      let horarios = '';
      if (dia === 'lunes' && msg === '7') horarios = '08:00, 08:15, 08:30, 08:45, 09:00, 09:15, 09:30, 09:45, 10:00, 10:15, 10:30, 10:45, 11:00';
      else if (dia === 'lunes' && msg === '14') horarios = '10:00, 10:15, 10:30, 10:45, 11:00, 11:15, 11:30, 11:45, 12:00, 12:15, 12:30, 12:45, 13:00';
      else if (dia === 'lunes' && msg === '21') horarios = '09:00, 09:15, 09:30, 09:45, 10:00, 10:15, 10:30, 10:45, 11:00, 11:15, 11:30, 11:45, 12:00';
      else if (dia === 'martes' || dia === 'jueves' || (dia === 'viernes' && msg === '25')) horarios = '09:00, 09:15, 09:30, 09:45, 10:00, 10:15, 10:30, 10:45, 11:00, 11:15, 11:30, 11:45, 12:00';
      else if (dia === 'miércoles') horarios = '08:00, 08:15, 08:30, 08:45, 09:00, 09:15, 09:30, 09:45, 10:00, 10:15, 10:30, 10:45, 11:00';
      else if (dia === 'viernes' && msg === '4') horarios = '10:00, 10:15, 10:30, 10:45, 11:00, 11:15, 11:30, 11:45, 12:00, 12:15, 12:30, 12:45, 13:00';

      await client.sendText(from, `⏰ ¿Qué hora prefieres para el *${capitalize(dia)} ${msg}*? Horarios disponibles: ${horarios}\n(Escribe la hora en formato 09:00, 09:15, etc.)`);
      programarRecordatorioPendiente(from);
      return;
    }

    // ----- Paso: Elige HORA -----
    if (estadoConversacion[from] && estadoConversacion[from].paso === 'esperando_hora') {
      if (!/^\d{2}:\d{2}$/.test(msg)) {
        await client.sendText(from, '❌ Formato de hora inválido. Ejemplo válido: 09:15');
        return;
      }
      estadoConversacion[from].hora = msg;
      estadoConversacion[from].paso = 'esperando_nombre';
      await client.sendText(from, '📝 Por último, ¿cuál es tu *nombre completo*?');
      programarRecordatorioPendiente(from);
      return;
    }

    // ----- Paso: Confirmar CITA -----
    if (estadoConversacion[from] && estadoConversacion[from].paso === 'esperando_nombre') {
      const { dia, fecha, hora } = estadoConversacion[from];
      const nombre = message.body.trim();
      const nuevaCita = {
        numero: from,
        nombre: nombre,
        dia,
        fecha,
        hora,
        estado: 'confirmado',
        servicio: 'Consulta médica',
        registradoEn: new Date().toISOString()
      };
      citas.push(nuevaCita);
      guardarCitas();
      delete estadoConversacion[from];

      // Crea el objeto fecha de la cita (julio 2025)
      const fechaObj = new Date();
      fechaObj.setFullYear(2025);
      fechaObj.setMonth(6); // Julio (0=enero, 6=julio)
      fechaObj.setDate(parseInt(fecha));
      const [h, m] = hora.split(':');
      fechaObj.setHours(parseInt(h), parseInt(m), 0, 0);

      // Si la fecha ya pasó para este año (por error de usuario), suma un año
      if (fechaObj < new Date()) {
        fechaObj.setFullYear(fechaObj.getFullYear() + 1);
      }

      await client.sendText(from,
        `✅ *¡Cita confirmada!*\n\n` +
        `📅 ${capitalize(dia)} ${fecha} a las ${hora}\n` +
        `👤 ${nombre}\n\n` +
        `Tu salud es nuestra prioridad. Te esperamos para una atención personalizada y cuidar de tu corazón 💙\n\n` +
        `🔔 *Recibirás un recordatorio automático 1 hora antes de tu cita.*`
      );

      // Recordatorio 1 hora antes de la cita
      programarRecordatorioCita(from, fechaObj, nombre, hora, 'Consulta médica');
      return;
    }
  });
}).catch((e) => console.log('❌ Error al iniciar el bot:', e));

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
