const MAX_BATCH_SIZE = 50;
const MAX_BODY_BYTES = 100_000;
const MAX_STRING_LENGTH = 500;
const MAX_URL_LENGTH = 2000;
const ALLOWED_TYPES = new Set(['input', 'click', 'error', 'visibility']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RELEASE_FILENAME_PATTERN = /^[\w.-]+\.xpi$/;

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
    inputType: truncate(context.inputType ?? '', MAX_STRING_LENGTH),
    href: truncate(context.href ?? '', MAX_URL_LENGTH)
  };
}

function validateEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
  if (!ALLOWED_TYPES.has(event.type)) return null;
  if (typeof event.url !== 'string' || !/^https?:\/\//.test(event.url)) return null;

  const base = {
    type: event.type,
    url: truncate(event.url, MAX_URL_LENGTH),
    inFrame: event.inFrame === true
  };

  switch (event.type) {
    case 'input':
    case 'click':
      if (typeof event.tag !== 'string') return null;
      return {
        ...base,
        tag: truncate(event.tag, 50),
        context: sanitizeContext(event.context),
        selector: truncate(event.selector ?? '', MAX_STRING_LENGTH),
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

async function handleUpdateManifest(env, corsHeaders) {
  const object = await env.RELEASES_BUCKET.get('updates.json');
  if (!object) {
    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
  return new Response(object.body, {
    status: 200,
    headers: { ...corsHeaders, 'content-type': 'application/json' }
  });
}

async function handleReleaseFile(env, filename, corsHeaders) {
  if (!RELEASE_FILENAME_PATTERN.test(filename)) {
    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
  const object = await env.RELEASES_BUCKET.get(`releases/${filename}`);
  if (!object) {
    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
  return new Response(object.body, {
    status: 200,
    headers: { ...corsHeaders, 'content-type': 'application/x-xpinstall' }
  });
}

async function handleDebugList(env, corsHeaders) {
  const listed = await env.LOGS_BUCKET.list({ limit: 20 });
  const objects = listed.objects
    .slice()
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((object) => ({ key: object.key, size: object.size, uploaded: object.uploaded }));
  return jsonResponse({ ok: true, count: objects.length, objects }, 200, corsHeaders);
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, x-api-key, x-client-id'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/updates.json') {
      return handleUpdateManifest(env, corsHeaders);
    }

    if (request.method === 'GET' && url.pathname.startsWith('/releases/')) {
      return handleReleaseFile(env, url.pathname.slice('/releases/'.length), corsHeaders);
    }

    if (request.method === 'GET' && url.pathname === '/debug/logs') {
      if (!env.API_KEY || request.headers.get('x-api-key') !== env.API_KEY) {
        return new Response('Not found', { status: 404, headers: corsHeaders });
      }
      return handleDebugList(env, corsHeaders);
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    const rawClientId = request.headers.get('x-client-id') || '';
    const clientId = UUID_PATTERN.test(rawClientId) ? rawClientId : null;
    const rateLimitKey = clientId || clientIp;

    if (env.RATE_LIMITER) {
      const { success } = await env.RATE_LIMITER.limit({ key: rateLimitKey });
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
        sourceIp: clientIp,
        clientId
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
