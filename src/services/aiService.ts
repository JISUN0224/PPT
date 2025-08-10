/*
  aiService.ts
  - Google Generative Language API (Gemini) 호출로 PPT JSON 생성
  - 환경변수: VITE_GEMINI_API_KEY, VITE_GEMINI_MODEL (옵션)
  - 외부 라이브러리 없이 fetch 사용
*/

import type { GeneratePPTParams } from '../types';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { getTemplateSequence, bindTemplateData } from '../utils/htmlTemplates';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL_NAME = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || 'gemini-2.5-flash';
const API_ENDPOINT_BASE = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

function logAI(...args: any[]) {
  try { console.log('[AI]', ...args); } catch {}
}
function logAIError(...args: any[]) {
  try { console.error('[AI]', ...args); } catch {}
}

function ensureApiKeyPresent(): void {
  if (!API_KEY) {
    throw new Error('환경변수 VITE_GEMINI_API_KEY 가 설정되어 있지 않습니다. .env 파일을 확인하세요.');
  }
}

function getMaxTokens(slideCount: number): number {
  if (slideCount <= 3) return 4096;
  if (slideCount <= 5) return 6144;
  if (slideCount <= 8) return 8192;
  return 12288;
}

function limitChars(s?: string, max = 160): string | undefined {
  if (!s) return s;
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.endsWith(' ') ? cut.trimEnd() + '…' : cut + '…';
}

function ensureTerminalPunctuation(text: string, language: 'ko' | 'zh'): string {
  let t = (text || '').trim();
  // 말줄임/불완전 종결 제거
  t = t.replace(/[…]+$/g, '').replace(/\.{3,}$/g, '').trim();
  if (language === 'ko') {
    if (!(/[\.!?]$/.test(t))) t = t + '.';
  } else {
    if (!(/[。！？]$/.test(t))) t = t + '。';
  }
  return t;
}

function trimToCompleteSentence(text: string, max: number, language: 'ko' | 'zh'): string {
  let t = (text || '').trim();
  if (t.length <= max) return ensureTerminalPunctuation(t, language);
  const slice = t.slice(0, max);
  const pattern = language === 'ko' ? /[\.!?]/g : /[。！？]/g;
  let lastIndex = -1;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(slice)) !== null) lastIndex = m.index;
  if (lastIndex !== -1) {
    return ensureTerminalPunctuation(slice.slice(0, lastIndex + 1), language);
  }
  return ensureTerminalPunctuation(slice, language);
}

function generateDefaultChartData(topic: string) {
  const lower = topic.toLowerCase();
  if (lower.includes('온난화') || lower.includes('warming')) {
    return {
      labels: ['1990', '2000', '2010', '2020'],
      datasets: [{ label: '평균 기온 상승(℃)', data: [0.2, 0.4, 0.8, 1.2] }],
    };
  }
  if (lower.includes('ai') || lower.includes('인공지능')) {
    return {
      labels: ['2019', '2020', '2021', '2022'],
      datasets: [{ label: '시장 규모(지수)', data: [60, 75, 95, 130] }],
    };
  }
  return {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [{ label: '지표', data: [30, 45, 40, 55] }],
  };
}

// legacy ensureChartSlide removed (template-based generation adds charts explicitly)

// 간소화된 메인 프롬프트
function buildPrompt(params: {
  topic: string;
  details?: string;
  style: 'business' | 'academic' | 'creative' | 'technical';
  slideCount: number;
  language: 'ko' | 'zh';
}): string {
  const { topic, details = '', style, slideCount, language } = params;
  const languageName = language === 'ko' ? '한국어' : '중국어(간체)';
  const scriptField = language === 'ko' ? 'koreanScript' : 'chineseScript';
  void details;

  return `전문 PPT를 생성하세요. JSON만 반환.

주제: "${topic}" · 스타일: ${style} · 슬라이드: ${slideCount}장 · 언어: ${languageName}

필수 요구사항:
- 최소 1개 이상의 chart 슬라이드 포함(type="chart")
- chart 슬라이드에는 반드시 chartType(bar|line|doughnut|scatter)과 chartData 포함
- chartData.labels 3~5개, datasets[0].data 3~5개 숫자
- 결론 슬라이드에 stats 2~3개 권장
- 각 슬라이드에 ${scriptField}(80~160자), interpretation(80~160자) 포함
- layoutVariant / accentColor 포함, 색상 코드는 넣지 않음

스키마 요약:
{"title":string,"slides":[{"slideNumber":number,"type":"title|content|chart|comparison|conclusion","title":string,"subtitle"?:string,"content"?:string,"points"?:string[],"chartType"?:"bar|line|doughnut|scatter","chartData"?:{"labels":string[],"datasets":[{"label":string,"data":number[]}]},"stats"?:[{"value":string,"label":string}],"${scriptField}":string,"interpretation":string,"layoutVariant":string,"accentColor":"green|blue|gold|default"}]} `;
}
void buildPrompt;

// 더 압축된 폴백 프롬프트
function buildCompactPrompt(params: {
  topic: string;
  details?: string;
  style: string;
  slideCount: number;
  language: 'ko' | 'zh';
}): string {
  const { topic, details = '', style, slideCount, language } = params;
  const scriptField = language === 'ko' ? 'koreanScript' : 'chineseScript';
  void details;
  return `JSON ONLY. Topic=\"${topic}\" Style=${style} Slides=${slideCount} Language=${language}.
- Include at least one chart slide with chartType and chartData(labels 3-5, data 3-5).
Schema:{title,slides:[{slideNumber,type,title,subtitle?,content?,points?,chartType?,chartData?,stats?,${scriptField}(80-160),interpretation(80-160),layoutVariant,accentColor}]}`;
}
void buildCompactPrompt;

