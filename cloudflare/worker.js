// AI-шлюз «Рукоделия»: обе ИИ-сети за одним воркером.
// Сеть 1 — Cloudflare Workers AI (биндинг env.AI, ключ не нужен):
//   /image        — превью поделок, @cf/black-forest-labs/flux-1-schnell (1024×768, 4 шага);
//   /text short   — теги и короткие правки, @cf/mistralai/mistral-small-3.1-24b-instruct.
// Сеть 2 — Mistral API напрямую (секрет env.MISTRAL_API_KEY):
//   /text long    — анализ страниц-источников и длинные пошаговые инструкции;
//   если Mistral недоступен — автоматический fallback на Cloudflare Mistral.
// Деплой: cd cloudflare && npx wrangler deploy
// Секрет: npx wrangler secret put MISTRAL_API_KEY

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const FLUX_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const CF_MISTRAL_MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "mistral-small-latest";
// Окно Cloudflare Mistral ~8K: для fallback длинный источник режем до безопасных символов.
const CF_CONTEXT_BUDGET = 8000;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Только POST-запросы" });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(400, { error: "Некорректный JSON в теле запроса" });
    }

    const path = new URL(request.url).pathname;
    if (path === "/image") return handleImage(env, body);
    if (path === "/text") return handleText(env, body);
    return jsonResponse(404, { error: "Доступны только /image и /text" });
  },
};

// ─── /image: чистый FLUX, текст до воркера не доходит ──────
async function handleImage(env, body) {
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return jsonResponse(400, { error: "Поле 'prompt' обязательно" });
  }

  const seed = Number.isFinite(body.seed) ? Math.floor(body.seed) : undefined;
  const steps = clamp(Number(body.steps) || 4, 1, 8);

  try {
    const image = await fluxImage(env, prompt, seed, steps);
    return jsonResponse(200, { image });
  } catch (err) {
    console.error("FLUX error:", err);
    return jsonResponse(502, {
      error: "FLUX не смог сгенерировать картинку",
      details: String(err),
    });
  }
}

// ─── /text: long — Mistral напрямую, short — Cloudflare Mistral ──
async function handleText(env, body) {
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return jsonResponse(400, { error: "Поле 'prompt' обязательно" });
  }
  const system = typeof body.system === "string" ? body.system : "";
  const mode = body.mode === "long" ? "long" : "short";
  const maxTokens = clamp(Number(body.maxTokens) || 1800, 100, 4000);

  if (mode === "long" && env.MISTRAL_API_KEY) {
    try {
      const data = await mistralJson(env.MISTRAL_API_KEY, system, prompt, maxTokens);
      return jsonResponse(200, { data, provider: "mistral" });
    } catch (err) {
      console.error("Mistral API error, fallback на Cloudflare:", err);
    }
  }

  try {
    const cut = fitCfContext(system, prompt);
    const data = await cfMistralJson(env, cut.system, cut.prompt, maxTokens);
    return jsonResponse(200, { data, provider: "cloudflare" });
  } catch (err) {
    console.error("CF Mistral error:", err);
    return jsonResponse(502, {
      error: "Ни одна из ИИ-сетей не ответила",
      details: String(err),
    });
  }
}

async function mistralJson(apiKey, system, user, maxTokens) {
  const response = await fetch(MISTRAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mistral ${response.status}: ${text.slice(0, 300)}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  return parseJsonLoose(typeof content === "string" ? content : "");
}

async function cfMistralJson(env, system, user, maxTokens) {
  const result = await env.AI.run(CF_MISTRAL_MODEL, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: maxTokens,
    temperature: 0.4,
  });
  return parseJsonLoose(String(result?.response ?? ""));
}

function fitCfContext(system, user) {
  const budget = Math.max(500, CF_CONTEXT_BUDGET - system.length);
  return { system, prompt: user.slice(0, budget) };
}

function parseJsonLoose(content) {
  if (!content) {
    throw new Error("Пустой ответ от модели");
  }
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Модель вернула ответ, не являющийся JSON: " + content.slice(0, 120));
  }
}

async function fluxImage(env, prompt, seed, steps) {
  const response = await env.AI.run(FLUX_MODEL, {
    prompt,
    width: 1024,
    height: 768,
    steps,
    ...(seed !== undefined ? { seed } : {}),
  });

  let imageBytes;
  if (response.image instanceof Uint8Array) {
    imageBytes = response.image;
  } else if (response.image instanceof ArrayBuffer) {
    imageBytes = new Uint8Array(response.image);
  } else if (response.image instanceof ReadableStream) {
    imageBytes = new Uint8Array(await new Response(response.image).arrayBuffer());
  } else {
    throw new Error("Неожиданный формат ответа FLUX");
  }
  return uint8ToBase64(imageBytes);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function uint8ToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: CORS_HEADERS,
  });
}
