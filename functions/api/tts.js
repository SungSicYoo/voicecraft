/**
 * Cloudflare Pages Function
 * POST /api/tts
 *
 * Environment variables (Cloudflare Dashboard → Settings → Variables):
 *   AZURE_TTS_KEY    — Azure Cognitive Services Speech API 키
 *   AZURE_REGION     — 리전 (예: koreacentral, eastasia, japaneast)
 */

const ALLOWED_VOICES = new Set([
  "ko-KR-SunHiNeural",
  "ko-KR-InJoonNeural",
  "ko-KR-BongJinNeural",
  "ko-KR-GookMinNeural",
  "ko-KR-JiMinNeural",
  "ko-KR-SeoHyeonNeural",
  "ko-KR-SoonBokNeural",
  "ko-KR-YuJinNeural",
  "en-US-JennyNeural",
  "en-US-GuyNeural",
  "ja-JP-NanamiNeural",
  "ja-JP-KeitaNeural",
  "zh-CN-XiaoxiaoNeural",
  "zh-CN-YunxiNeural",
]);

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSsml(text, voice, rate, pitch) {
  const lang = voice.split("-").slice(0, 2).join("-");
  const rateStr = rate >= 1 ? `+${Math.round((rate - 1) * 100)}%` : `-${Math.round((1 - rate) * 100)}%`;
  const pitchStr = pitch >= 1 ? `+${Math.round((pitch - 1) * 50)}%` : `-${Math.round((1 - pitch) * 50)}%`;

  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>
  <voice name='${voice}'>
    <prosody rate='${rateStr}' pitch='${pitchStr}'>
      ${escapeXml(text)}
    </prosody>
  </voice>
</speak>`;
}

export async function onRequestPost(context) {
  const { request, env } = context;

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

  const { text, voice = "ko-KR-SunHiNeural", rate = 1, pitch = 1 } = body;

  // Validation
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return new Response(JSON.stringify({ error: "텍스트가 비어있습니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (text.length > 10000) {
    return new Response(JSON.stringify({ error: "텍스트가 너무 깁니다. (최대 10,000자)" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (!ALLOWED_VOICES.has(voice)) {
    return new Response(JSON.stringify({ error: "허용되지 않은 음성입니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const apiKey = env.AZURE_TTS_KEY;
  const region = env.AZURE_REGION || "koreacentral";

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "서버 설정 오류: AZURE_TTS_KEY가 설정되지 않았습니다." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const ssml = buildSsml(text.trim(), voice, parseFloat(rate), parseFloat(pitch));

  let azureRes;
  try {
    azureRes = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-160kbitrate-mono-mp3",
          "User-Agent": "VoiceCraft/1.0",
        },
        body: ssml,
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Azure TTS 서버 연결 실패: " + e.message }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (!azureRes.ok) {
    const errText = await azureRes.text();
    return new Response(
      JSON.stringify({ error: `Azure TTS 오류 (${azureRes.status}): ${errText}` }),
      { status: azureRes.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const audioBuffer = await azureRes.arrayBuffer();

  return new Response(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": 'attachment; filename="speech.mp3"',
      "Cache-Control": "no-store",
      ...corsHeaders,
    },
  });
}

// OPTIONS preflight
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