async function callGemini(prompt: string, model: string, generationConfig: any): Promise<any> {
  const endpoint = `${API_ENDPOINT_BASE(model)}?key=${API_KEY ?? ''}`;
  logAI('Request Gemini', { model, endpoint });
  logAI('Prompt Preview', prompt.slice(0, 800));

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig }),
  });

  logAI('Response status', res.status, res.statusText);
  if (!res.ok) {
    const t = await res.text();
    logAIError('Error body', t.slice(0, 2000));
    throw new Error(`Gemini API 오류: ${res.status} ${res.statusText} - ${t}`);
  }
  const data = await res.json();
  logAI('Raw keys', Object.keys(data || {}));
  const um = data?.usageMetadata;
  if (um) logAI('Tokens', { prompt: um.promptTokenCount, total: um.totalTokenCount, thoughts: um.thoughtsTokenCount });
  // Deep debug for response structure (safe/truncated)
  try {
    (window as any).lastGeminiResponse = data;
    const candidatesLen = Array.isArray(data?.candidates) ? data.candidates.length : 0;
    const first = data?.candidates?.[0];
    const finish = first?.finishReason;
    const parts = first?.content?.parts;
    const firstText = Array.isArray(parts)
      ? (parts.map((p: any) => p?.text).filter(Boolean).join(' | ') || '')
      : '';
    console.log('=== GEMINI DEBUG ===');
    console.log('[Gemini] candidates length:', candidatesLen);
    console.log('[Gemini] first finishReason:', finish);
    console.log('[Gemini] first parts len:', Array.isArray(parts) ? parts.length : 'n/a');
    if (firstText) console.log('[Gemini] first text (joined, truncated):', String(firstText).slice(0, 500));
    const truncated = JSON.stringify(data).slice(0, 2000);
    console.log('[Gemini] full response (truncated 2k):', truncated);
  } catch {}
  return data;
}

