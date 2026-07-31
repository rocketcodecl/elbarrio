const FUNCTION_NAME = 'analyze-listing-image'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MAX_PROMPT_LENGTH = 5000
const MAX_IMAGE_DATA_URL_LENGTH = 8_000_000

const ALLOWED_MODELS = new Set([
  'google/gemini-2.5-flash-lite',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
])

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'x-el-barrio-function',
  'x-el-barrio-function': FUNCTION_NAME,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function hasAuthenticatedUser(req: Request) {
  const authorization = req.headers.get('Authorization')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !supabaseAnonKey) {
    return false
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authorization,
        apikey: supabaseAnonKey,
      },
    })
    return response.ok
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: { message: 'Método no permitido.' } }, 405)
  }
  if (!(await hasAuthenticatedUser(req))) {
    return jsonResponse({ error: { message: 'Sesión no válida.' } }, 401)
  }

  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!openRouterKey) {
    return jsonResponse({ error: { message: 'El servicio de IA no está configurado.' } }, 503)
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: { message: 'Solicitud inválida.' } }, 400)
  }

  const { model, prompt, imageDataUrl } = payload
  if (typeof model !== 'string' || !ALLOWED_MODELS.has(model)) {
    return jsonResponse({ error: { message: 'Modelo no permitido.' } }, 400)
  }
  if (typeof prompt !== 'string' || prompt.length === 0 || prompt.length > MAX_PROMPT_LENGTH) {
    return jsonResponse({ error: { message: 'Prompt inválido.' } }, 400)
  }
  if (
    typeof imageDataUrl !== 'string' ||
    !imageDataUrl.startsWith('data:image/') ||
    imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH
  ) {
    return jsonResponse({ error: { message: 'Imagen inválida o demasiado grande.' } }, 400)
  }

  let upstream: Response
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
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
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError'
    return jsonResponse(
      { error: { message: timedOut ? 'OpenRouter tardó demasiado en responder.' : 'No se pudo contactar a OpenRouter.' } },
      timedOut ? 408 : 502,
    )
  }

  let data: unknown
  try {
    data = await upstream.json()
  } catch {
    return jsonResponse({ error: { message: 'OpenRouter devolvió una respuesta inválida.' } }, 502)
  }

  if (!upstream.ok) {
    const upstreamError = data as { error?: { message?: string } }
    return jsonResponse(
      { error: { message: upstreamError?.error?.message || `OpenRouter respondió ${upstream.status}.` } },
      upstream.status,
    )
  }

  return jsonResponse(data)
})
