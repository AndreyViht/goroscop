/// <reference types="https://esm.sh/@supabase/functions-js@2" />

import { GoogleGenAI, Modality } from 'https://esm.sh/@google/genai@0.14.0';

// --- CORS HEADERS ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- GEMINI SETUP ---
const API_KEY = Deno.env.get('API_KEY');
if (!API_KEY) {
  throw new Error("Missing API_KEY environment variable.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });
const textModel = 'gemini-2.5-flash';
const imageModel = 'gemini-2.5-flash-image';

// --- RETRY LOGIC ---
async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      // Check if it's a rate limit error (429)
      if (error.message.includes('429')) {
        const retryMatch = error.message.match(/Please retry in (\d+\.?\d*)/);
        const delay = retryMatch ? parseFloat(retryMatch[1]) + 1 : Math.pow(2, i);
        console.warn(`Rate limit exceeded. Retrying in ${delay} seconds... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(res => setTimeout(res, delay * 1000));
      } else {
        // For other errors, fail immediately
        throw error;
      }
    }
  }
  throw new Error(`Failed after ${maxRetries} attempts.`);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sign, period } = await req.json();

    if (!sign || !period) {
      return new Response(JSON.stringify({ error: 'Missing "sign" or "period"' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // --- TEXT GENERATION ---
    const textPrompt = `Создай подробный, проницательный и вдохновляющий гороскоп для знака зодиака ${sign} на ${period}, используя астрологические данные. Гороскоп должен быть хорошо структурирован. Добавь релевантные смайлики. Сначала предоставь краткую сводку (2-3 предложения), а затем развернутое предсказание (минимум БОЛЬШИХ 4 абзаца), ПРО карьеру, здоровье И ПРО БУДУЩЕЕ. Раздели краткое и подробное описание тремя вертикальными чертами '|||'.`;

    const textResponse = await fetchWithRetry(() => ai.models.generateContent({
      model: textModel,
      contents: textPrompt,
      config: { tools: [{ googleSearch: {} }] },
    }));
    
    const [summary, details] = textResponse.text.split('|||').map(s => s.trim());
    if (!summary || !details) {
      throw new Error("Generated text parsing failed. Separator '|||' not found.");
    }
    
    const sources = textResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map(chunk => chunk.web)
      .filter((web): web is { uri: string; title: string } => !!(web?.uri && web.title)) || [];

    // --- IMAGE GENERATION ---
    const imagePrompt = `Создай красивое и загадочное астрологическое изображение для знака зодиака ${sign}. Стиль: фэнтези-арт, космическая тематика, с символом знака ${sign}. Атмосфера должна соответствовать прогнозу: ${summary}.`;

    const imageResponse = await fetchWithRetry(() => ai.models.generateContent({
      model: imageModel,
      contents: { parts: [{ text: imagePrompt }] },
      config: { responseModalities: [Modality.IMAGE] },
    }));

    let image_base64: string | undefined = undefined;
    const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart?.inlineData) {
      image_base64 = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }

    // --- RESPONSE ---
    const payload = {
      period,
      summary,
      details,
      image_base64,
      sources,
      updated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
