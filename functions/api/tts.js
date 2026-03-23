/**
 * Cloudflare Pages Function
 * POST /api/tts
 * 
 * Uses Google Translate Free TTS (No API Key Required)
 */

export async function onRequestPost(context) {
  const { request } = context;

  // CORS preflight
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const { text, voice = "ko" } = body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return new Response(JSON.stringify({ error: "텍스트가 비어있습니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (text.length > 5000) {
    return new Response(JSON.stringify({ error: "텍스트가 너무 깁니다. (무료 API는 최대 5,000자 권장)" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const lang = voice; // e.g. "ko", "en", "ja"

  // Google TTS requires chunks of < 200 chars.
  const chunks = [];
  const words = text.split(/([,.\n?!]+)/);
  let currentChunk = "";

  for (const part of words) {
    if (!part.trim()) {
      currentChunk += part;
      continue;
    }
    if ((currentChunk + part).length > 180) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = part;
    } else {
      currentChunk += part;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  const audioBuffers = [];

  try {
    for (const chunk of chunks) {
      if (!chunk) continue;
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Referer": "https://translate.google.com/"
        }
      });
      if (!res.ok) {
        throw new Error(`Google TTS API 연동 오류 (${res.status})`);
      }
      const arrayBuffer = await res.arrayBuffer();
      audioBuffers.push(new Uint8Array(arrayBuffer));
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: "TTS 생성 실패: " + e.message }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  // Concatenate mp3 buffers
  const totalLength = audioBuffers.reduce((acc, val) => acc + val.length, 0);
  const resultBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of audioBuffers) {
    resultBuffer.set(buf, offset);
    offset += buf.length;
  }

  return new Response(resultBuffer.buffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": 'attachment; filename="speech.mp3"',
      "Cache-Control": "no-store",
      ...corsHeaders,
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
