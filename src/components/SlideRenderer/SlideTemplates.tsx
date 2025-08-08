import React from 'react';
import ChartRenderer from './ChartRenderer';

export interface SlideData {
  slideNumber: number;
  type: 'title' | 'content' | 'chart' | 'comparison' | 'conclusion';
  title: string;
  subtitle?: string;
  content?: string;
  points?: string[];
  chartType?: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter';
  chartData?: any;
  stats?: Array<{ value: string; label: string }>;
  layoutVariant?: string; // e.g., list|card|timeline, center|split-lr|split-tb|fullscreen, center|left|background, grid|vertical
  accentColor?: 'green' | 'blue' | 'gold' | 'default';
  // 통역/스크립트
  koreanScript?: string;
  chineseScript?: string;
  interpretation?: string; // 선택 언어의 반대 언어로 생성된 통역문
  keyPoints?: string[];
}

export const TitleSlide: React.FC<{ slide: SlideData }> = ({ slide }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-16">
      <h2 className="text-5xl md:text-6xl font-extrabold text-[var(--primary-brown)] luxe-font-display mb-5">
        {slide.title}
      </h2>
      {slide.subtitle && (
        <p className="text-xl md:text-2xl text-[var(--secondary-brown)] mb-4 luxe-font-display">{slide.subtitle}</p>
      )}
      {slide.content && (
        <p className="text-lg md:text-xl text-gray-700 max-w-3xl">{slide.content}</p>
      )}
      {/* 스크립트 요약을 title 슬라이드에 비주얼 포인트로 표시 */}
      {(slide.koreanScript || slide.chineseScript) && (
        <ul className="mt-6 grid grid-cols-3 gap-4 w-full max-w-4xl">
          {[...(slide.koreanScript || slide.chineseScript || '')
            .replace(/\s+/g,' ')
            .split(/[\.!?。！？]/)
            .map(s=>s.trim())
            .filter(Boolean)
            .slice(0,3)]
            .map((line, idx) => (
              <li key={idx} className="luxe-card py-4 text-left text-lg">
                <span className="mr-2">{['✨','✅','📌'][idx] || '•'}</span>
                <span>{line}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};

export const ContentSlide: React.FC<{ slide: SlideData }> = ({ slide }) => {
  return (
    <div className="h-full flex flex-col px-12 py-10">
      <h3 className="text-2xl md:text-3xl font-bold text-[var(--primary-brown)] mb-6">{slide.title}</h3>
      {slide.points && (
        <ul className="space-y-4">
          {slide.points.map((point, i) => (
            <li key={i} className="flex items-start space-x-3">
              <span className="mt-2 w-2 h-2 rounded-full bg-[var(--primary-brown)]" />
              <span className="text-lg leading-relaxed">{point}</span>
            </li>
          ))}
        </ul>
      )}
      {!slide.points && slide.content && (
        <p className="text-lg leading-relaxed">{slide.content}</p>
      )}
    </div>
  );
};

export const ChartSlide: React.FC<{ slide: SlideData }> = ({ slide }) => {
  return (
    <div className="h-full flex flex-col px-12 py-10">
      <h3 className="text-2xl md:text-3xl font-bold text-[var(--primary-brown)] mb-6">{slide.title}</h3>
      <div className="flex-1 bg-white rounded-lg p-4 shadow-inner">
        <ChartRenderer chartType={slide.chartType} chartData={slide.chartData} className="w-full" />
      </div>
    </div>
  );
};

export const ComparisonSlide: React.FC<{ slide: SlideData }> = ({ slide }) => {
  return (
    <div className="h-full flex flex-col px-12 py-10">
      <h3 className="text-2xl md:text-3xl font-bold text-[var(--primary-brown)] mb-6">{slide.title}</h3>
      {slide.points ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {slide.points.map((p, i) => (
            <div key={i} className="luxe-card">
              <p className="text-base md:text-lg text-gray-800">{p}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-lg leading-relaxed">{slide.content}</p>
      )}
    </div>
  );
};

export const ConclusionSlide: React.FC<{ slide: SlideData }> = ({ slide }) => {
  return (
    <div className="h-full flex flex-col px-12 py-10">
      <h3 className="text-2xl md:text-3xl font-bold text-[var(--primary-brown)] mb-6">{slide.title}</h3>

      {slide.points && (
        <ul className="space-y-3 mb-8">
          {slide.points.map((p, i) => (
            <li key={i} className="flex items-start space-x-3">
              <span className="mt-2 w-2 h-2 rounded-full bg-[var(--primary-brown)]" />
              <span className="text-lg leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
      )}

      {slide.stats && slide.stats.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {slide.stats.map((s, i) => (
            <div key={i} className="bg-[var(--background)] border border-[rgba(139,69,19,0.15)] rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-[var(--primary-brown)]">{s.value}</div>
              <div className="text-sm text-[var(--secondary-brown)]">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {!slide.points && !slide.stats && slide.content && (
        <p className="text-lg leading-relaxed">{slide.content}</p>
      )}
    </div>
  );
};