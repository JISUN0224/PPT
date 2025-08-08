/*
  aiService.ts
  - Google Generative Language API (Gemini) 호출로 PPT JSON 생성
  - 환경변수: VITE_GEMINI_API_KEY, VITE_GEMINI_MODEL (옵션)
  - 외부 라이브러리 없이 fetch 사용
*/

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

function ensureChartSlide(ppt: any, topic: string): any {
  if (!ppt || !Array.isArray(ppt.slides)) return ppt;
  const hasChart = ppt.slides.some((s: any) => s?.type === 'chart' && s?.chartData && Array.isArray(s.chartData.labels));
  if (!hasChart) {
    // 두 번째 슬라이드를 기본 차트로 바꿔줌 (없으면 첫 번째 다음)
    const idx = Math.min(1, Math.max(0, ppt.slides.length - 1));
    const base = ppt.slides[idx] || { slideNumber: idx + 1, title: ppt.title || '차트' };
    ppt.slides[idx] = {
      ...base,
      type: 'chart',
      title: base.title || '데이터 분석',
      chartType: 'bar',
      chartData: generateDefaultChartData(topic),
    };
    logAI('Injected default chart slide');
  } else {
    // chart slide에 데이터가 비어 있으면 채워넣기
    ppt.slides = ppt.slides.map((s: any) => {
      if (s?.type === 'chart' && (!s.chartData || !Array.isArray(s.chartData.labels))) {
        return { ...s, chartType: s.chartType || 'bar', chartData: generateDefaultChartData(topic) };
      }
      return s;
    });
  }
  return ppt;
}

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
  return `JSON ONLY. Topic=\"${topic}\" Style=${style} Slides=${slideCount} Language=${language}.
- Include at least one chart slide with chartType and chartData(labels 3-5, data 3-5).
Schema:{title,slides:[{slideNumber,type,title,subtitle?,content?,points?,chartType?,chartData?,stats?,${scriptField}(80-160),interpretation(80-160),layoutVariant,accentColor}]}`;
}

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
  return data;
}

function extractJsonString(text: string): string {
  const fenced = text.match(/```(?:json)?\n([\s\S]*?)\n```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) return text.slice(first, last + 1);
  return text.trim();
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
  ppt.slides = ppt.slides.map((sl: any, i: number) => ({
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
  const structure = await generatePPTStructure(params);
  const scripts = await generatePPTScripts({ structure, topic: params.topic, language: params.language });
  const merged = mergePPTData(structure, scripts, params.language);
  return ensureChartSlide(merged, params.topic);
};