// lib/ia.js

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const URL = 'https://api.groq.com/openai/v1/chat/completions'

// Lista de modelos con visión, en orden de preferencia.
// Si el primero da 404 (no disponible), intenta el siguiente.
const MODELOS_VISION = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
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

async function llamarGroq(model, prompt, imageDataUrl) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
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
    const e = new Error(`Groq ${res.status}: ${errorBody}`)
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
  if (!GROQ_KEY) {
    const e = new Error('NO_KEY')
    e.code = 'NO_KEY'
    throw e
  }

  const prompt = buildPrompt(type)
  let lastError = null

  for (const model of MODELOS_VISION) {
    try {
      const content = await llamarGroq(model, prompt, imageDataUrl)
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
      console.error(`Groq ${model} falló:`, e.status, e.body || e.message)
      lastError = e
      if (e.status === 404) {
        continue
      }
      if (e.status === 429) {
        throw new Error('Límite por minuto. Espera 60 segundos.')
      }
      if (e.status === 401) {
        throw new Error('Clave de Groq inválida. Revisa tu .env')
      }
      throw new Error(e.message || 'La IA no respondió. Intenta de nuevo.')
    }
  }

  console.error('Todos los modelos de visión fallaron. Último error:', lastError)
  throw new Error('Ningún modelo de visión está disponible en tu cuenta de Groq. Revisa https://console.groq.com/docs/models')
}