import React from 'react';
import { useAutoFitScale } from '../../hooks/useAutoFitScale';
import { TitleSlide, ContentSlide, ChartSlide, ComparisonSlide, ConclusionSlide } from './SlideTemplates';
import ChartRenderer from './ChartRenderer';
import type { SlideData } from './SlideTemplates';
import { 
  TitleCenter, TitleLeft, TitleBackground,
  ContentList, ContentCard, ContentTimeline,
  ChartCenter, ChartSplitLR, ChartSplitTB, ChartFullscreen,
  ConclusionGrid, ConclusionVertical
} from './LayoutVariations';

interface SlideFactoryProps {
  slide: SlideData;
  slideNumber: number;
  totalSlides: number;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/ on[a-zA-Z]+=("[^"]*"|'[^']*')/g, '');
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, '').trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPointsHtml(points?: string[]): string {
  if (!points || points.length === 0) return '';
  const items = points.map(p => `<li class="ml-4 list-disc leading-relaxed">${escapeHtml(p)}</li>`).join('');
  return `<ul class="space-y-2">${items}</ul>`;
}

function fillHtmlTemplate(rawHtml: string, slide: SlideData): string {
  let html = rawHtml;
  // 기본 텍스트 교체
  const replacements: Record<string, string> = {
    title: slide.title || '',
    subtitle: slide.subtitle || '',
    content: slide.content || '',
    koreanScript: slide.koreanScript || '',
    chineseScript: slide.chineseScript || '',
    interpretation: slide.interpretation || '',
  };

  // point1..point6 개별 치환
  const pointList = Array.isArray(slide.points) ? slide.points : [];
  for (let i = 0; i < 6; i++) {
    const key = `point${i + 1}`;
    replacements[key] = pointList[i] ? escapeHtml(pointList[i]) : '';
  }

  // stats 치환(stat1Value/stat1Label …)
  const statsList = Array.isArray(slide.stats) ? slide.stats : [];
  for (let i = 0; i < 3; i++) {
    const valKey = `stat${i + 1}Value`;
    const labKey = `stat${i + 1}Label`;
    replacements[valKey] = statsList[i]?.value ? escapeHtml(String(statsList[i].value)) : '';
    replacements[labKey] = statsList[i]?.label ? escapeHtml(String(statsList[i].label)) : '';
  }

  // chartNote 유도
  if (!('chartNote' in replacements)) {
    const labels = (slide as any)?.chartData?.labels;
    const type = slide.chartType || '';
    if (Array.isArray(labels) && labels.length > 0) {
      replacements.chartNote = `${type || 'chart'}: ${labels.join(', ')}`;
    } else {
      replacements.chartNote = '';
    }
  }

  Object.entries(replacements).forEach(([k, v]) => {
    const safe = typeof v === 'string' ? v : '';
    html = html.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'gi'), safe);
    html = html.replace(new RegExp(`\\[\\[\\s*${k}\\s*\\]\\]`, 'gi'), safe);
  });

  // points 블록 치환
  const pointsHtml = buildPointsHtml(slide.points);
  html = html.replace(/{{\s*points\s*}}/gi, pointsHtml);
  html = html.replace(/\[\[\s*points\s*\]\]/gi, pointsHtml);

  return html;
}

function splitByChartArea(html: string): { before: string; after: string; hasChart: boolean } {
  // 1) luxe-card 래퍼 내부의 chart-area 블록 제거 (내부 컨텐츠 유무 무관, non-greedy)
  const wrapperRegex = /<div[^>]*class=("|')[^"']*luxe-card[^"']*\1[^>]*>\s*<div[^>]*class=("|')[^"']*chart-area[^"']*\2[^>]*>[\s\S]*?<\/div>\s*<\/div>/i;
  let match = html.match(wrapperRegex);
  if (match) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    return { before: html.slice(0, start), after: html.slice(end), hasChart: true };
  }
  // 2) chart-area 단일 div 제거 (내부 컨텐츠 유무 무관)
  const areaRegex = /<div[^>]*class=("|')[^"']*chart-area[^"']*\1[^>]*>[\s\S]*?<\/div>/i;
  match = html.match(areaRegex);
  if (match) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    return { before: html.slice(0, start), after: html.slice(end), hasChart: true };
  }
  return { before: html, after: '', hasChart: false };
}

