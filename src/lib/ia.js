// lib/ia.js
//
// ✨ Autocompletar con IA desde la foto.
// Usa OpenRouter a través de la Edge Function `analyze-listing-image`,
// para que la clave de producción nunca llegue al navegador.
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

import { supabase } from './supabase'

const EDGE_FUNCTION = 'analyze-listing-image'

// Modelos de visión en OpenRouter, en orden de preferencia.
// Verificados disponibles el 2026-07-30 en OpenRouter.
// Gemini Flash Lite usa saldo pagado por su mayor estabilidad. Los modelos
// gratuitos quedan únicamente como respaldo y OpenRouter puede rotarlos.
// Si fallan todos, revisar:
//   https://openrouter.ai/models?q=vision (filtrar por :free)
// Nemotron queda último porque puede gastar tokens de salida razonando.
const MODELOS_VISION = [
  'google/gemini-2.5-flash-lite',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
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
- Identifica el objeto físico principal aunque no puedas reconocer su marca o modelo. En ese caso usa un nombre genérico y describe solo lo visible.
- title: corto y concreto, máximo 60 caracteres. No empieces con "Vendo" ni "Se vende".
- category: una de estas EXACTAS: ${CATEGORIAS_VALIDAS.join(', ')}
- suggestedPrice: número entero en pesos chilenos. Si no es vendible, null.
- condition: "nuevo", "usado" o "con detalles".
- lookingFor: qué sería razonable pedir a cambio (máx 60 caracteres). Si no aplica, null.
- Usa la respuesta vacía únicamente cuando de verdad no haya ningún objeto físico identificable, por ejemplo una imagen negra, vacía o un paisaje sin objeto principal: {"title":"","description":"","category":"Otros","suggestedPrice":null,"condition":"usado","lookingFor":null}
- No inventes marca si no se ve claramente.
- Respondé SOLO el JSON. Nada más.`
}

async function extraerErrorEdge(error, response) {
  const status = response?.status
  try {
    const errorData = await response?.json()
    const body = errorData?.error?.message || errorData?.message || JSON.stringify(errorData)
    return { status, body }
  } catch {
    return { status, body: error?.message || '' }
  }
}

async function llamarEdgeFunction(model, prompt, imageDataUrl, timeoutMs) {
  const { data, error, response } = await supabase.functions.invoke(EDGE_FUNCTION, {
    body: { model, prompt, imageDataUrl },
    timeout: timeoutMs,
  })

  if (!error) return data

  const { status, body } = await extraerErrorEdge(error, response)
  const reachedFunction = response?.headers?.get('x-el-barrio-function') === EDGE_FUNCTION
  const unavailable =
    !reachedFunction &&
    (status === 404 || error?.name === 'FunctionsFetchError' || error?.name === 'FunctionsRelayError')

  if (unavailable) {
    const e = new Error('La función segura de IA todavía no está disponible.')
    e.code = 'EDGE_UNAVAILABLE'
    e.status = status
    throw e
  }

  const e = new Error(body || error?.message || 'La función de IA no pudo responder.')
  e.status = status
  throw e
}

async function llamarOpenRouter(model, prompt, imageDataUrl, timeoutMs) {
  console.log(`[IA] → Probando modelo: ${model} (timeout ${timeoutMs / 1000}s)`)
  const t0 = Date.now()
  let data

  try {
    data = await llamarEdgeFunction(model, prompt, imageDataUrl, timeoutMs)
  } catch (err) {
    const ms = Date.now() - t0
    const aborted =
      err?.name === 'AbortError' ||
      (err?.name === 'FunctionsFetchError' && err?.context?.name === 'AbortError')
    if (aborted) {
      console.warn(`[IA] ✗ ${model} TIMEOUT después de ${ms}ms`)
      const e = new Error(`Timeout ${timeoutMs / 1000}s con ${model}`)
      e.status = 408
      throw e
    }
    console.warn(`[IA] ✗ ${model} falló en ${ms}ms:`, err.message)
    throw err
  }

  const ms = Date.now() - t0
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

// Parser robusto: nunca lanza. Retorna null cuando la respuesta no contiene
// un objeto JSON válido, para diferenciar formato inválido de foto no reconocida.
function parsearRespuesta(content) {
  if (!content || typeof content !== 'string') return null
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch { /* puede venir rodeado por markdown */ }
  const sinFence = content.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
  try {
    const parsed = JSON.parse(sinFence)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch { /* buscar el primer objeto JSON */ }
  const m = sinFence.match(/\{[\s\S]*\}/)
  if (m) {
    try {
      const parsed = JSON.parse(m[0])
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch { /* probar el siguiente modelo */ }
  }
  console.warn('[IA] No se pudo parsear JSON. Respuesta cruda:', content.slice(0, 300))
  return null
}

export async function describirFoto(imageDataUrl, type) {
  console.log(`[IA] === describirFoto START type=${type} ===`)
  const prompt = buildPrompt(type)
  let lastError = null
  let attemptedModels = 0
  let emptyResponses = 0
  const inicio = Date.now()

  for (const model of MODELOS_VISION) {
    const transcurrido = Date.now() - inicio
    if (transcurrido >= TIMEOUT_TOTAL_MS) {
      console.warn(`[IA] Tiempo total agotado (${transcurrido}ms), no pruebo más modelos`)
      break
    }
    const restante = TIMEOUT_TOTAL_MS - transcurrido
    const timeoutEste = Math.min(TIMEOUT_MODELO_MS, restante)
    attemptedModels += 1

    try {
      const content = await llamarOpenRouter(model, prompt, imageDataUrl, timeoutEste)
      const parsed = parsearRespuesta(content)
      if (!parsed) {
        const e = new Error('La IA respondió con un formato inválido.')
        e.code = 'IA_FORMATO'
        throw e
      }
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

      // Una respuesta vacía de un modelo no decide el resultado final:
      // se prueba el siguiente antes de informar que la foto no fue reconocida.
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
      if (e.code === 'EDGE_UNAVAILABLE') throw e
      lastError = e
      if (e.code === 'IA_VACIA') {
        emptyResponses += 1
        continue
      }
      if (e.code === 'IA_FORMATO') continue
      if (e.status === 404) continue
      if (e.status === 408) continue
      if (e.status === 402) continue
      if (e.status === 429) {
        throw new Error('Límite por minuto. Espera 60 segundos.', { cause: e })
      }
      if (e.status === 401) {
        throw new Error('La sesión o la configuración del servicio de IA no es válida.', { cause: e })
      }
      // Cualquier otro error (red, parseo): probar el siguiente modelo.
      continue
    }
  }

  const totalMs = Date.now() - inicio
  console.error(`[IA] === describirFoto FALLÓ después de ${totalMs}ms. Último error:`, lastError)
  if (attemptedModels > 0 && emptyResponses === attemptedModels) {
    const e = new Error('IA_VACIA')
    e.code = 'IA_VACIA'
    throw e
  }
  if (lastError?.status === 402) {
    throw new Error('Límite DIARIO gratis agotado en OpenRouter. Volvé mañana o agregá USD $5 de crédito en openrouter.ai/credits para 1,000 pedidos/día.')
  }
  if (lastError?.status === 408 || totalMs >= TIMEOUT_TOTAL_MS) {
    throw new Error('La IA tardó demasiado en responder. Probá de nuevo en un momento.')
  }
  if (lastError?.code === 'IA_FORMATO') {
    throw new Error('La IA respondió de forma incompleta. Intenta nuevamente.')
  }
  throw new Error('Ningún modelo de visión gratis está disponible ahora. Revisa https://openrouter.ai/models?q=vision o intenta más tarde.')
}
