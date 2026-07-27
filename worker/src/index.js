export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const body = await request.json();
      const payload = Array.isArray(body) ? body : [body];
      const eventBatch = payload.map((event) => ({
        ...event,
        receivedAt: new Date().toISOString(),
        sourceIp: request.headers.get('cf-connecting-ip') || null
      }));

      const key = `${Date.now()}-${crypto.randomUUID()}.json`;
      await env.LOGS_BUCKET.put(key, JSON.stringify(eventBatch), {
        httpMetadata: {
          contentType: 'application/json'
        }
      });

      return new Response(JSON.stringify({ ok: true, key }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'content-type': 'application/json'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'content-type': 'application/json'
        }
      });
    }
  }
};