const SlideFactory: React.FC<SlideFactoryProps> = ({ slide, slideNumber, totalSlides }) => {
  // 1) AI가 제공한 HTML이 있으면 직접 렌더링 (권장 경로)
  if (typeof slide.html === 'string' && slide.html.trim().length > 0) {
    let htmlToRender = fillHtmlTemplate(slide.html, slide);
    const safe = sanitizeHtml(htmlToRender);
    const plain = stripTags(safe);
    if (plain.length < 5) {
      // 내용이 너무 적다면 폴백
      // eslint-disable-next-line no-console
      console.warn('[SlideRenderer] AI html empty after sanitize. Falling back to templates.', { slideNumber });
    } else {
      // eslint-disable-next-line no-console
      console.log('[SlideRenderer] Rendering AI HTML', { slideNumber, preview: safe.slice(0, 200) });
      // 차트 플레이스홀더가 있을 경우 실제 ChartRenderer를 삽입해 표시
      const { before, after, hasChart } = splitByChartArea(safe);
      if (hasChart && slide.type === 'chart') {
        const { containerRef, contentRef, scale } = useAutoFitScale({ maxScale: 1.25, paddingRatio: 0.995 });
        return (
          <div className="relative slide-container bg-white" ref={containerRef}>
            <div className="absolute top-4 right-4 bg-[var(--primary-brown)] text-white text-xs px-2 py-1 rounded-md shadow">
              {slideNumber} / {totalSlides}
            </div>
            <div className="h-full w-full flex items-center justify-center overflow-hidden">
              <div ref={contentRef} style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
                <div dangerouslySetInnerHTML={{ __html: before }} />
                <div className="bg-white rounded-lg p-4 shadow-inner">
                  <ChartRenderer chartType={slide.chartType} chartData={slide.chartData} className="w-full" />
                </div>
                <div dangerouslySetInnerHTML={{ __html: after }} />
              </div>
            </div>
          </div>
        );
      }
      const { containerRef, contentRef, scale } = useAutoFitScale({ maxScale: 1.25, paddingRatio: 0.995 });
      return (
        <div className="relative slide-container bg-white" ref={containerRef}>
          <div className="absolute top-4 right-4 bg-[var(--primary-brown)] text-white text-xs px-2 py-1 rounded-md shadow">
            {slideNumber} / {totalSlides}
          </div>
          <div
            className="h-full w-full flex items-center justify-center overflow-hidden"
          >
            <div
              ref={contentRef}
              style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
              dangerouslySetInnerHTML={{ __html: safe }}
            />
          </div>
        </div>
      );
    }
  }

  // 2) 기존 템플릿 기반 렌더링 (fallback)
  const renderByType = () => {
    const variant = slide.layoutVariant || '';

    switch (slide.type) {
      case 'title': {
        if (variant === 'left') return <TitleLeft slide={slide} />;
        if (variant === 'background') return <TitleBackground slide={slide} />;
        return <TitleCenter slide={slide} />;
      }
      case 'content': {
        if (variant === 'card') return <ContentCard slide={slide} />;
        if (variant === 'timeline') return <ContentTimeline slide={slide} />;
        return <ContentList slide={slide} />;
      }
      case 'chart': {
        if (variant === 'split-lr') return <ChartSplitLR slide={slide} />;
        if (variant === 'split-tb') return <ChartSplitTB slide={slide} />;
        if (variant === 'fullscreen') return <ChartFullscreen slide={slide} />;
        return <ChartCenter slide={slide} />;
      }
      case 'comparison':
        return <ComparisonSlide slide={slide} />;
      case 'conclusion': {
        if (variant === 'vertical') return <ConclusionVertical slide={slide} />;
        return <ConclusionGrid slide={slide} />;
      }
      default:
        return <ContentSlide slide={slide} />;
    }
  };

  return (
    <div className="relative slide-container bg-white">
      <div className="absolute top-4 right-4 bg-[var(--primary-brown)] text-white text-xs px-2 py-1 rounded-md shadow">
        {slideNumber} / {totalSlides}
      </div>
      {renderByType()}
    </div>
  );
};

export default SlideFactory;