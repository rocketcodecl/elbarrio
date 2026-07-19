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
//
// DEBUG: si la IA se queda "leyendo la foto", abrí la consola del
// navegador (F12 → Console). Este módulo loguea cada paso: qué modelo
// prueba, cuánto tarda, qué responde, y por qué falla.
// ============================================================

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const URL = 'https://openrouter.ai/api/v1/chat/completions'

// Modelos de visión gratis en OpenRouter, en orden de preferencia.
// Verificados disponibles el 2026-07-19 vía https://openrouter.ai/api/v1/models
// OpenRouter rota estos modelos seguido. Si fallan todos, revisar:
//   https://openrouter.ai/models?q=vision (filtrar por :free)
// ORDEN IMPORTANTE: gemma primero porque NO es modelo de razonamiento
// (responde el JSON directo). nemotron SÍ razona: gasta tokens "pensando"
// y con max_tokens bajo se queda sin espacio para la respuesta final →
// devuelve contenido vacío. Por eso lo dejamos último.
const MODELOS_VISION = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
]

// Timeouts ajustados para fallar rápido y no quedar "leyendo la foto":
// 12s por modelo, 25s total. Antes era 25s×3 = 75s.
const TIMEOUT_TOTAL_MS = 25000
const TIMEOUT_MODELO_MS = 12000

const CATEGORIAS_VALIDAS = [
  'Electrónica', 'Ropa', 'Hogar', 'Deportes', 'Libros', 'Juguetes',
  'Muebles', 'Bicicletas', 'Mascotas', 'Herramientas', 'Otros',
]

// Prompt ÚNICO para todos los tipos (sell/gift/trade).
// El schema es siempre el mismo — el modelo no se confunde. El cliente
// (CreatePost) decide qué campos usar según el tipo de post.
function buildPrompt(type) {
  let contexto = ''
  if (type === 'gift') contexto = ' El objeto se va a REGALAR (no tiene precio).'
  else if (type === 'trade') contexto = ' El objeto se va a INTERCAMBIAR por otra cosa.'

  return `Eres un asistente que ayuda a vecinos chilenos en un marketplace hiperlocal llamado "El Barrio".${contexto}

Mirá esta foto y devolvé ÚNICAMENTE un JSON válido (sin markdown, sin texto antes ni después) con esta forma exacta:

{"title":"Bicicleta MTB Trek talla M","description":"Descripción honesta de 2-3 oraciones, máximo 500 caracteres. Estado visible, marca solo si se lee claro, color, tamaño. Tono cercano, español chileno.","category":"Bicicletas","suggestedPrice":15000,"condition":"usado","lookingFor":"Teclado electrónico o bici plegable"}

Reglas:
- title: corto y concreto, máximo 60 caracteres. No empieces con "Vendo" ni "Se vende".
- category: una de estas EXACTAS: ${CATEGORIAS_VALIDAS.join(', ')}
- suggestedPrice: número entero en pesos chilenos. Si no es vendible, null.
- condition: "nuevo", "usado" o "con detalles".
- lookingFor: qué sería razonable pedir a cambio (máx 60 caracteres). Si no aplica, null.
- Si la foto no muestra un objeto claro, devolvé: {"title":"","description":"","category":"Otros","suggestedPrice":null,"condition":"usado","lookingFor":null}
- No inventes marca si no se ve claramente.
- Respondé SOLO el JSON. Nada más.`
}

