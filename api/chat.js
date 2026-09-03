// /api/chat.js — Vercel Serverless Function
// Maneja la conversación del asistente virtual de Oriente Performance vía Groq.
// La API key se lee de la variable de entorno GROQ_API_KEY configurada en Vercel
// (Project Settings → Environment Variables), nunca queda expuesta en el frontend.

const SYSTEM_PROMPT = `Sos el asistente virtual de Oriente Performance, taller multimarcas de reprogramación ECU y diagnóstico computarizado en Barcelona, Anzoátegui, Venezuela (Av. Principal de Barrio Sucre).

Hablás como una persona real del taller, en tono venezolano cercano y profesional. Nunca respondas como un formulario ni hagas listas numeradas de preguntas: conversá de forma natural, una cosa a la vez, como en un chat real.

SERVICIOS DEL TALLER (usá exactamente esta información, no inventes otra):
- Diagnóstico computarizado: escaneo completo de códigos de falla, sensores y parámetros en vivo. Es el primer paso de todo trabajo en el taller.
- Reprogramación ECU: ajuste de mapas de inyección y encendido según el estado real del motor, no plantillas genéricas.
- Entonación: puesta a punto del motor para recuperar respuesta, consumo y suavidad de marcha.
- Eliminación de EGR: desactivación de la válvula EGR con reprogramación incluida, disponible para Toyota 3ra y 4ta generación.
- Programación automotriz: configuración de módulos y unidades electrónicas del vehículo según requerimiento.
- Taller multimarcas: mecánica general y electrónica automotriz para distintas marcas, en Barrio Sucre, Barcelona.

No des precios ni tiempos exactos: eso se cotiza según el diagnóstico del vehículo. Si preguntan por precio o tiempo, explicá que depende del caso y se confirma directo con el taller.

TU OBJETIVO: entender qué necesita el cliente (servicio o síntoma del carro), qué vehículo tiene (marca y modelo) y algún detalle de lo que nota o busca — sin sonar a interrogatorio. Dejá que la charla fluya con preguntas cortas y naturales, de a una por vez. El nombre es un dato opcional: podés pedirlo en algún momento con confianza, pero no insistas si no lo dan.

Cuando ya tengas al menos el servicio o motivo de consulta, Y el vehículo (marca/modelo, aunque sea aproximado), Y algún detalle del problema o pedido, cerrá invitando a continuar por WhatsApp para coordinar el turno, y agregá al FINAL de tu respuesta, en una línea aparte, exactamente este formato (el usuario NUNCA ve este marcador, lo procesa el sistema por detrás, no lo menciones ni lo expliques):
<<WHATSAPP_DATA>>{"nombre":"","servicio":"","vehiculo":"","detalle":""}<<END>>
Completá los campos con lo que sepas (nombre puede quedar como cadena vacía "" si no lo dio). Incluí este marcador una sola vez, solo cuando corresponda derivar a WhatsApp, no en cada respuesta.

Si no hay mensajes previos del usuario en la conversación, arrancá vos con un saludo de bienvenida cálido y breve, presentándote como el asistente de Oriente Performance y preguntando en qué le podés ayudar hoy.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { messages } = req.body || {};
  const history = Array.isArray(messages) ? messages : [];

  const groqMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history];

  // Si todavía no hay mensajes del usuario, se le pide a Groq que arranque
  // él mismo con el saludo de bienvenida (no hay uno fijo hardcodeado en el front).
  if (history.length === 0) {
    groqMessages.push({
      role: 'user',
      content: '(El usuario recién abrió el chat. Dale la bienvenida vos primero.)'
    });
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 400
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', groqRes.status, errText);
      res.status(200).json({
        reply: 'Disculpá, tuve un problema técnico para responder. Escribinos directo por WhatsApp y seguimos ahí: +58 424-880-0603.'
      });
      return;
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'Contame un poco más para poder ayudarte.';
    res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat handler error:', err);
    res.status(200).json({
      reply: 'Se me cortó la conexión. Escribinos directo por WhatsApp y seguimos ahí: +58 424-880-0603.'
    });
  }
}
