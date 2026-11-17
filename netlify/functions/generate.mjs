
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'POST மட்டும் அனுமதி.' }),
      { status: 405 }
    );
  }

  try {
    const { prompt } = await req.json();

    if (typeof prompt !== 'string' || prompt.length > 6000) {
      return new Response(
        JSON.stringify({ error: 'கோரிக்கை சரியாக இல்லை.' }),
        { status: 400 }
      );
    }

    const key = process.env.ANTHROPIC_API_KEY;

    if (!key) {
      return new Response(
        JSON.stringify({ error: 'API Key அமைக்கப்படவில்லை.' }),
        { status: 500 }
      );
    }

    const model = process.env.ANTHROPIC_MODEL ||
      'claude-haiku-4-5-20251001';

    const upstream = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          messages: [{ role: 'user', content: prompt }]
        })
      }
    );

    const result = await upstream.json();

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({
          error: result.error?.message || 'Claude API தோல்வி.'
        }),
        { status: 502 }
      );
    }

    const text = (result.content || [])
      .filter(x => x.type === 'text')
      .map(x => x.text).join('\n');

    let parsed;

    try {
      parsed = JSON.parse(
        text.replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '').trim()
      );
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (!parsed || !Array.isArray(parsed.lines)) {
      return new Response(
        JSON.stringify({ text }),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ lines: parsed.lines }),
      { status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Server பிழை.' }),
      { status: 500 }
    );
  }
};
          
