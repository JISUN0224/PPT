import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Loading } from '../components/UI';

interface GeneratePPTParams {
  topic: string;
  details?: string;
  style: 'business' | 'academic' | 'creative' | 'technical';
  slideCount: number;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<GeneratePPTParams>({
    topic: '',
    details: '',
    style: 'business',
    slideCount: 2
  });

  const handleGenerate = async () => {
    if (!formData.topic.trim()) return;
    
    setIsGenerating(true);
    
    // 시뮬레이션을 위한 지연
    setTimeout(() => {
      setIsGenerating(false);
      navigate('/viewer', { state: { pptData: generateMockPPT(formData) } });
    }, 2000);
  };

  const generateMockPPT = (params: GeneratePPTParams) => {
    return {
      title: params.topic,
      slides: [
        {
          slideNumber: 1,
          type: 'title',
          title: params.topic,
          subtitle: 'AI 기반 프레젠테이션'
        },
        {
          slideNumber: 2,
          type: 'content',
          title: '주요 내용',
          points: [
            '첫 번째 핵심 포인트',
            '두 번째 핵심 포인트',
            '세 번째 핵심 포인트'
          ]
        },
        {
          slideNumber: 3,
          type: 'chart',
          title: '데이터 분석',
          chartType: 'bar',
          chartData: {
            labels: ['항목 1', '항목 2', '항목 3'],
            datasets: [{
              label: '수치',
              data: [65, 59, 80],
              backgroundColor: ['#8B4513', '#A0937D', '#D4B5A0']
            }]
          }
        },
        {
          slideNumber: 4,
          type: 'comparison',
          title: '비교 분석',
          content: '여러 관점에서의 분석 결과를 제시합니다.'
        },
        {
          slideNumber: 5,
          type: 'conclusion',
          title: '결론',
          content: '프레젠테이션의 핵심 메시지를 요약합니다.'
        }
      ]
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--cream)]">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="luxe-title mb-4">AI PPT 생성기</h1>
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
                   <option value={2}>2장</option>
                   <option value={3}>3장</option>
                   <option value={4}>4장</option>
                   <option value={5}>5장</option>
                   <option value={6}>6장</option>
                 </select>
               </div>
              
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !formData.topic.trim()}
                size="lg"
                className="w-full"
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loading size="sm" text="" />
                    <span>생성 중...</span>
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
              {formData.topic ? (
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-[var(--primary-brown)] mb-4">
                    {formData.topic}
                  </h3>
                  <p className="text-[var(--secondary-brown)]">
                    {formData.slideCount}장의 슬라이드로 구성된 {formData.style} 스타일 프레젠테이션
                  </p>
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

export default Home; 