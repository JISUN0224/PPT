/*
  ttsService.ts
  - Azure Speech Services REST TTS를 사용해 텍스트를 음성으로 합성합니다.
  - 환경변수: VITE_AZURE_SPEECH_KEY, VITE_AZURE_SPEECH_REGION
  - 반환: Blob URL과 길이(초)
*/

const AZURE_SPEECH_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY as string | undefined;
const AZURE_SPEECH_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION as string | undefined;

function ensureAzureConfig(): void {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    throw new Error('Azure Speech 설정이 없습니다. VITE_AZURE_SPEECH_KEY, VITE_AZURE_SPEECH_REGION를 .env에 설정하세요.');
  }
}

function getTtsEndpoint(): string {
  // See: https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech
  return `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
}

export const VOICE_OPTIONS: Record<'ko' | 'zh', Array<{ label: string; value: string; langTag: string }>> = {
  ko: [
    { label: 'SunHi (여)', value: 'ko-KR-SunHiNeural', langTag: 'ko-KR' },
    { label: 'InJoon (남)', value: 'ko-KR-InJoonNeural', langTag: 'ko-KR' },
    { label: 'BangSil (여)', value: 'ko-KR-BangSilNeural', langTag: 'ko-KR' },
  ],
  zh: [
    { label: 'Xiaoxiao (여)', value: 'zh-CN-XiaoxiaoNeural', langTag: 'zh-CN' },
    { label: 'Yunxi (남)', value: 'zh-CN-YunxiNeural', langTag: 'zh-CN' },
    { label: 'Xiaochen (여)', value: 'zh-CN-XiaochenNeural', langTag: 'zh-CN' },
  ],
};

export function getVoiceOptions(lang: 'ko' | 'zh') {
  return VOICE_OPTIONS[lang] ?? [];
}

function defaultVoiceFor(lang: 'ko' | 'zh'): { langTag: string; voiceName: string } {
  const list = VOICE_OPTIONS[lang] ?? [];
  const first = list[0] ?? (lang === 'zh'
    ? { label: 'Xiaoxiao (여)', value: 'zh-CN-XiaoxiaoNeural', langTag: 'zh-CN' }
    : { label: 'SunHi (여)', value: 'ko-KR-SunHiNeural', langTag: 'ko-KR' });
  return { langTag: first.langTag, voiceName: first.value };
}

function buildSsml(text: string, lang: 'ko' | 'zh', voiceName?: string): string {
  const { langTag, voiceName: fallbackVoice } = defaultVoiceFor(lang);
  const v = voiceName || fallbackVoice;
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?>
<speak version="1.0" xml:lang="${langTag}">
  <voice name="${v}">${escaped}</voice>
</speak>`;
}

async function decodeAudioDuration(blob: Blob): Promise<number> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0) as ArrayBuffer);
  return audioBuffer.duration;
}

export interface SynthesisResult {
  audioUrl: string;
  durationSec: number;
}

export async function textToSpeech(
  text: string,
  lang: 'ko' | 'zh',
  voiceName?: string
): Promise<SynthesisResult> {
  ensureAzureConfig();
  const ssml = buildSsml(text, lang, voiceName);

  const res = await fetch(getTtsEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ssml+xml',
      'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY!,
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'ai-ppt-generator',
    },
    body: ssml,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`TTS 합성 실패: ${res.status} ${res.statusText} - ${msg}`);
  }

  const blob = await res.blob();
  const audioUrl = URL.createObjectURL(blob);
  let durationSec = 0;
  try {
    durationSec = await decodeAudioDuration(blob);
  } catch {
    // 실패 시 대략치: 180 wpm -> 3 wps, 글자 수 기준 추정(한/중 4 chars ~ 1 word approx.)
    const approxWords = Math.max(1, Math.round(text.length / 4));
    durationSec = Math.round((approxWords / 3) + 1);
  }
  return { audioUrl, durationSec };
}

export async function synthesizeSlideAudio(slide: any, language: 'ko' | 'zh', voiceName?: string): Promise<SynthesisResult | null> {
  const text = language === 'ko'
    ? (slide?.koreanScript || slide?.content || slide?.title)
    : (slide?.chineseScript || slide?.interpretation || slide?.content || slide?.title);
  if (!text) return null;
  try {
    return await textToSpeech(text, language, voiceName);
  } catch (err) {
    try { console.warn('[TTS] primary voice failed, falling back to default', { language, voiceName, err }); } catch {}
    // Fallback: 기본 음성으로 재시도
    try {
      return await textToSpeech(text, language, undefined);
    } catch (err2) {
      try { console.error('[TTS] fallback voice also failed', { language, err2 }); } catch {}
      return null;
    }
  }
}

export async function synthesizePPT(pptData: { slides: any[] }, language: 'ko' | 'zh'):
  Promise<{ perSlide: Record<number, SynthesisResult | null>; totalDurationSec: number }>
{
  const perSlide: Record<number, SynthesisResult | null> = {};
  let total = 0;
  for (const slide of pptData.slides || []) {
    try {
      const result = await synthesizeSlideAudio(slide, language);
      perSlide[slide.slideNumber] = result;
      if (result) total += result.durationSec;
    } catch {
      perSlide[slide.slideNumber] = null;
    }
  }
  return { perSlide, totalDurationSec: total };
}