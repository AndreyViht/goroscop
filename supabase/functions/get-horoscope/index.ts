// FIX: Manually declare Deno types because the checker environment cannot resolve the remote type definitions.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response> | Response): {
    shutdown: () => Promise<void>;
  };
};
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI, Modality } from 'https://esm.sh/@google/genai@0.14.0';

// --- CONFIGURATION ---
// Gemini API Key should be set in Supabase Edge Function secrets
const ai = new GoogleGenAI({ apiKey: Deno.env.get('API_KEY')! });
const PERIODS = ['Вчера', 'Сегодня', 'Завтра', 'Неделю', 'Год'];
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- HELPER: GEMINI CONTENT GENERATION ---
async function generateSingleHoroscope(sign: string, period: string) {
  console.log(`Generating horoscope for ${sign} - ${period}...`);
  try {
    const textPrompt = `Создай подробный, проницательный и вдохновляющий гороскоп для знака зодиака ${sign} на ${period}, используя астрологические данные и текущие планетарные транзиты. Гороскоп должен быть хорошо структурирован и легко читаем. Добавь релевантные смайлики для атмосферы. Сначала предоставь краткую, интригующую сводку (2-3 предложения), а затем развернутое предсказание (минимум 4 абзаца), охватывающее ключевые сферы жизни: любовь, карьера, здоровье. Раздели краткое и подробное описание тремя вертикальными чертами '|||'.`;
    const imagePrompt = `Фэнтези-арт, символизирующий гороскоп для знака ${sign} на ${period}. Мистический, космический стиль, высокое разрешение. Например: "Мистический баран с рогами из звезд, стоящий на космическом облаке, символизирующий Овна."`;

    const [textResponse, imageGenResponse] = await Promise.all([
      ai.models.generateContent({ model: 'gemini-2.5-flash', contents: textPrompt, config: { tools: [{ googleSearch: {} }] } }),
      ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts: [{ text: imagePrompt }] }, config: { responseModalities: [Modality.IMAGE] } })
    ]);

    const sources = textResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map(chunk => chunk.web)
      .filter((web): web is { uri: string; title: string } => !!(web?.uri && web.title)) || [];
      
    let image_base64 = '';
    const imagePart = imageGenResponse.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart?.inlineData) {
        image_base64 = `data:image/png;base64,${imagePart.inlineData.data}`;
    }

    const [summary, details] = textResponse.text.split('|||').map(s => s.trim());
    
    return { zodiac_sign: sign, period, summary, details, image_base64, sources };
  } catch (error) {
    console.error(`Error generating for ${sign} - ${period}:`, error);
    return { zodiac_sign: sign, period, summary: 'Не удалось сгенерировать предсказание.', details: error.message, image_base64: '', sources: [] };
  }
}

// --- MAIN EDGE FUNCTION ---
Deno.serve(async (req) => {
  // CRITICAL FIX: Handle CORS preflight request immediately.
  // This must happen before any other processing, especially before trying to parse the body.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // Now that we've handled OPTIONS, we can safely parse the body for other request types.
    const { sign } = await req.json();
    if (!sign) {
      return new Response(JSON.stringify({ error: "Знак зодиака не указан" }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: existingHoroscopes, error: fetchError } = await supabaseAdmin
      .from('horoscopes')
      .select('*')
      .eq('zodiac_sign', sign);

    if (fetchError) throw fetchError;

    const existingPeriods = new Set(existingHoroscopes.map(h => h.period));
    const missingPeriods = PERIODS.filter(p => !existingPeriods.has(p));

    if (missingPeriods.length > 0) {
      console.log(`Missing periods for ${sign}: ${missingPeriods.join(', ')}`);
      const generationPromises = missingPeriods.map(period => generateSingleHoroscope(sign, period));
      const newHoroscopes = await Promise.all(generationPromises);

      if (newHoroscopes.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('horoscopes')
          .upsert(newHoroscopes);

        if (insertError) throw insertError;
      
        const allHoroscopes = [...existingHoroscopes, ...newHoroscopes];
        return new Response(JSON.stringify(allHoroscopes), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    return new Response(JSON.stringify(existingHoroscopes), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Critical error in Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});