const MAX_BATCH_SIZE = 50;
const MAX_BODY_BYTES = 100_000;
const MAX_STRING_LENGTH = 500;
const MAX_URL_LENGTH = 2000;
const ALLOWED_TYPES = new Set(['input', 'click', 'error', 'visibility']);

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' }
  });
}

function truncate(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function sanitizeContext(context) {
  if (!context || typeof context !== 'object') return {};
  return {
    fieldName: truncate(context.fieldName ?? '', MAX_STRING_LENGTH),
    fieldId: truncate(context.fieldId ?? '', MAX_STRING_LENGTH),
    placeholder: truncate(context.placeholder ?? '', MAX_STRING_LENGTH),
    inputType: truncate(context.inputType ?? '', MAX_STRING_LENGTH)
  };
}

function validateEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
  if (!ALLOWED_TYPES.has(event.type)) return null;
  if (typeof event.url !== 'string' || !/^https?:\/\//.test(event.url)) return null;

  const base = {
    type: event.type,
    url: truncate(event.url, MAX_URL_LENGTH)
  };

  switch (event.type) {
    case 'input':
    case 'click':
      if (typeof event.tag !== 'string') return null;
      return {
        ...base,
        tag: truncate(event.tag, 50),
        context: sanitizeContext(event.context),
        ...(event.type === 'input'
          ? { value: truncate(event.value, MAX_STRING_LENGTH) }
          : { text: truncate(event.text, MAX_STRING_LENGTH) })
      };
    case 'error':
      return {
        ...base,
        message: truncate(event.message, MAX_STRING_LENGTH),
        stack: truncate(event.stack, MAX_STRING_LENGTH)
      };
    case 'visibility':
      return {
        ...base,
        visible: typeof event.visible === 'boolean' ? event.visible : null
      };
    default:
      return null;
  }
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, x-api-key'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';

    if (env.RATE_LIMITER) {
      const { success } = await env.RATE_LIMITER.limit({ key: clientIp });
      if (!success) {
        return jsonResponse({ ok: false, error: 'rate_limited' }, 429, corsHeaders);
      }
    }

    if (env.API_KEY && request.headers.get('x-api-key') !== env.API_KEY) {
      return jsonResponse({ ok: false, error: 'unauthorized' }, 401, corsHeaders);
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ ok: false, error: 'payload_too_large' }, 413, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return jsonResponse({ ok: false, error: 'invalid_json' }, 400, corsHeaders);
    }

    const payload = Array.isArray(body) ? body : [body];
    if (payload.length === 0 || payload.length > MAX_BATCH_SIZE) {
      return jsonResponse({ ok: false, error: 'invalid_batch_size' }, 400, corsHeaders);
    }

    const sanitized = [];
    for (const event of payload) {
      const validated = validateEvent(event);
      if (!validated) {
        return jsonResponse({ ok: false, error: 'invalid_schema' }, 400, corsHeaders);
      }
      sanitized.push({
        ...validated,
        receivedAt: new Date().toISOString(),
        sourceIp: clientIp
      });
    }

    const key = `${Date.now()}-${crypto.randomUUID()}.json`;
    await env.LOGS_BUCKET.put(key, JSON.stringify(sanitized), {
      httpMetadata: {
        contentType: 'application/json'
      }
    });

    return jsonResponse({ ok: true, key }, 200, corsHeaders);
  }
};
