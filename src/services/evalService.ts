import { evaluateContentWithAI } from './aiService';
// Optional: Azure Speech SDK WS path (better CORS behavior)
let SpeechSDK: any;
try {
  SpeechSDK = await import('microsoft-cognitiveservices-speech-sdk');
  try { console.log('🟢 [AZURE DEBUG] SDK loaded successfully'); } catch {}
} catch (e) {
  try { console.log('🟡 [AZURE DEBUG] SDK not available:', e); } catch {}
}

export type LangCode = 'ko' | 'zh';

export interface PronunciationScores {
  accuracy: number;
  fluency: number;
  prosody?: number;
  completeness?: number;
  source?: 'azure' | 'heuristic';
}

export interface ContentScores {
  accuracy: number;
  completeness: number;
  fluency: number;
  summary?: string;
  tips?: string;
  details?: string[];
}

export interface EvaluationResult {
  pronunciation?: PronunciationScores;
  content?: ContentScores;
  overall?: number;
}

function clamp100(n: any): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function languageToAzureLocale(lang: LangCode): string {
  return lang === 'zh' ? 'zh-CN' : 'ko-KR';
}

// Convert recorded audio (webm/ogg/opus) to WAV(PCM16, mono) for Azure SDK/REST compatibility
async function convertToWav(input: Blob): Promise<Blob> {
  try {
    if ((input.type || '').includes('wav')) return input;
    const arrayBuf = await input.arrayBuffer();
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const OfflineCtx = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (!AudioCtx || !OfflineCtx) return input; // environment does not support
    const ctx = new AudioCtx();
    const decoded: AudioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
    ctx.close?.();
    const channels = 1;
    const offline = new OfflineCtx(channels, decoded.length, decoded.sampleRate);
    const src = offline.createBufferSource();
    // Downmix to mono by averaging channels
    const mono = offline.createGain();
    src.buffer = decoded;
    src.connect(mono);
    mono.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    const ch = rendered.getChannelData(0);
    // Encode PCM16
    const pcm = new ArrayBuffer(ch.length * 2);
    const view = new DataView(pcm);
    let offset = 0;
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    // WAV header
    const header = new ArrayBuffer(44);
    const h = new DataView(header);
    const sampleRate = rendered.sampleRate;
    h.setUint32(0, 0x52494646, false); // 'RIFF'
    h.setUint32(4, 36 + pcm.byteLength, true);
    h.setUint32(8, 0x57415645, false); // 'WAVE'
    h.setUint32(12, 0x666d7420, false); // 'fmt '
    h.setUint32(16, 16, true); // PCM chunk size
    h.setUint16(20, 1, true); // PCM format
    h.setUint16(22, 1, true); // mono
    h.setUint32(24, sampleRate, true);
    h.setUint32(28, sampleRate * 2, true); // byte rate
    h.setUint16(32, 2, true); // block align
    h.setUint16(34, 16, true); // bits per sample
    h.setUint32(36, 0x64617461, false); // 'data'
    h.setUint32(40, pcm.byteLength, true);
    const wav = new Blob([header, pcm], { type: 'audio/wav' });
    try { console.debug('[Eval][Azure] WAV converted', { inType: input.type, outType: wav.type, samples: ch.length, sampleRate }); } catch {}
    return wav;
  } catch (e) {
    try { console.warn('[Eval][Azure] WAV convert failed, using original', e); } catch {}
    return input;
  }
}

async function tryAzurePronunciationAssessment(_audio: Blob, referenceText: string, language: LangCode): Promise<PronunciationScores | null> {
  const key = import.meta.env.VITE_AZURE_SPEECH_KEY as string | undefined;
  const region = import.meta.env.VITE_AZURE_SPEECH_REGION as string | undefined;
  if (!key || !region || !SpeechSDK) return null;
  try {
    console.log('🔵 [AZURE DEBUG] SDK microphone path');
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(key, region);
    speechConfig.speechRecognitionLanguage = languageToAzureLocale(language);
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const paConfig = new SpeechSDK.PronunciationAssessmentConfig(
      referenceText,
      SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
      SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
      true
    );
    paConfig.enableProsodyAssessment = true;
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    paConfig.applyTo(recognizer);
    const result: any = await new Promise((resolve) => {
      recognizer.recognizeOnceAsync((r: any) => resolve(r), (e: any) => resolve({ errorDetails: String(e || '') }));
    });
    try { recognizer.close(); } catch {}
    if (result?.errorDetails) throw new Error(result.errorDetails);
    const detailJson = result?.properties?.getProperty(SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult);
    const data = detailJson ? JSON.parse(detailJson) : {};
    const pa = data?.NBest?.[0]?.PronunciationAssessment || data?.PronunciationAssessment || {};
    return {
      accuracy: clamp100(pa?.AccuracyScore ?? pa?.Accuracy ?? 0),
      fluency: clamp100(pa?.FluencyScore ?? pa?.Fluency ?? 0),
      prosody: pa?.ProsodyScore != null ? clamp100(pa.ProsodyScore) : undefined,
      completeness: clamp100(pa?.CompletenessScore ?? pa?.Completeness ?? 0),
      source: 'azure',
    };
  } catch (e) {
    try { console.log('🔴 [AZURE DEBUG] SDK microphone path failed:', e); } catch {}
    return null;
  }
}

