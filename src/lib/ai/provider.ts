import { AIProviderConfig } from "./types";

/**
 * Get AI provider configuration from server environment variables
 */
export function getAIConfig(): AIProviderConfig {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase() as
    | "gemini"
    | "openai"
    | "custom";

  const apiKey =
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    null;

  let model = process.env.AI_MODEL || "";
  if (
    !model ||
    model.includes("preview") ||
    model === "gemini-2.5-flash" ||
    model === "gemini-3-flash-preview"
  ) {
    if (provider === "gemini") {
      model = "gemini-3.6-flash";
    } else if (provider === "openai") {
      model = "gpt-4o-mini";
    } else {
      model = "default";
    }
  }

  return {
    provider,
    apiKey,
    model,
    isConfigured: Boolean(apiKey && apiKey.trim().length > 0),
  };
}

interface CallAIOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  jsonMode?: boolean;
}

/**
 * Execute AI request with strict error handling and timeouts
 */
export async function callAIProvider(options: CallAIOptions): Promise<string> {
  const config = getAIConfig();

  if (!config.isConfigured || !config.apiKey) {
    throw new Error(
      "AI xizmati sozlanmagan. Iltimos, server sozlamalarida AI_API_KEY o‘zgaruvchisini belgilang."
    );
  }

  const timeoutMs = 45000; // 45 seconds timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (config.provider === "gemini") {
      return await callGeminiAPI(config, options, controller.signal);
    } else {
      return await callOpenAICompatibleAPI(config, options, controller.signal);
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("AI javob berish vaqti tugadi (Timeout). Qayta urinib ko‘ring.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Google Gemini REST API execution with automatic model fallback
 */
async function callGeminiAPI(
  config: AIProviderConfig,
  options: CallAIOptions,
  signal: AbortSignal
): Promise<string> {
  const modelsToTry = [
    config.model || "gemini-3.6-flash",
    "gemini-3.6-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  const uniqueModels = Array.from(new Set(modelsToTry.filter(Boolean)));
  let lastError: any = null;

  for (const model of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

      const payload: any = {
        contents: [
          {
            role: "user",
            parts: [{ text: options.userPrompt }],
          },
        ],
        generationConfig: {
          temperature: options.temperature ?? 0.3,
          maxOutputTokens: options.maxOutputTokens ?? 8192,
        },
      };

      if (options.systemPrompt) {
        payload.systemInstruction = {
          parts: [{ text: options.systemPrompt }],
        };
      }

      if (options.jsonMode) {
        payload.generationConfig.responseMimeType = "application/json";
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.warn(`Gemini API Error for model ${model}:`, response.status, errorBody);

        if (response.status === 404) {
          // Model deprecated or not found, try next candidate
          continue;
        }

        if (response.status === 429) {
          throw new Error("AI so‘rov limiti tugagan. Iltimos, bir ozdan so‘ng qayta urinib ko‘ring.");
        }
        if (response.status === 400 || response.status === 403) {
          throw new Error("AI API kaliti yaroqsiz yoki noto‘g‘ri sozlangan.");
        }
        throw new Error(`AI xizmatiga ulanib bo‘lmadi (Status: ${response.status}).`);
      }

      const result = await response.json();
      const rawText =
        result?.candidates?.[0]?.content?.parts?.[0]?.text ||
        result?.candidates?.[0]?.text ||
        "";

      if (!rawText) {
        throw new Error("AI bo‘sh javob qaytardi.");
      }

      return rawText.trim();
    } catch (err: any) {
      lastError = err;
      if (err.message && (err.message.includes("limiti") || err.message.includes("kaliti"))) {
        throw err;
      }
    }
  }

  throw lastError || new Error("AI xizmatiga ulanishda xatolik yuz berdi.");
}

/**
 * OpenAI / OpenAI-compatible API execution (Groq, OpenRouter, DeepSeek, etc.)
 */
async function callOpenAICompatibleAPI(
  config: AIProviderConfig,
  options: CallAIOptions,
  signal: AbortSignal
): Promise<string> {
  const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const payload: any = {
    model: config.model || "gpt-4o-mini",
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.userPrompt },
    ],
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxOutputTokens ?? 4096,
  };

  if (options.jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("OpenAI API Error:", response.status, errorBody);

    if (response.status === 429) {
      throw new Error("AI so‘rov limiti tugagan. Bir ozdan so‘ng qayta urinib ko‘ring.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("AI API kaliti yaroqsiz.");
    }
    throw new Error(`AI xizmatiga ulanib bo‘lmadi (Status: ${response.status}).`);
  }

  const result = await response.json();
  const rawText = result?.choices?.[0]?.message?.content || "";

  if (!rawText) {
    throw new Error("AI bo‘sh javob qaytardi.");
  }

  return rawText.trim();
}

export interface CallAIMultimodalFileOptions {
  systemPrompt?: string;
  userPrompt: string;
  fileBuffer: Buffer;
  mimeType: string;
  temperature?: number;
  maxOutputTokens?: number;
  jsonMode?: boolean;
}

/**
 * Execute Gemini Multimodal document reading (PDF, Images, etc.)
 */
export async function callGeminiMultimodalFile(
  options: CallAIMultimodalFileOptions
): Promise<string> {
  const config = getAIConfig();
  if (!config.isConfigured || !config.apiKey) {
    throw new Error("AI xizmati sozlanmagan.");
  }

  const model = config.model || "gemini-3.6-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  const base64Data = options.fileBuffer.toString("base64");

  const payload: any = {
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: options.mimeType,
              data: base64Data,
            },
          },
          {
            text: options.userPrompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.1,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
    },
  };

  if (options.systemPrompt) {
    payload.systemInstruction = {
      parts: [{ text: options.systemPrompt }],
    };
  }

  if (options.jsonMode) {
    payload.generationConfig.responseMimeType = "application/json";
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Gemini Multimodal API Error:", response.status, errorBody);
    throw new Error(`Gemini Multimodal xatosi: ${response.status}`);
  }

  const result = await response.json();
  const rawText =
    result?.candidates?.[0]?.content?.parts?.[0]?.text ||
    result?.candidates?.[0]?.text ||
    "";

  if (!rawText) {
    throw new Error("AI bo‘sh javob qaytardi.");
  }

  return rawText.trim();
}