async function llamarOpenRouter(model, prompt, imageDataUrl, timeoutMs) {
  console.log(`[IA] → Probando modelo: ${model} (timeout ${timeoutMs / 1000}s)`)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const t0 = Date.now()

  let res
  try {
    res = await fetch(URL, {
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
        temperature: 0.5,
        // 800 tokens: suficiente para razonamiento (nemotron) + respuesta JSON.
        // Con 500, nemotron se quedaba sin tokens y devolvía contenido vacío.
        max_tokens: 800,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    const ms = Date.now() - t0
    if (err.name === 'AbortError') {
      console.warn(`[IA] ✗ ${model} TIMEOUT después de ${ms}ms`)
      const e = new Error(`Timeout ${timeoutMs / 1000}s con ${model}`)
      e.status = 408
      throw e
    }
    console.warn(`[IA] ✗ ${model} error de red:`, err.message)
    throw err
  }
  clearTimeout(timeout)
  const ms = Date.now() - t0

  if (!res.ok) {
    let errorBody = ''
    try {
      const errJson = await res.json()
      errorBody = errJson?.error?.message || JSON.stringify(errJson)
    } catch {
      try { errorBody = await res.text() } catch {}
    }
    console.warn(`[IA] ✗ ${model} HTTP ${res.status} en ${ms}ms: ${errorBody}`)
    const e = new Error(`OpenRouter ${res.status}: ${errorBody}`)
    e.status = res.status
    e.body = errorBody
    throw e
  }

  const data = await res.json()
  const choice = data?.choices?.[0]
  const msg = choice?.message
  let content = msg?.content
  // Algunos VLMs devuelven content como array de bloques.
  if (Array.isArray(content)) {
    content = content
      .filter((b) => b && typeof b === 'object' && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('')
      .trim()
  } else if (typeof content === 'string') {
    content = content.trim()
  } else {
    content = ''
  }
  // Modelos de razonamiento (nemotron) pueden dejar la respuesta en `reasoning`.
  if (!content && msg?.reasoning && typeof msg.reasoning === 'string') {
    content = msg.reasoning.trim()
    console.warn(`[IA] ⚠ ${model}: content vacío, usando 'reasoning' (${content.length} chars)`)
  }
  const finishReason = choice?.finish_reason || '?'
  console.log(`[IA] ✓ ${model} respondió en ${ms}ms (${content.length} chars, finish=${finishReason})`)
  if (!content) {
    // Loguear la respuesta completa para ver dónde quedó el texto.
    console.warn(`[IA] Respuesta vacía de ${model}. Response:`, JSON.stringify(data).slice(0, 1200))
    throw new Error('La IA no devolvió contenido.')
  }
  return content
}

// Parser robusto: nunca lanza. Si todo falla, devuelve {} y el caller
// usa valores por defecto.
function parsearRespuesta(content) {
  if (!content || typeof content !== 'string') return {}
  try {
    return JSON.parse(content)
  } catch {}
  const sinFence = content.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(sinFence)
  } catch {}
  const m = sinFence.match(/\{[\s\S]*\}/)
  if (m) {
    try { return JSON.parse(m[0]) } catch {}
  }
  console.warn('[IA] No se pudo parsear JSON. Respuesta cruda:', content.slice(0, 300))
  return {}
}

export async function describirFoto(imageDataUrl, type) {
  console.log(`[IA] === describirFoto START type=${type} ===`)
  if (!OPENROUTER_KEY) {
    console.error('[IA] ✗ Falta VITE_OPENROUTER_API_KEY en .env')
    const e = new Error('NO_KEY')
    e.code = 'NO_KEY'
    throw e
  }

  const prompt = buildPrompt(type)
  let lastError = null
  const inicio = Date.now()

  for (const model of MODELOS_VISION) {
    const transcurrido = Date.now() - inicio
    if (transcurrido >= TIMEOUT_TOTAL_MS) {
      console.warn(`[IA] Tiempo total agotado (${transcurrido}ms), no pruebo más modelos`)
      break
    }
    const restante = TIMEOUT_TOTAL_MS - transcurrido
    const timeoutEste = Math.min(TIMEOUT_MODELO_MS, restante)

    try {
      const content = await llamarOpenRouter(model, prompt, imageDataUrl, timeoutEste)
      const parsed = parsearRespuesta(content)
      console.log('[IA] JSON parseado:', parsed)

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

      const resultado = { title, description, category, suggestedPrice, condition, lookingFor }

      // Detectar respuesta vacía: la IA devolvió el JSON de fallback
      // ("la foto no muestra un objeto claro"). En vez de retornar silenciosamente
      // algo que no completa nada, lanzar error específico para que el cliente
      // pueda avisar al usuario y NO aplicar cooldown (puede reintentar con
      // otra foto o completar a mano).
      if (!title && !description) {
        console.warn('[IA] Respuesta vacía (IA no reconoció objeto en la foto)')
        const e = new Error('IA_VACIA')
        e.code = 'IA_VACIA'
        throw e
      }

      console.log('[IA] === describirFoto OK ===', resultado)
      return resultado
    } catch (e) {
      console.warn(`[IA] ${model} falló:`, e.status || '', e.message)
      // IA_VACIA: la IA respondió bien pero no vio un objeto claro.
      // No tiene sentido probar otro modelo — propagar de inmediato.
      if (e.code === 'IA_VACIA') throw e
      lastError = e
      if (e.status === 404) continue
      if (e.status === 408) continue
      if (e.status === 402) continue
      if (e.status === 429) {
        throw new Error('Límite por minuto. Espera 60 segundos.')
      }
      if (e.status === 401) {
        throw new Error('Clave de OpenRouter inválida. Revisa tu .env')
      }
      // Cualquier otro error (red, parseo): probar el siguiente modelo.
      continue
    }
  }

  const totalMs = Date.now() - inicio
  console.error(`[IA] === describirFoto FALLÓ después de ${totalMs}ms. Último error:`, lastError)
  if (lastError?.status === 402) {
    throw new Error('Límite DIARIO gratis agotado en OpenRouter. Volvé mañana o agregá USD $5 de crédito en openrouter.ai/credits para 1,000 pedidos/día.')
  }
  if (lastError?.status === 408 || totalMs >= TIMEOUT_TOTAL_MS) {
    throw new Error('La IA tardó demasiado en responder. Probá de nuevo en un momento.')
  }
  throw new Error('Ningún modelo de visión gratis está disponible ahora. Revisa https://openrouter.ai/models?q=vision o intenta más tarde.')
}