function heuristicPronunciationFromText(hypo: string, ref: string): PronunciationScores {
  const clean = (s: string) => (s || '').replace(/\s+/g, '').trim();
  const h = clean(hypo);
  const r = clean(ref);
  if (!h || !r) return { accuracy: 0, fluency: 0, prosody: 0, completeness: 0 };
  let match = 0;
  const len = Math.min(h.length, r.length);
  for (let i = 0; i < len; i++) if (h[i] === r[i]) match++;
  const acc = (match / r.length) * 100;
  const flu = Math.min(100, (h.length / Math.max(1, r.length)) * 100);
  return { accuracy: clamp100(acc), fluency: clamp100(flu * 0.9), prosody: clamp100(flu * 0.85), completeness: clamp100((h.length / r.length) * 100), source: 'heuristic' };
}

export async function evaluatePronunciation(audio: Blob | null, recognizedText: string, referenceText: string, language: LangCode): Promise<PronunciationScores> {
  try {
    console.log('🔵 [EVAL DEBUG] evaluatePronunciation called:', {
      hasAudio: !!audio,
      recognizedTextLength: (recognizedText || '').length,
      referenceTextLength: (referenceText || '').length,
      language,
    });
  } catch {}
  if (audio) {
    try { console.log('🔵 [EVAL DEBUG] Audio exists, calling Azure assessment'); } catch {}
    const azure = await tryAzurePronunciationAssessment(audio, referenceText, language);
    if (azure) return azure;
    try { console.log('🔴 [EVAL DEBUG] Azure failed, using heuristic'); } catch {}
  } else {
    try { console.log('🔴 [EVAL DEBUG] No audio, using heuristic'); } catch {}
  }
  return heuristicPronunciationFromText(recognizedText, referenceText);
}

export async function evaluateContent(recognizedText: string, referenceText: string, language: LangCode): Promise<ContentScores> {
  // Delegate to AI model
  const res = await evaluateContentWithAI({ reference: referenceText || '', hypothesis: recognizedText || '', language });
  const toScore = (raw: any): number => {
    if (raw == null) return 0;
    const s = String(raw).trim();
    // 85% -> 85
    if (/^\d+(?:\.\d+)?%$/.test(s)) return clamp100(parseFloat(s));
    // 85/100 -> 85
    const m = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*100$/);
    if (m) return clamp100(parseFloat(m[1]));
    // 0~1 -> scale to 0~100
    const n = Number(s);
    if (Number.isFinite(n)) {
      if (n > 0 && n <= 1) return clamp100(Math.round(n * 100));
      return clamp100(n);
    }
    return 0;
  };
  return {
    accuracy: toScore(res?.accuracy),
    completeness: toScore(res?.completeness ?? res?.coverage),
    fluency: toScore(res?.fluency ?? res?.context),
    summary: res?.summary || res?.comment,
    tips: res?.tips || res?.improvement,
    details: Array.isArray(res?.details) ? res.details : undefined,
  };
}

export function combineScores(p: PronunciationScores | undefined, c: ContentScores | undefined): number {
  if (!p && !c) return 0;
  const pAvg = p ? (p.accuracy * 0.5 + p.fluency * 0.3 + (p.prosody ?? p.fluency) * 0.2) : 0;
  const cAvg = c ? (c.accuracy * 0.6 + c.completeness * 0.25 + c.fluency * 0.15) : 0;
  if (p && c) return clamp100(pAvg * 0.5 + cAvg * 0.5);
  return clamp100(p ? pAvg : cAvg);
}


