// Отдельный Cloudflare Worker: идея пользователя -> Mistral (промт + шаги) -> FLUX (картинка).
// Деплой не из этого репозитория, а через wrangler: env.AI — биндинг Workers AI,
// env.MISTRAL_API_KEY — секрет (`wrangler secret put MISTRAL_API_KEY`).
// ─── CORS-заголовки для PWA ───────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// ─── Системный промт для Mistral ─────────────────────────
const SYSTEM_PROMPT = `Ты — ассистент, который помогает создавать промты для генерации изображений.
Получив идею пользователя, верни СТРОГО JSON (без markdown, без \`\`\`):
{
  "image_prompt": "детальный промт на английском для AI-генератора картинок. Опиши стиль, освещение, композицию, детали",
  "steps": "пошаговое описание на русском (3-5 шагов), что будет изображено на картинке"
}
Не добавляй никаких полей кроме этих двух.`;

// ─── Обработчик запросов ─────────────────────────────────
export default {
  async fetch(request, env) {
    // Preflight для CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Только POST-запросы" });
    }

    let userInput;
    try {
      const body = await request.json();
      userInput = body.prompt?.trim();
    } catch {
      return jsonResponse(400, { error: "Некорректный JSON в теле запроса" });
    }

    if (!userInput) {
      return jsonResponse(400, { error: "Поле 'prompt' обязательно" });
    }

    // ── Шаг 1: Mistral генерирует промт + шаги ──────────────
    let mistralData;
    try {
      mistralData = await getMistralResponse(env, userInput);
    } catch (err) {
      console.error("Mistral error:", err);
      return jsonResponse(502, {
        error: "Mistral AI не ответил",
        details: err.message,
      });
    }

    const { image_prompt, steps } = mistralData;

    if (!image_prompt) {
      return jsonResponse(502, {
        error: "Mistral вернул пустой промт",
        raw: mistralData,
      });
    }

    // ── Шаг 2: FLUX рисует картинку ────────────────────────
    let imageBase64;
    try {
      imageBase64 = await generateImage(env, image_prompt);
    } catch (err) {
      console.error("FLUX error:", err);
      return jsonResponse(502, {
        error: "Cloudflare FLUX не смог сгенерировать картинку",
        details: err.message,
        steps,
        image_prompt,
      });
    }

    // ── Ответ ──────────────────────────────────────────────
    return jsonResponse(200, {
      steps,
      image_prompt,
      image: imageBase64,
    });
  },
};

// ─── Запрос к Mistral AI ─────────────────────────────────
async function getMistralResponse(env, userInput) {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userInput },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mistral ${response.status}: ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Пустый ответ от Mistral");
  }

  // Парсим JSON из ответа
  try {
    return JSON.parse(content);
  } catch {
    // Если Mistral обернул в markdown — пробуем вырезать
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Не удалось распарсить JSON от Mistral: " + content);
  }
}

// ─── Генерация картинки через Cloudflare FLUX ─────────────
async function generateImage(env, prompt) {
  const response = await env.AI.run(
    "@cf/black-forest-labs/flux-1-schnell",
    {
      prompt,
      width: 1024,
      height: 768,
      steps: 4,
    }
  );

  // Cloudflare возвращает { image: Uint8Array } или ReadableStream
  let imageBytes;

  if (response.image instanceof Uint8Array) {
    imageBytes = response.image;
  } else if (response.image instanceof ArrayBuffer) {
    imageBytes = new Uint8Array(response.image);
  } else if (response.image instanceof ReadableStream) {
    imageBytes = new Uint8Array(
      await new Response(response.image).arrayBuffer()
    );
  } else {
    throw new Error("Неожиданный формат ответа FLUX");
  }

  // Конвертируем в base64
  return uint8ToBase64(imageBytes);
}

// ─── Утилиты ──────────────────────────────────────────────
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