function extractJsonString(text: string): string {
  if (!text) return text;
  
  // 1) Normalize and strip zero width chars
  let t = text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  
  // 2) If it's already valid JSON, return as-is
  try {
    JSON.parse(t);
    return t;
  } catch {}
  
  // 3) Remove common AI model prefixes/suffixes
  t = t.replace(/^.*?(?=\{)/s, '').replace(/(?<=\}).*$/s, '').trim();
  if (t) {
    try {
      JSON.parse(t);
      return t;
    } catch {}
  }
  
  // 4) Fenced code block ```json ... ``` or ``` ... ```
  const fenced = text.match(/```\s*(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (fenced && fenced[1]) {
    const block = fenced[1].trim();
    try { 
      JSON.parse(block); 
      return block; 
    } catch {}
  }
  
  // 5) Look for JSON object with balanced braces
  const jsonMatches = text.match(/\{[\s\S]*\}/g);
  if (jsonMatches) {
    for (const match of jsonMatches) {
      try {
        JSON.parse(match);
        return match;
      } catch {}
    }
  }
  
  // 6) Scan for first balanced JSON object or array
  const startIdxCandidates: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{' || ch === '[') { startIdxCandidates.push(i); break; }
  }
  
  if (startIdxCandidates.length > 0) {
    const start = startIdxCandidates[0];
    let depth = 0;
    let inString = false;
    let escape = false;
    let end = -1;
    const opener = text[start];
    const closer = opener === '{' ? '}' : ']';
    
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escape) { escape = false; }
        else if (ch === '\\') { escape = true; }
        else if (ch === '"') { inString = false; }
      } else {
        if (ch === '"') inString = true;
        else if (ch === opener) depth++;
        else if (ch === closer) {
          depth--;
          if (depth === 0) { end = i + 1; break; }
        }
      }
    }
    
    if (end !== -1) {
      const candidate = text.slice(start, end).trim();
      try { 
        JSON.parse(candidate); 
        return candidate; 
      } catch {}
    }
  }
  
  // 7) Last resort: slice between first { and last }
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    const slice = text.slice(first, last + 1).trim();
    try { 
      JSON.parse(slice); 
      return slice; 
    } catch {}
  }
  
  return text;
}

function clampSlideCount(n: number): number {
  if (Number.isNaN(n)) return 2;
  if (n < 2) return 2;
  if (n > 6) return 6;
  return n;
}

function normalizePPT(ppt: any, requestedCount: number): any {
  const targetCount = clampSlideCount(requestedCount);
  if (!ppt || typeof ppt !== 'object') return ppt;
  if (!Array.isArray(ppt.slides)) { ppt.slides = []; }
  ppt.slides = ppt.slides.slice(0, targetCount).map((s: any, idx: number) => ({
    slideNumber: idx + 1,
    type: s?.type ?? (idx === 0 ? 'title' : idx === targetCount - 1 ? 'conclusion' : 'content'),
    title: s?.title ?? `슬라이드 ${idx + 1}`,
    subtitle: s?.subtitle,
    content: s?.content,
    points: Array.isArray(s?.points) ? s.points : undefined,
    chartType: s?.chartType,
    chartData: s?.chartData,
    stats: Array.isArray(s?.stats) ? s.stats : undefined,
    layoutVariant: typeof s?.layoutVariant === 'string' ? s.layoutVariant : undefined,
    accentColor: ((): 'green' | 'blue' | 'gold' | 'default' | undefined => {
      const v = s?.accentColor; return v === 'green' || v === 'blue' || v === 'gold' || v === 'default' ? v : undefined;
    })(),
    koreanScript: limitChars(typeof s?.koreanScript === 'string' ? s.koreanScript : undefined, 160),
    chineseScript: limitChars(typeof s?.chineseScript === 'string' ? s.chineseScript : undefined, 160),
    interpretation: limitChars(typeof s?.interpretation === 'string' ? s.interpretation : undefined, 160),
    audioStartTime: typeof s?.audioStartTime === 'number' ? s.audioStartTime : undefined,
    audioEndTime: typeof s?.audioEndTime === 'number' ? s.audioEndTime : undefined,
    html: typeof s?.html === 'string' ? s.html : undefined,
  }));
  // 스타일 기반 기본 accentColor 보정
  const inferredAccent = defaultAccentForStyle((ppt?.style as any) || 'business');
  ppt.slides = ppt.slides.map((sl: any) => ({
    ...sl,
    accentColor: sl.accentColor || inferredAccent,
  }));
  while (ppt.slides.length < targetCount) {
    const i = ppt.slides.length + 1;
    ppt.slides.push({ slideNumber: i, type: i === targetCount ? 'conclusion' : 'content', title: i === 1 ? ppt.title || '프레젠테이션' : `슬라이드 ${i}`, content: i === targetCount ? '핵심 요약' : '내용을 요약하여 제공합니다.' });
  }
  ppt.title = ppt.title || 'AI 생성 프레젠테이션';
  return ppt;
}

// ====== 2단계 분할 생성: 구조/스크립트 분리 ======

type GeneratePPTParamsLocal = {
  topic: string;
  details?: string;
  style: 'business' | 'academic' | 'creative' | 'technical';
  slideCount: number;
  language: 'ko' | 'zh';
};

function defaultAccentForStyle(style: GeneratePPTParamsLocal['style']): 'green' | 'blue' | 'gold' | 'default' {
  switch (style) {
    case 'business':
      return 'green';
    case 'academic':
    case 'technical':
      return 'blue';
    case 'creative':
      return 'gold';
    default:
      return 'default';
  }
}

function buildStructurePrompt(params: GeneratePPTParamsLocal): string {
  const { topic, details = '', style, slideCount, language } = params;
  return `프레젠테이션의 시각적 구조만 설계하세요. 순수 JSON 객체만 반환(백틱/설명 금지).

📋 기본 요구사항
- 주제: "${topic}"
- 추가 정보: "${details}"
- 스타일: ${style}
- 총 슬라이드: ${slideCount}장
- 언어: ${language}

🎨 슬라이드 구성 전략
- 첫 번째 슬라이드: 반드시 type "title"
- 중간 슬라이드: type "content" | "chart" | "comparison" 혼합
- 마지막 슬라이드: 반드시 type "conclusion"
- 모든 슬라이드에 16:9 기준의 전문적인 레이아웃을 위한 HTML 문자열 포함
- HTML에는 가시 텍스트 요소를 최소 1개 이상 포함: h1/h2, p, ul, li
- 인라인 스타일 금지. 클래스만 사용(luxe-card, luxe-grid 등)
- 최소 1개 이상 chart 슬라이드 포함. chart 영역은 <div class="chart-area"></div>로 표현
- 레이아웃 다양화: title(center|left|background), content(list|card|timeline), chart(center|split-lr|split-tb|fullscreen), conclusion(grid|vertical)
- 색상 코드는 직접 쓰지 말고 class로 표현. 우리 시스템의 클래스(luxe-card 등) 최대 활용
 - 각 슬라이드는 accentColor(green|blue|gold|default)를 포함. 스타일 ${style}에 어울리도록 일관된 톤으로 배치(예: business→green, academic/technical→blue, creative→gold).

참고 예시(복사 금지, 패턴만 참조):
[Title - center]
<div class="h-full flex items-center justify-center text-center p-12">
  <div class="luxe-card p-8">
    <h1 class="text-5xl font-display">{{title}}</h1>
    <p class="mt-3 text-lg">{{subtitle}}</p>
  </div>
</div>

[Content - list]
<div class="p-10">
  <h2 class="text-3xl font-display mb-6">{{title}}</h2>
  <ul class="space-y-3 list-disc list-inside">
    <li>{{point1}}</li><li>{{point2}}</li><li>{{point3}}</li>
  </ul>
</div>

[Chart - center]
<div class="p-10">
  <h2 class="text-3xl font-display mb-6">{{title}}</h2>
  <div class="luxe-card p-6">
    <div class="chart-area h-64"></div>
    <p class="mt-3 text-sm text-gray-500">{{chartNote}}</p>
  </div>
</div>

[Conclusion - grid]
<div class="p-10">
  <h2 class="text-3xl font-display mb-6">{{title}}</h2>
  <div class="grid grid-cols-3 gap-6">
    <div class="luxe-card p-6 text-center"><div class="text-3xl font-bold">{{stat1Value}}</div><div class="text-sm">{{stat1Label}}</div></div>
    <div class="luxe-card p-6 text-center"><div class="text-3xl font-bold">{{stat2Value}}</div><div class="text-sm">{{stat2Label}}</div></div>
    <div class="luxe-card p-6 text-center"><div class="text-3xl font-bold">{{stat3Value}}</div><div class="text-sm">{{stat3Label}}</div></div>
  </div>
  <p class="mt-4">{{closing}}</p>
</div>

반드시 다음 스키마만 따르세요:
{ "title": string, "slides": [
 { "slideNumber": number, "type": "title|content|chart|comparison|conclusion",
   "title": string, "subtitle"?: string, "points"?: string[],
   "chartType"?: "bar|line|doughnut|scatter", "chartData"?: { "labels": string[], "datasets": [{ "label": string, "data": number[] }] },
   "stats"?: [{ "value": string, "label": string }],
   "layoutVariant": string, "accentColor": "green|blue|gold|default",
   "html": string }
] }`;
}

function buildStructureCompactPrompt(params: GeneratePPTParamsLocal): string {
  const { topic, slideCount } = params;
  return `JSON ONLY. Return a pure JSON object. No backticks, no prose.
- Each slide must include non-empty html with visible text (h1/h2, p, ul/li). No inline styles.
- Include at least one chart slide container like <div class=\"chart-area h-64\"></div>
{ "title": "${topic}", "slides": [
 {"slideNumber": 1, "type": "title", "title": "${topic}", "layoutVariant": "center", "accentColor": "default", "html": "<div class=\"p-8 text-center\"><h1 class=\"text-4xl\">{{title}}</h1><p class=\"mt-2\">{{subtitle}}</p></div>"}
]}
Slides=${slideCount}`;
}

function countEmptyHtmlSlides(structure: any): number {
  if (!structure || !Array.isArray(structure.slides)) return 0;
  return structure.slides.reduce((acc: number, s: any) => acc + (typeof s?.html === 'string' && s.html.trim().length > 0 ? 0 : 1), 0);
}

function htmlLiCount(html?: string): number {
  if (!html) return 0;
  const matches = html.match(/<li\b[\s\S]*?>[\s\S]*?<\/li>/gi);
  return Array.isArray(matches) ? matches.length : 0;
}

function hasGrid(html?: string): boolean {
  return typeof html === 'string' && /\bgrid\b/.test(html);
}

function hasChartArea(html?: string): boolean {
  return typeof html === 'string' && /chart-area/.test(html);
}

function isWeakHtml(html?: string): boolean {
  if (!html) return true;
  const lenOk = html.replace(/\s+/g, ' ').trim().length >= 120;
  const listCount = htmlLiCount(html);
  const visual = hasChartArea(html) || hasGrid(html) || listCount >= 3;
  return !(lenOk && visual);
}

function isVisualHtml(html?: string): boolean {
  if (!html) return false;
  return hasChartArea(html) || hasGrid(html) || htmlLiCount(html) >= 3;
}

function buildListHtmlFromPoints(title: string, points?: string[]): string {
  const safeTitle = title || '핵심 요약';
  const items = (points && points.length > 0 ? points : ['핵심 포인트 1', '핵심 포인트 2', '핵심 포인트 3']).slice(0, 6);
  const lis = items.map((p) => `<li>${p}</li>`).join('');
  return `<div class="p-10"><h2 class="text-3xl font-display mb-6">${safeTitle}</h2><ul class="space-y-3 list-disc list-inside">${lis}</ul></div>`;
}

function buildStatsGridHtml(title: string, stats?: Array<{ value: string; label: string }>): string {
  const safeTitle = title || '핵심 지표';
  const s = (Array.isArray(stats) && stats.length > 0
    ? stats
    : [
        { value: '75%', label: '달성률' },
        { value: '3년', label: '예상 기간' },
        { value: 'TOP3', label: '우선 순위' },
      ]).slice(0, 3);
  const cards = s
    .map((x) => `<div class="luxe-card p-6 text-center"><div class="text-3xl font-bold">${x.value}</div><div class="text-sm">${x.label}</div></div>`) 
    .join('');
  return `<div class="p-10"><h2 class="text-3xl font-display mb-6">${safeTitle}</h2><div class="grid grid-cols-3 gap-6">${cards}</div></div>`;
}

function buildComparisonGridHtml(title: string, points?: string[]): string {
  const safeTitle = title || '비교 분석';
  const items = (points && points.length > 0 ? points : ['항목 A 강점', '항목 A 약점', '항목 B 강점', '항목 B 약점']).slice(0, 6);
  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid).map((p) => `<li>${p}</li>`).join('');
  const right = items.slice(mid).map((p) => `<li>${p}</li>`).join('');
  return `<div class="p-10"><h2 class="text-3xl font-display mb-6">${safeTitle}</h2><div class="grid grid-cols-2 gap-6"><div class="luxe-card p-6"><h3 class="font-semibold mb-3">옵션 A</h3><ul class="list-disc list-inside space-y-2">${left}</ul></div><div class="luxe-card p-6"><h3 class="font-semibold mb-3">옵션 B</h3><ul class="list-disc list-inside space-y-2">${right}</ul></div></div></div>`;
}

function autoEnhanceHtmlForSlide(slide: any): string {
  const type = slide?.type || 'content';
  if (type === 'chart') {
    // 보수적으로 차트 영역을 추가
    const title = slide?.title || '데이터 분석';
    return `<div class="p-10"><h2 class="text-3xl font-display mb-6">${title}</h2><div class="luxe-card p-6"><div class="chart-area h-64"></div><p class="mt-3 text-sm text-gray-500">데이터 시각화</p></div></div>`;
  }
  if (type === 'conclusion') {
    return buildStatsGridHtml(slide?.title, slide?.stats);
  }
  if (type === 'comparison') {
    return buildComparisonGridHtml(slide?.title, slide?.points);
  }
  // 기본 content
  return buildListHtmlFromPoints(slide?.title, slide?.points);
}

function ensureVisualDensity(structure: any, slideCount: number): any {
  if (!structure || !Array.isArray(structure.slides)) return structure;
  // 1) 약한 HTML 보강
  structure.slides = structure.slides.map((s: any) => {
    // 제목 슬라이드는 보강 대상에서 제외 (도입부 단정한 구성이면 충분)
    if (s?.type === 'title') return s;
    if (isWeakHtml(s?.html)) {
      const enhanced = autoEnhanceHtmlForSlide(s);
      return { ...s, html: enhanced };
    }
    return s;
  });
  // 2) 비주얼 비율 확보(목표 60%)
  const target = Math.max(1, Math.ceil(slideCount * 0.6));
  let visualCount = structure.slides.reduce((acc: number, s: any) => acc + (isVisualHtml(s?.html) ? 1 : 0), 0);
  if (visualCount >= target) return structure;
  for (let i = 0; i < structure.slides.length && visualCount < target; i++) {
    const s = structure.slides[i];
    if (s?.type === 'title' || s?.type === 'chart') continue;
    if (!isVisualHtml(s?.html)) {
      const enhanced = autoEnhanceHtmlForSlide(s);
      structure.slides[i] = { ...s, html: enhanced };
      visualCount++;
    }
  }
  return structure;
}

export async function generatePPTStructure(params: GeneratePPTParamsLocal): Promise<any> {
  ensureApiKeyPresent();
  const prompt = buildStructurePrompt(params);
  let data = await callGemini(prompt, MODEL_NAME, {
    temperature: 0.6,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: getMaxTokens(params.slideCount),
    responseMimeType: 'application/json',
  });
  let text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('구조 생성 응답이 비어 있습니다.');
  let parsed = JSON.parse(extractJsonString(text));
  parsed = normalizePPT(parsed, params.slideCount);

  const emptyCount = countEmptyHtmlSlides(parsed);
  logAI('Structure html empty count', emptyCount);

  if (emptyCount > 0) {
    logAI('Structure fallback: compact prompt due to empty html');
    const compact = buildStructureCompactPrompt(params);
    data = await callGemini(compact, MODEL_NAME, {
      temperature: 0.55,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: getMaxTokens(params.slideCount),
      responseMimeType: 'application/json',
    });
    text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (text) {
      let parsed2 = JSON.parse(extractJsonString(text));
      parsed2 = normalizePPT(parsed2, params.slideCount);
      const merged = { ...parsed };
      merged.slides = merged.slides.map((s: any, i: number) => {
        const t = parsed2.slides?.[i];
        if (!s.html && t?.html) return { ...s, html: t.html };
        return s;
      });
      parsed = merged;
    }
  }

  // 품질 게이트: 약한 HTML 보강 및 비주얼 비율 확보
  parsed = ensureVisualDensity(parsed, params.slideCount);

  return parsed;
}

export async function generatePPTScripts(args: { structure: any; topic: string; language: 'ko' | 'zh' }): Promise<any> {
  ensureApiKeyPresent();
  // 슬라이드 컨텍스트 요약 생성
  const slides = Array.isArray(args.structure?.slides) ? args.structure.slides : [];
  const slideContexts = slides.map((s: any) => {
    const summary: any = {
      slideNumber: Number(s?.slideNumber) || 0,
      type: s?.type || 'content',
      title: s?.title || '',
    };
    if (Array.isArray(s?.points) && s.points.length > 0) summary.points = s.points.slice(0, 6);
    if (Array.isArray(s?.stats) && s.stats.length > 0) summary.stats = s.stats.slice(0, 3);
    if (s?.chartType) summary.chartType = s.chartType;
    const labels = s?.chartData?.labels;
    if (Array.isArray(labels) && labels.length > 0) summary.chartLabels = labels.slice(0, 5);
    return summary;
  });

  const targetLang = args.language === 'ko' ? '한국어' : '중국어(간체)';
  const primaryField = args.language === 'ko' ? 'koreanScript' : 'chineseScript';
  const oppositeLang = args.language === 'ko' ? '중국어(간체)' : '한국어';

  const prompt = `아래 슬라이드 컨텍스트를 반영하여 발표 스크립트를 생성하세요. 순수 JSON만 반환.
- 주제: "${args.topic}", 언어: ${targetLang}
- 각 슬라이드당 ${primaryField} 80~160자, interpretation(${oppositeLang}) 80~160자.
- 반드시 해당 슬라이드의 type/title/points/stats/chart 정보를 반영. 숫자 나열은 피하고 핵심 메시지를 요약.
 - 각 텍스트는 완결된 문장으로 끝맺으세요(ko: "." 권장, zh: "。" 권장).

작성 가이드(타입별):
- title: 발표 도입부 톤으로 주제 맥락을 소개.
- content: points를 요약·확장하여 3문장 이내로 핵심 메시지 전달.
- comparison: 차이점/장단점을 대조적으로 언급.
- chart: chartType과 chartLabels를 근거로 추세/의미를 간결히 해석(숫자 낭독 금지).
- conclusion: stats/핵심 권고를 기반으로 실행 메시지와 마무리.

SlidesContext=${JSON.stringify(slideContexts)}

Schema:
{ "slides": [ { "slideNumber": number, "${primaryField}": string, "interpretation": string } ] }`;
  const data = await callGemini(prompt, MODEL_NAME, {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
  });
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('스크립트 생성 응답이 비어 있습니다.');
  const jsonStr = extractJsonString(text);
  return JSON.parse(jsonStr);
}

export function mergePPTData(structure: any, scripts: any, language: 'ko' | 'zh'): any {
  if (!structure || !Array.isArray(structure.slides)) return structure;
  const primary = language === 'ko' ? 'koreanScript' : 'chineseScript';
  const opposite: 'ko' | 'zh' = language === 'ko' ? 'zh' : 'ko';
  const map = new Map<number, any>();
  if (scripts && Array.isArray(scripts.slides)) {
    for (const s of scripts.slides) map.set(Number(s.slideNumber), s);
  }
  structure.slides = structure.slides.map((sl: any) => {
    const m = map.get(Number(sl.slideNumber));
    if (m) {
      sl[primary] = trimToCompleteSentence(String(m[primary] ?? ''), 160, language);
      sl.interpretation = trimToCompleteSentence(String(m.interpretation ?? ''), 160, opposite);
    }
    return sl;
  });
  return structure;
}

export const generatePPTInSteps = async (params: GeneratePPTParamsLocal): Promise<any> => {
  return generatePPTWithTemplates(params);
};
// ===== 내용 평가 보조 API =====
export async function evaluateContentWithAI(args: { reference: string; hypothesis: string; language: 'ko' | 'zh' }): Promise<any> {
  const langName = args.language === 'zh' ? 'Chinese' : 'Korean';
  const EVAL_MODEL = (import.meta.env.VITE_GEMINI_EVAL_MODEL as string | undefined) || 'gemini-1.5-flash';
  const ref = String(args.reference || '').slice(0, 800);
  const hyp = String(args.hypothesis || '').slice(0, 800);

  const compactPrompt = `통역 품질 평가. JSON만 반환.
언어: ${langName}
원문: ${ref}
사용자 통역: ${hyp}

평가 기준(0-100 정수):
- accuracy(정확도): 의미 보존/오역·왜곡 여부
- completeness(완성도): 누락/축약 비율(30% 이상 누락 시 큰 감점)
- fluency(자연스러움): 문법·연결·가독성(표현 차이는 허용)

스키마(JSON ONLY): {"accuracy":number,"completeness":number,"fluency":number,
"summary":"한줄평가","tips":"개선점","details":["오류→교정","오류→교정"]}`;

  // Note: response schema is not used in REST v1beta to avoid INVALID_ARGUMENT errors

  const data = await callGemini(compactPrompt, EVAL_MODEL, {
    temperature: 0.2,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 256,
    responseMimeType: 'application/json',
  });
  const finish = data?.candidates?.[0]?.finishReason;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  logAI('Evaluation request:', {
    referenceLength: ref.length,
    hypothesisLength: hyp.length,
    language: args.language,
    finishReason: finish,
  });
  logAI('Raw response text:', text || '(empty)');

  // Helper: new schema uses accuracy/completeness/fluency
  const isValid = (obj: any) => obj &&
    Number.isFinite(Number(obj.accuracy)) &&
    Number.isFinite(Number(obj.completeness)) &&
    Number.isFinite(Number(obj.fluency));

  // Try parse
  try {
    const trimmed = (text || '').trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsedDirect = JSON.parse(trimmed);
      if (isValid(parsedDirect)) {
        logAI('Parsed result (direct):', parsedDirect);
        return parsedDirect;
      }
    }
    const jsonStr = extractJsonString(text || '{}');
    const parsed = JSON.parse(jsonStr);
    if (isValid(parsed)) {
      logAI('Parsed result:', parsed);
      return parsed;
    }
  } catch {}

  // Retry when truncated / token limit
  if (finish === 'MAX_TOKENS' || !text) {
    logAI('Token limit or empty parts. Retrying with ultra-compact prompt and higher tokens.');
    const ultra = `JSON ONLY. L=${langName}. R=${ref.slice(0, 200)} H=${hyp.slice(0, 200)} S={"accuracy":number,"completeness":number,"fluency":number,"summary":string,"tips":string,"details":string[]}`;
    try {
      const data2 = await callGemini(ultra, EVAL_MODEL, {
        temperature: 0.15,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 64,
        responseMimeType: 'application/json',
      });
      const text2: string = (data2 && data2.candidates && data2.candidates[0] && data2.candidates[0].content && data2.candidates[0].content.parts && data2.candidates[0].content.parts[0] && (data2.candidates[0].content.parts[0] as any).text) || '';
      const finish2: string = (data2 && data2.candidates && data2.candidates[0] && (data2.candidates[0] as any).finishReason) || '';
      logAI('[AI Eval] ultra-compact finishReason:', finish2);
    const parsed2 = JSON.parse(extractJsonString(text2 || '{}'));
      if (isValid(parsed2)) {
        logAI('[AI Eval] ultra-compact retry success');
        return parsed2;
      }
      logAIError('[AI Eval] ultra-compact retry invalid payload', parsed2);
    } catch (e2) {
      logAIError('[AI Eval] ultra-compact retry failed', e2);
    }
  }

  // Fallback: best-effort extraction from text
  const fb = tryExtractScoresFromText(text || '');
  if (fb) {
    logAI('[AI Eval] Using fallback extraction:', fb);
    // Map legacy keys to new schema
    return {
      accuracy: fb.accuracy ?? 0,
      completeness: fb.expertise ?? fb.completeness ?? 0,
      fluency: fb.context ?? fb.fluency ?? 0,
      summary: fb.summary,
      tips: fb.tips,
      details: fb.details,
    };
  }
  return { accuracy: 0, expertise: 0, context: 0, summary: '평가 실패', tips: '모델 응답이 비정상입니다.', details: ['MAX_TOKENS 또는 빈 응답'] };
}

// 응급 처치 함수: JSON 파싱 실패 시 텍스트에서 점수 추출
function tryExtractScoresFromText(text: string): any | null {
  try {
    // 1) 특정 패턴으로 점수 찾기 (accuracy:80, expertise:75 등)
    const scorePatterns = {
      accuracy: text.match(/(?:accuracy|정확도)["']?\s*[:=]?\s*(\d+)/i)?.[1],
      expertise: text.match(/(?:expertise|전문성)["']?\s*[:=]?\s*(\d+)/i)?.[1],
      context: text.match(/(?:context|문맥)["']?\s*[:=]?\s*(\d+)/i)?.[1]
    };
    
    if (scorePatterns.accuracy || scorePatterns.expertise || scorePatterns.context) {
      return {
        accuracy: clamp100(parseInt(scorePatterns.accuracy ?? '0') || 0),
        expertise: clamp100(parseInt(scorePatterns.expertise ?? '0') || 0),
        context: clamp100(parseInt(scorePatterns.context ?? '0') || 0),
        summary: '패턴 매칭으로 추출된 점수',
        tips: '정확한 평가를 위해 네트워크 상태를 확인하세요.',
        details: ['패턴 매칭 추출']
      };
    }
    
    // 2) 일반 숫자 패턴 찾기 (순서대로 첫 3개 숫자)
    const numbers = text.match(/\d+/g);
    if (numbers && numbers.length >= 3) {
      const [acc, exp, ctx] = numbers.slice(0, 3).map((n: string) => parseInt(n));
      // 점수 범위 검증 (0-100)
      if (acc <= 100 && exp <= 100 && ctx <= 100) {
        return {
          accuracy: clamp100(acc),
          expertise: clamp100(exp),
          context: clamp100(ctx),
          summary: '자동 추출된 점수',
          tips: '정확한 평가를 위해 네트워크 상태를 확인하세요.',
          details: ['숫자 순서 추출']
        };
      }
    }
  } catch {}
  return null;
}

function clamp100(n: number): number {
  if (typeof n !== 'number' || isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}


// ===== 템플릿 기반 생성: 프롬프트 → JSON → HTML 바인딩 → 스크립트 병합 =====
function buildTemplatePrompt(params: GeneratePPTParams & { language?: 'ko' | 'zh' }): string {
  const templateSequence = getTemplateSequence(params.slideCount);
  return `당신은 전문 프레젠테이션 컨설턴트입니다. 다음 구조로 ${params.slideCount}페이지 PPT를 생성해주세요.

주제: ${params.topic}
세부사항: ${params.details || '없음'}
스타일: ${params.style}
언어: ${params.language === 'zh' ? '중국어(간체)' : '한국어'} (모든 텍스트 필드는 지정 언어로 작성)
템플릿 순서: ${templateSequence.join(' → ')}

각 슬라이드별 요구사항:

**title 슬라이드**: 
- title: 임팩트 있는 메인 제목
- subtitle: 부제목
- content: 한 줄 설명

**content 슬라이드**:
- title: 섹션 제목
- point1~4: 각 카드의 제목 (간결하게)
- point1Detail~4Detail: 각 카드의 상세 설명 (2-3문장)

**chart 슬라이드**:
- title: 차트 제목
- insight1~3: 우측 패널의 인사이트 (각 2-3문장)
- chartType: 'bar', 'line', 'doughnut' 중 선택
- chartData: Chart.js 호환 데이터

**process 슬라이드**:
- title: 프로세스 제목
- step1Title~4Title: 각 단계 제목
- step1Content~4Content: 각 단계 설명

**conclusion 슬라이드**:
- title: 결론 제목
- point1~3: 핵심 성과 포인트
- mainStat, mainStatLabel: 메인 통계
- stat1Value~3Value, stat1Label~3Label: 하단 통계 카드

JSON 형식으로만 응답하세요. 각 슬라이드는 templateType 필드로 어떤 템플릿을 사용할지 지정하세요.

필수 필드 체크리스트(템플릿별):
- title: title, subtitle, content
- content: title, point1, point1Detail, point2, point2Detail, point3, point3Detail, point4, point4Detail
- chart: title, insight1, insight2, insight3, chartType, chartData
- process: title, step1Title, step1Content, step2Title, step2Content, step3Title, step3Content, step4Title, step4Content
- conclusion: title, point1, point2, point3, mainStat, mainStatLabel, stat1Value, stat1Label, stat2Value, stat2Label, stat3Value, stat3Label

아래 예시 JSON 형식을 정확히 따라주세요(설명/백틱 금지):
{
  "title": "프레젠테이션 제목",
  "slides": [
    {
      "slideNumber": 1,
      "type": "title",
      "templateType": "title",
      "title": "메인 제목",
      "subtitle": "부제목",
      "content": "한 줄 설명"
    },
    {
      "slideNumber": 2,
      "type": "content",
      "templateType": "content",
      "title": "섹션 제목",
      "point1": "첫번째 포인트 제목",
      "point1Detail": "첫번째 포인트 상세 설명 2-3문장",
      "point2": "두번째 포인트 제목",
      "point2Detail": "두번째 포인트 상세 설명 2-3문장",
      "point3": "세번째 포인트 제목",
      "point3Detail": "세번째 포인트 상세 설명 2-3문장",
      "point4": "네번째 포인트 제목",
      "point4Detail": "네번째 포인트 상세 설명 2-3문장"
    },
    {
      "slideNumber": 3,
      "type": "conclusion",
      "templateType": "conclusion",
      "title": "결론 제목",
      "point1": "핵심 성과 1",
      "point2": "핵심 성과 2",
      "point3": "핵심 성과 3",
      "mainStat": "85%",
      "mainStatLabel": "성공률",
      "stat1Value": "150만",
      "stat1Label": "이용자 수",
      "stat2Value": "300%",
      "stat2Label": "성장률",
      "stat3Value": "95점",
      "stat3Label": "만족도"
    }
  ]
}`;
}

async function generatePPTWithTemplates(params: GeneratePPTParamsLocal): Promise<any> {
  ensureApiKeyPresent();
  const prompt = buildTemplatePrompt({
    topic: params.topic,
    details: params.details,
    style: params.style,
    slideCount: params.slideCount,
    language: params.language,
  } as GeneratePPTParams);

  const data = await callGemini(prompt, MODEL_NAME, {
    temperature: 0.65,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: getMaxTokens(params.slideCount),
    responseMimeType: 'application/json',
  });
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('템플릿 기반 응답이 비어 있습니다.');
  const parsed = JSON.parse(extractJsonString(text));

  const sequence = getTemplateSequence(params.slideCount);
  const slidesIn: any[] = Array.isArray(parsed?.slides) ? parsed.slides : [];
  const title = typeof parsed?.title === 'string' && parsed.title.trim() ? parsed.title : params.topic;

  const mapType = (tpl?: string): 'title' | 'content' | 'chart' | 'comparison' | 'conclusion' => {
    switch ((tpl || '').toLowerCase()) {
      case 'title': return 'title';
      case 'chart': return 'chart';
      case 'conclusion': return 'conclusion';
      case 'process': return 'content';
      case 'content':
      default: return 'content';
    }
  };

  const slides = sequence.map((tpl, i) => {
    const candidate = slidesIn[i] || {};
    const templateType = candidate.templateType || tpl;
    const type = mapType(templateType);

    const stats: Array<{ value: string; label: string }> = [];
    if (candidate.stat1Value || candidate.stat1Label) stats.push({ value: String(candidate.stat1Value || ''), label: String(candidate.stat1Label || '') });
    if (candidate.stat2Value || candidate.stat2Label) stats.push({ value: String(candidate.stat2Value || ''), label: String(candidate.stat2Label || '') });
    if (candidate.stat3Value || candidate.stat3Label) stats.push({ value: String(candidate.stat3Value || ''), label: String(candidate.stat3Label || '') });

    const points: string[] = [];
    ['point1', 'point2', 'point3', 'point4'].forEach((k: string) => { if (candidate[k]) points.push(String(candidate[k])); });

    // 데이터 보강: content 템플릿의 상세 필드가 누락된 경우 기본값 보완
    if (templateType === 'content') {
      for (let idx = 1; idx <= 4; idx++) {
        const pk = `point${idx}`;
        const dk = `point${idx}Detail`;
        if (!candidate[pk]) candidate[pk] = params.language === 'zh' ? `要点 ${idx}` : `포인트 ${idx}`;
        if (!candidate[dk]) candidate[dk] = params.language === 'zh' ? `${candidate[pk]} 详细说明` : `${candidate[pk]} 상세 설명`;
      }
    }
    // 언어 라벨 구성
    const labelsByLang = {
      ko: {
        chartPlaceholder: '차트가 여기에 표시됩니다',
        insightTitle1: '핵심 인사이트',
        insightTitle2: '시장 동향',
        insightTitle3: '전략적 제언',
        keyAchievementsTitle: '핵심 성과',
        valueBadge1: '혁신',
        valueBadge2: '성장',
        valueBadge3: '전략',
      },
      zh: {
        chartPlaceholder: '图表将在此显示',
        insightTitle1: '关键洞察',
        insightTitle2: '市场趋势',
        insightTitle3: '战略建议',
        keyAchievementsTitle: '关键成果',
        valueBadge1: '创新',
        valueBadge2: '增长',
        valueBadge3: '战略',
      },
    } as const;

    const _labels = labelsByLang[params.language];

    // 데이터 보강: conclusion 핵심 통계 기본값
    if (templateType === 'conclusion') {
      // 포인트 1~3 기본 채움
      for (let idx = 1; idx <= 3; idx++) {
        const pk = `point${idx}`;
        if (!candidate[pk]) candidate[pk] = params.language === 'zh' ? `关键成果 ${idx}` : `핵심 성과 ${idx}`;
      }
      candidate.mainStat = candidate.mainStat || (candidate.stat1Value || '75%');
      candidate.mainStatLabel = candidate.mainStatLabel || (candidate.stat1Label || (params.language === 'zh' ? '达成率' : '달성률'));
      // 하단 통계 카드 3개 기본 채움
      if (!candidate.stat1Value) candidate.stat1Value = '75%';
      if (!candidate.stat1Label) candidate.stat1Label = params.language === 'zh' ? '达成率' : '달성률';
      if (!candidate.stat2Value) candidate.stat2Value = params.language === 'zh' ? '3年' : '3년';
      if (!candidate.stat2Label) candidate.stat2Label = params.language === 'zh' ? '预计周期' : '예상 기간';
      if (!candidate.stat3Value) candidate.stat3Value = 'TOP3';
      if (!candidate.stat3Label) candidate.stat3Label = params.language === 'zh' ? '优先级' : '우선 순위';
      // stats 배열도 보강
      if (stats.length === 0) {
        stats.push(
          { value: String(candidate.stat1Value), label: String(candidate.stat1Label) },
          { value: String(candidate.stat2Value), label: String(candidate.stat2Label) },
          { value: String(candidate.stat3Value), label: String(candidate.stat3Label) },
        );
      }
    }
    // 데이터 보강: chart 인사이트 기본값
    if (templateType === 'chart') {
      if (!candidate.insight1) candidate.insight1 = params.language === 'zh' ? '关键指标呈现持续上升趋势，表明增长潜力。' : '핵심 지표가 지속적인 상승 추세를 보이며 성장 가능성을 시사합니다.';
      if (!candidate.insight2) candidate.insight2 = params.language === 'zh' ? '市场趋势显示竞争加剧，差异化策略的重要性不断提升。' : '시장 동향은 경쟁 심화와 함께 차별화 전략의 중요성을 강조합니다.';
      if (!candidate.insight3) candidate.insight3 = params.language === 'zh' ? '需要制定优先级并落地执行路线图。' : '전략적으로 우선순위를 정하고 실행 로드맵을 수립해야 합니다.';
    }

    let chartType = candidate.chartType;
    let chartData = candidate.chartData;
    if (templateType === 'chart') {
      chartType = chartType || 'bar';
      if (!chartData || !Array.isArray(chartData?.labels)) chartData = generateDefaultChartData(params.topic);
    }

    // 템플릿 바인딩 시 언어 라벨 전달
    let html = bindTemplateData({ ...candidate, templateType, points, stats, ..._labels, _labels });
    // 안전망: 특정 한국어 고정 문구가 남아있을 경우 언어에 맞춰 치환
    if (params.language === 'zh') {
      html = html
        .replace(/핵심 인사이트/g, '关键洞察')
        .replace(/시장 동향/g, '市场趋势')
        .replace(/전략적 제언/g, '战略建议')
        .replace(/차트가 여기에 표시됩니다/g, '图表将在此显示')
        .replace(/핵심 성과/g, '关键成果');
    } else {
      // ko: 보정(혹시 중국어가 섞였을 경우)
      html = html
        .replace(/关键洞察/g, '핵심 인사이트')
        .replace(/市场趋势/g, '시장 동향')
        .replace(/战略建议/g, '전략적 제언')
        .replace(/图表将在此显示/g, '차트가 여기에 표시됩니다')
        .replace(/关键成果/g, '핵심 성과');
    }

    return {
      slideNumber: i + 1,
      type,
      title: candidate.title || title,
      subtitle: candidate.subtitle,
      content: candidate.content,
      points: points.length > 0 ? points : undefined,
      chartType,
      chartData,
      stats: stats.length > 0 ? stats : undefined,
      html,
      _labels,
    };
  });

  const structure = { title, slides };
  const scripts = await generatePPTScripts({ structure, topic: params.topic, language: params.language });
  const merged = mergePPTData(structure, scripts, params.language);
  return merged;
}