import React from 'react';
import type { SlideData } from './SlideTemplates';
import ChartRenderer from './ChartRenderer';

function accentClass(accent?: SlideData['accentColor']): string {
  switch (accent) {
    case 'green':
      return 'text-[#2D5016] border-[#2D5016]';
    case 'blue':
      return 'text-[#1B365D] border-[#1B365D]';
    case 'gold':
      return 'text-[#B8860B] border-[#B8860B]';
    default:
      return 'text-[var(--primary-brown)] border-[var(--primary-brown)]';
  }
}

// Title variations
export const TitleCenter: React.FC<{ slide: SlideData }> = ({ slide }) => (
  <div className="h-full flex flex-col items-center justify-center text-center px-16">
    <h2 className={`text-5xl md:text-6xl font-extrabold luxe-font-display ${accentClass(slide.accentColor)} mb-5`}>{slide.title}</h2>
    {slide.subtitle && <p className="text-xl md:text-2xl text-[var(--secondary-brown)] mb-4 luxe-font-display">{slide.subtitle}</p>}
    {slide.content && <p className="text-lg md:text-xl text-gray-700 max-w-3xl">{slide.content}</p>}
  </div>
);

export const TitleLeft: React.FC<{ slide: SlideData }> = ({ slide }) => (
  <div className="h-full flex flex-col justify-center text-left px-16">
    <h2 className={`text-4xl md:text-5xl font-bold ${accentClass(slide.accentColor)} mb-4`}>{slide.title}</h2>
    {slide.subtitle && <p className="text-lg md:text-xl text-[var(--secondary-brown)] mb-3">{slide.subtitle}</p>}
    {slide.content && <p className="text-base md:text-lg text-gray-700 max-w-3xl">{slide.content}</p>}
  </div>
);

export const TitleBackground: React.FC<{ slide: SlideData }> = ({ slide }) => (
  <div className="h-full relative overflow-hidden flex items-center px-16">
    <div className="absolute inset-0 opacity-10 bg-[var(--primary-brown)]" />
    <div className="relative">
      <h2 className={`text-4xl md:text-5xl font-bold ${accentClass(slide.accentColor)} mb-4`}>{slide.title}</h2>
      {slide.subtitle && <p className="text-lg md:text-xl text-[var(--secondary-brown)] mb-3">{slide.subtitle}</p>}
      {slide.content && <p className="text-base md:text-lg text-gray-700 max-w-3xl">{slide.content}</p>}
    </div>
  </div>
);

// Content variations
export const ContentList: React.FC<{ slide: SlideData }> = ({ slide }) => (
  <div className="h-full flex flex-col px-12 py-10">
    <h3 className={`text-2xl md:text-3xl font-bold ${accentClass(slide.accentColor)} mb-6`}>{slide.title}</h3>
    {slide.points && (
      <ul className="space-y-4">
        {slide.points.map((point, i) => (
          <li key={i} className="flex items-start space-x-3">
            <span className={`mt-2 w-2 h-2 rounded-full ${accentClass(slide.accentColor).replace('text', 'bg')}`} />
            <span className="text-lg leading-relaxed">{point}</span>
          </li>
        ))}
      </ul>
    )}
    {!slide.points && slide.content && <p className="text-lg leading-relaxed">{slide.content}</p>}
  </div>
);

export const ContentCard: React.FC<{ slide: SlideData }> = ({ slide }) => (
  <div className="h-full flex flex-col px-12 py-10">
    <h3 className={`text-2xl md:text-3xl font-bold ${accentClass(slide.accentColor)} mb-6`}>{slide.title}</h3>
    {slide.points && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {slide.points.map((p, i) => (
          <div key={i} className="luxe-card">
            <p className="text-base md:text-lg text-gray-800">{p}</p>
          </div>
        ))}
      </div>
    )}
    {!slide.points && slide.content && <p className="text-lg leading-relaxed">{slide.content}</p>}
  </div>
);

export const ContentTimeline: React.FC<{ slide: SlideData }> = ({ slide }) => (
  <div className="h-full flex flex-col px-12 py-10">
    <h3 className={`text-2xl md:text-3xl font-bold ${accentClass(slide.accentColor)} mb-6`}>{slide.title}</h3>
    {slide.points && (
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-[var(--cream)]" />
        <ul className="space-y-6">
          {slide.points.map((p, i) => (
            <li key={i} className="relative pl-8">
              <span className={`absolute left-0 top-1.5 w-3 h-3 rounded-full ${accentClass(slide.accentColor).replace('text', 'bg')}`} />
              <p className="text-lg leading-relaxed">{p}</p>
            </li>
          ))}
        </ul>
      </div>
    )}
    {!slide.points && slide.content && <p className="text-lg leading-relaxed">{slide.content}</p>}
  </div>
);

