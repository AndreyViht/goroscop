/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Modality } from '@google/genai';

// --- SETUP ---
const ai = new GoogleGenAI({ apiKey: Deno.env.get('API_KEY')! });
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- HELPER FUNCTIONS ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateSingleHoroscope(sign: string, period: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempt ${i+1}: Generating horoscope for ${sign} - ${period}`);

      const textPrompt = `Создай подробный, проницательный и вдохновляющий гороскоп для знака зодиака ${sign} на ${period}, используя астрологические данные. Гороскоп должен быть хорошо структурирован. Добавь релевантные смайлики. Сначала предоставь краткую сводку (2-3 предложения), а затем развернутое предсказание (минимум 4 абзаца), охватывающее любовь, карьеру, здоровье. Раздели краткое и подробное описание тремя вертикальными чертами '|||'.`;
      
      const imagePrompt = `Fantasy art style, horoscope symbol for zodiac sign ${sign}, cosmic theme, magical, ethereal, vibrant colors, representing the period of '${period}'.`;

      const textPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: textPrompt,
        config: { tools: [{ googleSearch: {} }] },
      });

      const imagePromise = ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: imagePrompt }] },
          config: { responseModalities: [Modality.IMAGE] },
      });

      const [textResponse, imageGenResponse] = await Promise.all([textPromise, imagePromise]);
      
      const sources = textResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map(chunk => chunk.web)
        .filter((web): web is { uri: string; title: string } => !!(web?.uri && web.title)) || [];

      let imageUrl = '';
      const imagePart = imageGenResponse.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
      if (imagePart?.inlineData) {
        imageUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
      }

      const [summary, details] = textResponse.text.split('|||').map(s => s.trim());

      return { summary, details, imageUrl, sources };

    } catch (error: any) {
      console.error(`Error during generation attempt ${i+1}:`, error.message);
      if (error.message.includes('429')) {
        const retryDelayMatch = error.message.match(/Please retry in ([\d.]+)s/);
        const retryDelay = retryDelayMatch ? (parseFloat(retryDelayMatch[1]) + 2) * 1000 : 60000;
        
        if (i < retries - 1) {
          console.log(`Rate limit exceeded. Retrying in ${retryDelay / 1000} seconds...`);
          await sleep(retryDelay);
        } else {
          console.error("Max retries reached. Failing.");
          throw error;
        }
      } else {
        throw error;
      }
    }
  }
  throw new Error(`Failed to generate horoscope for ${sign} - ${period} after ${retries} retries.`);
}

// --- MAIN EDGE FUNCTION ---
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sign, period } = await req.json();
    if (!sign || !period) {
      throw new Error("Знак зодиака или период не указаны");
    }

    // 1. Check for cached data
    const { data: existingHoroscope, error: fetchError } = await supabaseAdmin
      .from('horoscopes')
      .select('*')
      .eq('zodiac_sign', sign)
      .eq('period', period)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Not Found", which is OK
      throw fetchError;
    }
    
    // 2. If cache exists, return it
    if (existingHoroscope) {
      console.log(`Cache hit for ${sign} - ${period}`);
      return new Response(JSON.stringify(existingHoroscope), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 3. If no cache, generate new data
    console.log(`Cache miss for ${sign} - ${period}. Generating...`);
    const newHoroscope = await generateSingleHoroscope(sign, period);

    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('horoscopes')
      .insert({
        zodiac_sign: sign,
        period: period,
        summary: newHoroscope.summary,
        details: newHoroscope.details,
        image_base64: newHoroscope.imageUrl,
        sources: newHoroscope.sources,
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('Error inserting into database:', insertError);
      throw insertError;
    }

    // 4. Return newly generated data
    return new Response(JSON.stringify(insertedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error('Main function error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
