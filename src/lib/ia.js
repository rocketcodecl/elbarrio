// lib/ia.js
//
// ✨ Autocompletar con IA desde la foto.
// Usa OPENROUTER (gratis, no pide tarjeta) — agregador de modelos con visión.
//
// ACTIVAR (3 pasos):
//   1. Entrá a https://openrouter.ai/keys
//   2. Iniciá sesión con Google o GitHub → "Create Key" → copiala
//      (empieza con sk-or-v1-... y tiene ~70 caracteres)
//   3. En tu .env (o .env.local), agregá:
//        VITE_OPENROUTER_API_KEY=sk-or-v1-tu-clave-aqui
//   Reiniciá npm run dev (Ctrl+C + npm run dev). Listo.
//
// LÍMITES GRATIS DE OPENROUTER:
//   · 50 pedidos por día en modelos :free (sin agregar crédito)
//   · 1,000 pedidos por día si agregás USD $5 de crédito (opcional)
//   · Sin tarjeta de crédito para registrarse
// ============================================================

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const URL = 'https://openrouter.ai/api/v1/chat/completions'

// Modelos de visión gratis en OpenRouter, en orden de preferencia.
// Si el primero falla (404/cuota), intenta el siguiente.
const MODELOS_VISION = [
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'qwen/qwen-2.5-vl-7b-instruct:free',
  'qwen/qwen-2-vl-7b-instruct:free',
]

const CATEGORIAS_VALIDAS = [
  'Electrónica', 'Ropa', 'Hogar', 'Deportes', 'Libros', 'Juguetes',
  'Muebles', 'Bicicletas', 'Mascotas', 'Herramientas', 'Otros',
]

function buildPrompt(type) {
  const esTrueque = type === 'trade'
  const esRegalo = type === 'gift'
  return `Eres un asistente que ayuda a vecinos chilenos a describir cosas que venden, regalan o intercambian en un marketplace hiperlocal llamado "El Barrio".

Mira esta foto${esRegalo ? ' (algo que se va a regalar)' : esTrueque ? ' (algo que se va a intercambiar)' : ''} y devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin texto antes ni después) con esta forma exacta:

{
  "title": "Título corto, vendedor y concreto. Máximo 60 caracteres. En español chileno. Ej: 'Bicicleta MTB Trek talla M' o 'Set de ollas antiadherentes'",
  "description": "Descripción honesta y amable, 2-3 oraciones, máximo 500 caracteres. Menciona: estado visible, marca SOLO si se lee claramente, color principal, tamaño si se deduce, y algún detalle útil. En español chileno, tono cercano.",
  "category": "Una de estas categorías EXACTAS: ${CATEGORIAS_VALIDAS.join(', ')}",
  "suggestedPrice": ${esRegalo ? 'null (es un regalo, no tiene precio)' : 'número entero en pesos chilenos (CLP). Estima un precio justo para venta de segunda mano entre vecinos. Considera el estado visible. Si no es un producto vendible, devuelve null.'},
  "condition": "uno de: 'nuevo', 'usado', 'con detalles'",
  "lookingFor": ${esTrueque ? '"qué sería razonable pedir a cambio, en 1 frase corta. Ej: Teclado electrónico o bicí plegable"' : 'null'}
}

REGLAS IMPORTANTES:
- Si la foto NO muestra un objeto/producto claro (es un paisaje, una persona, comida ya cocinada, una captura de pantalla, etc.), devuelve: {"title":"","description":"","category":"Otros","suggestedPrice":null,"condition":"usado","lookingFor":null}
- NO inventes marca si no se ve claramente.
- El precio debe ser realista para el mercado chileno de segunda mano (no inflado, no de remate).
- El título NO debe empezar con "Vendo" ni "Se vende" — va en una tarjeta que ya dice "En venta".
- Responde SOLO el JSON. Nada más.`
}

async function llamarOpenRouter(model, prompt, imageDataUrl) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'HTTP-Referer': 'https://elbarrio.app',
      'X-Title': 'El Barrio',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    let errorBody = ''
    try {
      const errJson = await res.json()
      errorBody = errJson?.error?.message || JSON.stringify(errJson)
    } catch {
      try { errorBody = await res.text() } catch {}
    }
    const e = new Error(`OpenRouter ${res.status}: ${errorBody}`)
    e.status = res.status
    e.body = errorBody
    throw e
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('La IA no devolvió contenido.')
  }
  return content
}

export async function describirFoto(imageDataUrl, type) {
  if (!OPENROUTER_KEY) {
    const e = new Error('NO_KEY')
    e.code = 'NO_KEY'
    throw e
  }

  const prompt = buildPrompt(type)
  let lastError = null

  for (const model of MODELOS_VISION) {
    try {
      const content = await llamarOpenRouter(model, prompt, imageDataUrl)
      let parsed
      try {
        parsed = JSON.parse(content)
      } catch {
        const m = content.match(/\{[\s\S]*\}/)
        parsed = m ? JSON.parse(m[0]) : {}
      }

      const title = typeof parsed.title === 'string' ? parsed.title.slice(0, 60) : ''
      const description = typeof parsed.description === 'string' ? parsed.description.slice(0, 500) : ''
      const category = CATEGORIAS_VALIDAS.includes(parsed.category) ? parsed.category : 'Otros'
      const suggestedPrice =
        typeof parsed.suggestedPrice === 'number' && parsed.suggestedPrice > 0
          ? Math.round(parsed.suggestedPrice)
          : null
      const condition = ['nuevo', 'usado', 'con detalles'].includes(parsed.condition)
        ? parsed.condition
        : 'usado'
      const lookingFor = typeof parsed.lookingFor === 'string' && parsed.lookingFor.length > 0
        ? parsed.lookingFor.slice(0, 60)
        : null

      return { title, description, category, suggestedPrice, condition, lookingFor }
    } catch (e) {
      console.error(`OpenRouter ${model} falló:`, e.status, e.body || e.message)
      lastError = e
      if (e.status === 404) continue
      if (e.status === 429) {
        throw new Error('Límite por minuto. Espera 60 segundos.')
      }
      if (e.status === 401) {
        throw new Error('Clave de OpenRouter inválida. Revisa tu .env')
      }
      if (e.status === 402) continue
      throw new Error(e.message || 'La IA no respondió. Intenta de nuevo.')
    }
  }

  console.error('Todos los modelos de visión fallaron. Último error:', lastError)
  if (lastError?.status === 402) {
    throw new Error('Límite DIARIO gratis agotado en OpenRouter. Volvé mañana o agregá USD $5 de crédito en openrouter.ai/credits para 1,000 pedidos/día.')
  }
  throw new Error('Ningún modelo de visión gratis está disponible ahora. Revisa https://openrouter.ai/models?q=vision o intenta más tarde.')
}