// Chart variations
export const ChartCenter: React.FC<{ slide: SlideData }> = ({ slide }) => (
  <div className="h-full flex flex-col px-12 py-10">
    <h3 className={`text-2xl md:text-3xl font-bold ${accentClass(slide.accentColor)} mb-6`}>{slide.title}</h3>
    <div className="flex-1 bg-white rounded-lg p-4 shadow-inner">
      <ChartRenderer chartType={slide.chartType} chartData={slide.chartData} />
    </div>
  </div>
);

export const ChartSplitLR: React.FC<{ slide: SlideData }> = ({ slide }) => (
  <div className="h-full grid grid-cols-2 gap-6 px-12 py-10">
    <div>
      <h3 className={`text-2xl md:text-3xl font-bold ${accentClass(slide.accentColor)} mb-6`}>{slide.title}</h3>
      <p className="text-gray-700">{slide.content}</p>
    </div>
    <div className="bg-white rounded-lg p-4 shadow-inner">
      <ChartRenderer chartType={slide.chartType} chartData={slide.chartData} />
    </div>
  </div>
);

export const ChartSplitTB: React.FC<{ slide: SlideData }> = ({ slide }) => (
  <div className="h-full flex flex-col px-12 py-10">
    <h3 className={`text-2xl md:text-3xl font-bold ${accentClass(slide.accentColor)} mb-4`}>{slide.title}</h3>
    <div className="flex-1 bg-white rounded-lg p-4 shadow-inner">
      <ChartRenderer chartType={slide.chartType} chartData={slide.chartData} />
    </div>
    {slide.content && <p className="mt-4 text-gray-700">{slide.content}</p>}
  </div>
);

export const ChartFullscreen: React.FC<{ slide: SlideData }> = ({ slide }) => (
  <div className="h-full p-6">
    <ChartRenderer chartType={slide.chartType} chartData={slide.chartData} />
  </div>
);

// Conclusion variations
export const ConclusionGrid: React.FC<{ slide: SlideData }> = ({ slide }) => (
  <div className="h-full flex flex-col px-12 py-10">
    <h3 className={`text-2xl md:text-3xl font-bold ${accentClass(slide.accentColor)} mb-6`}>{slide.title}</h3>
    {slide.points && (
      <ul className="space-y-3 mb-6">
        {slide.points.map((p, i) => (
          <li key={i} className="flex items-start space-x-3">
            <span className={`mt-2 w-2 h-2 rounded-full ${accentClass(slide.accentColor).replace('text', 'bg')}`} />
            <span className="text-lg leading-relaxed">{p}</span>
          </li>
        ))}
      </ul>
    )}
    {slide.stats && (
      <div className="grid grid-cols-3 gap-4">
        {slide.stats.map((s, i) => (
          <div key={i} className="bg-[var(--background)] border border-[var(--accent-border)] rounded-xl p-4 shadow-sm text-center">
            <div className={`text-2xl font-bold ${accentClass(slide.accentColor)}`}>{s.value}</div>
            <div className="text-sm text-[var(--secondary-brown)]">{s.label}</div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export const ConclusionVertical: React.FC<{ slide: SlideData }> = ({ slide }) => (
  <div className="h-full flex flex-col px-12 py-10">
    <h3 className={`text-2xl md:text-3xl font-bold ${accentClass(slide.accentColor)} mb-6`}>{slide.title}</h3>
    {slide.points && (
      <ul className="space-y-4">
        {slide.points.map((p, i) => (
          <li key={i} className="flex items-start space-x-3">
            <span className={`mt-2 w-2 h-2 rounded-full ${accentClass(slide.accentColor).replace('text', 'bg')}`} />
            <span className="text-lg leading-relaxed">{p}</span>
          </li>
        ))}
      </ul>
    )}
    {slide.stats && (
      <div className="mt-8 grid grid-cols-1 gap-4">
        {slide.stats.map((s, i) => (
          <div key={i} className="bg-[var(--background)] border border-[rgba(139,69,19,0.15)] rounded-xl p-4 shadow-sm text-center">
            <div className={`text-2xl font-bold ${accentClass(slide.accentColor)}`}>{s.value}</div>
            <div className="text-sm text-[var(--secondary-brown)]">{s.label}</div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default {};