import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Loading } from '../components/UI';
import { generatePPTInSteps } from '../services/aiService';
import { SlideFactory } from '../components/SlideRenderer';
import type { SlideData } from '../components/SlideRenderer/SlideTemplates';

interface GeneratePPTParams {
  topic: string;
  details?: string;
  style: 'business' | 'academic' | 'creative' | 'technical';
  slideCount: number;
  language: 'ko' | 'zh';
}

const GeneratorPage: React.FC = () => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<GeneratePPTParams>({
    topic: '',
    details: '',
    style: 'business',
    slideCount: 3,
    language: 'ko',
  });

  const handleGenerate = async () => {
    if (!formData.topic.trim()) return;
    setError(null);
    setIsGenerating(true);

    try {
      const pptData = await generatePPTInSteps(formData);
      navigate('/viewer', { state: { pptData, language: formData.language, style: formData.style, forceTour: true } });
    } catch (e: any) {
      setError(e?.message || 'PPT 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getStylePreviewConfig = (
    style: GeneratePPTParams['style']
  ): { layoutVariant: 'center' | 'left' | 'background'; accentColor: 'green' | 'blue' | 'gold' | 'default' } => {
    switch (style) {
      case 'business':
        return { layoutVariant: 'left', accentColor: 'default' };
      case 'academic':
        return { layoutVariant: 'center', accentColor: 'blue' };
      case 'creative':
        return { layoutVariant: 'background', accentColor: 'gold' };
      case 'technical':
        return { layoutVariant: 'left', accentColor: 'blue' };
      default:
        return { layoutVariant: 'center', accentColor: 'default' };
    }
  };

  const previewBase: Omit<SlideData, 'slideNumber' | 'type' | 'title'> = {
    subtitle: `${formData.style} · ${formData.language === 'ko' ? '한국어' : '중국어'}`,
    content: formData.details?.slice(0, 120),
  };
  const styleCfg = getStylePreviewConfig(formData.style);

  const previewSlide: SlideData | null = formData.topic
    ? {
        slideNumber: 1,
        type: 'title',
        title: formData.topic,
        ...previewBase,
        layoutVariant: styleCfg.layoutVariant,
        accentColor: styleCfg.accentColor,
      }
    : null;

  const langClass = formData.language === 'zh' ? 'lang-zh' : '';
  return (
    <div className={`min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--cream)] theme-${formData.style} ${langClass}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
           <h1 className="luxe-title mb-4 luxe-font-display">AI PPT 생성기</h1>
          <p className="luxe-subtitle">
            주제만 입력하면 AI가 전문적인 프레젠테이션을 자동 생성합니다
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* 왼쪽: 입력 폼 */}
          <div className="luxe-card">
            <h2 className="text-2xl font-bold text-[var(--primary-brown)] mb-6">
              프레젠테이션 생성
            </h2>
            
            <div className="space-y-6">
              <Input
                label="주제"
                value={formData.topic}
                onChange={(value) => setFormData(prev => ({ ...prev, topic: value }))}
                placeholder="프레젠테이션 주제를 입력하세요"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상세 설명(선택)
                </label>
                <textarea
                  value={formData.details}
                  onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                  placeholder="추가적인 세부사항을 입력하세요"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-brown)] focus:border-transparent transition-colors duration-200"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  언어
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value as 'ko' | 'zh' }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-brown)] focus:border-transparent transition-colors duration-200"
                >
                  <option value="ko">한국어</option>
                  <option value="zh">중국어</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  스타일
                </label>
                <select
                  value={formData.style}
                  onChange={(e) => setFormData(prev => ({ ...prev, style: e.target.value as any }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-brown)] focus:border-transparent transition-colors duration-200"
                >
                  <option value="business">비즈니스</option>
                  <option value="academic">학술</option>
                  <option value="creative">창의적</option>
                  <option value="technical">기술</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  슬라이드 수
                </label>
                <select
                  value={formData.slideCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, slideCount: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-brown)] focus:border-transparent transition-colors duration-200"
                >
                  <option value={3}>3장 (간결한 구성)</option>
                  <option value={4}>4장 (표준 구성)</option>
                  <option value={5}>5장 (상세한 구성)</option>
                </select>
              </div>

              {error && (
                <div className="text-red-600 text-sm" role="alert" aria-live="assertive">
                  {error}
                </div>
              )}
              
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !formData.topic.trim()}
                size="lg"
                className="w-full"
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loading size="sm" text="" />
                    <span>AI가 프레젠테이션을 생성 중...</span>
                  </div>
                ) : (
                  '프레젠테이션 생성하기'
                )}
              </Button>
            </div>
          </div>

          {/* 오른쪽: 미리보기 */}
          <div className="luxe-card">
            <h2 className="text-2xl font-bold text-[var(--primary-brown)] mb-6">
              미리보기
            </h2>
            
            <div className="slide-container bg-white p-8 flex items-center justify-center">
              {previewSlide ? (
                <div className="w-full max-w-3xl">
                  <SlideFactory slide={previewSlide} slideNumber={1} totalSlides={formData.slideCount} />
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p>주제를 입력하면 미리보기가 표시됩니다</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>스타일:</span>
                <span className="font-medium">{formData.style}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>언어:</span>
                <span className="font-medium">{formData.language === 'ko' ? '한국어' : '중국어'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>슬라이드 수:</span>
                <span className="font-medium">{formData.slideCount}장</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneratorPage; 