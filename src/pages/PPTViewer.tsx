import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Tour } from '../components/UI';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { SlideFactory } from '../components/SlideRenderer';
import InterpreterPanel from '../components/InterpreterPanel/InterpreterPanel';
import { synthesizeSlideAudio, getVoiceOptions } from '../services/ttsService';

interface SlideData {
  slideNumber: number;
  type: 'title' | 'content' | 'chart' | 'comparison' | 'conclusion';
  title: string;
  subtitle?: string;
  content?: string;
  points?: string[];
  chartType?: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter';
  chartData?: any;
  stats?: Array<{ value: string; label: string }>;
  audioStartTime?: number;
  audioEndTime?: number;
  koreanScript?: string;
  chineseScript?: string;
  interpretation?: string;
  keyPoints?: string[];
}

interface PPTData {
  title: string;
  slides: SlideData[];
  audioUrl?: string;
}

const PPTViewer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  // const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [slideAudioUrl, setSlideAudioUrl] = useState<string | null>(null);
  
  const pptData: PPTData = location.state?.pptData || {
    title: '샘플 프레젠테이션',
    slides: []
  };
  const language: 'ko' | 'zh' = location.state?.language || 'ko';
  const style: 'business' | 'academic' | 'creative' | 'technical' = location.state?.style || 'business';

  const handleSlideChange = (slideNumber: number) => {
    setCurrentSlide(slideNumber);
  };

  const handlePreviousSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleNextSlide = () => {
    if (currentSlide < pptData.slides.length) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // const handleAudioToggle = () => {
  //   setIsAudioPlaying(!isAudioPlaying);
  // };

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          handlePreviousSlide();
          break;
        case 'ArrowRight':
          handleNextSlide();
          break;
        case ' ':
          event.preventDefault();
          handlePlayPause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSlide]);

  const currentSlideData = pptData.slides.find(slide => slide.slideNumber === currentSlide) || null;
  const [voiceName, setVoiceName] = useState<string | undefined>(undefined);
  const voiceList = getVoiceOptions(language);
  useEffect(() => { setVoiceName(voiceList[0]?.value); }, [language]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!currentSlideData) {
        setSlideAudioUrl(null);
        return;
      }
      try {
        const res = await synthesizeSlideAudio(currentSlideData, language, voiceName);
        if (!cancelled) setSlideAudioUrl(res?.audioUrl || null);
      } catch {
        if (!cancelled) setSlideAudioUrl(null);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [currentSlideData, language, voiceName]);

  const primaryLangName = language === 'ko' ? '한국어' : '중국어';
  // const secondaryLangName = language === 'ko' ? '중국어' : '한국어';

  const langClass = language === 'zh' ? 'lang-zh' : '';
  const themeClass = `theme-${style}`;
  const [showTour, setShowTour] = useState<boolean>(() => {
    try {
      const forced = location.state?.forceTour === true;
      if (forced) return true;
      return localStorage.getItem('ppt-tour-done') !== '1';
    } catch { return true; }
  });
  const closeTour = (opts?: { dontShowAgain?: boolean }) => {
    try {
      if (opts?.dontShowAgain) localStorage.setItem('ppt-tour-done', '1');
    } catch {}
    setShowTour(false);
  };
  const tourSteps = [
    {
      id: 'thumbs',
      title: '슬라이드 탐색',
      description: '왼쪽 목록에서 슬라이드를 클릭하여 이동할 수 있습니다.',
      targetSelector: '[data-tour="thumbnails"]',
      padding: 8,
    },
    {
      id: 'viewer',
      title: '슬라이드 보기',
      description: '가운데 영역에서 슬라이드를 확인하고 좌우 화살표 또는 버튼으로 이동합니다.',
      targetSelector: '[data-tour="viewer"]',
      padding: 12,
    },
    {
      id: 'interpreter',
      title: '통역 패널',
      description: '오른쪽 패널에서 원문과 통역안을 각각 숨기거나 펼칠 수 있어요. 재생 버튼으로 AI 음성을 듣고, 마이크 버튼으로 내 발음을 녹음해 비교 연습을 합니다.',
      targetSelector: '[data-tour="interpreter"]',
      padding: 10,
    },
    {
      id: 'interpreter-script',
      title: '스크립트(원문)',
      description: '선택된 언어의 원문 스크립트입니다. 토글로 숨기고 통역만 보면서 연습할 수 있어요.',
      targetSelector: '[data-tour="interpreter"] [data-tour="ip-primary"]',
      padding: 8,
    },
    {
      id: 'interpreter-translation',
      title: '통역안(반대 언어)',
      description: 'AI가 생성한 통역안입니다. 토글로 숨겼다가 답처럼 확인할 수 있어요.',
      targetSelector: '[data-tour="interpreter"] [data-tour="ip-opposite"]',
      padding: 8,
    },
    {
      id: 'interpreter-record',
      title: '재생/녹음',
      description: '재생 버튼으로 AI 음성을 듣고, 마이크 버튼으로 녹음을 시작합니다. 정지 버튼으로 녹음을 종료해 인식 결과를 확인하세요.',
      targetSelector: '[data-tour="interpreter"] [data-tour="ip-opposite"] [data-tour="ip-record"]',
      padding: 8,
    },
  ];
  return (
    <div className={`min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--cream)] ${themeClass} ${langClass}`}>
      <div className="flex h-screen">
        {/* 슬라이드 썸네일 (12%) */}
        <div className="w-[12%] bg-white border-r border-gray-200 overflow-y-auto" data-tour="thumbnails">
          <div className="p-4">
            <h3 className="text-lg font-bold text-[var(--primary-brown)] mb-4">
              슬라이드
            </h3>
            <div className="space-y-2">
              {pptData.slides.map((slide) => (
                <div
                  key={slide.slideNumber}
                  onClick={() => handleSlideChange(slide.slideNumber)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    currentSlide === slide.slideNumber
                      ? 'bg-[var(--primary-brown)] text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-sm font-medium">
                    {slide.slideNumber}. {slide.title}
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    {slide.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 메인 뷰어 (70%) - 콘텐츠 공간 확대 */}
        <div className="w-[70%] flex flex-col" data-tour="viewer">
          {/* 헤더 */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[var(--primary-brown)]">
                  {pptData.title}
                </h1>
                <p className="text-sm text-gray-600">
                  슬라이드 {currentSlide} / {pptData.slides.length} · 언어: {primaryLangName}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handlePreviousSlide}
                  disabled={currentSlide === 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft size={16} />
                </Button>
                
                <Button
                  onClick={handlePlayPause}
                  variant="primary"
                  size="sm"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </Button>
                
                <Button
                  onClick={handleNextSlide}
                  disabled={currentSlide === pptData.slides.length}
                  variant="outline"
                  size="sm"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* 슬라이드 뷰어 */}
          <div className="flex-1 p-2 flex items-center justify-center">
            <div className="max-w-7xl w-full">
              {currentSlideData ? (
                <SlideFactory slide={currentSlideData} slideNumber={currentSlide} totalSlides={pptData.slides.length} />
              ) : (
                <div className="slide-container bg-white p-8 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <p>슬라이드를 선택해주세요</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 통역 패널 (18%) */}
        <div className="w-[18%] bg-white border-l border-gray-200 flex flex-col" data-tour="interpreter">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">음성</label>
              <select className="text-sm border rounded px-2 py-1" value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}>
                {voiceList.map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              홈으로
            </Button>
          </div>
          <InterpreterPanel language={language} slide={currentSlideData} slideAudioUrl={slideAudioUrl} />
        </div>
      </div>
      
      {/* 하단 네비게이션 */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-white rounded-lg shadow-lg px-6 py-3 flex items-center space-x-4">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
          >
            홈으로
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={handlePreviousSlide}
              disabled={currentSlide === 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeft size={16} />
            </Button>
            
            <span className="text-sm font-medium">
              {currentSlide} / {pptData.slides.length}
            </span>
            
            <Button
              onClick={handleNextSlide}
              disabled={currentSlide === pptData.slides.length}
              variant="outline"
              size="sm"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
          <Button onClick={() => setShowTour(true)} variant="outline" size="sm">도움말</Button>
        </div>
      </div>

      {/* Onboarding Tour */}
      <Tour steps={tourSteps} visible={showTour} onClose={closeTour} />
    </div>
  );
};

export default PPTViewer; 