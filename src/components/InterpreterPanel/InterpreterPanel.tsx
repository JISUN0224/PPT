import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../UI';
import { Play, Pause, Mic, Square } from 'lucide-react';

interface InterpreterPanelProps {
  language: 'ko' | 'zh'; // 원문 언어
  slide: any | null;
  slideAudioUrl?: string | null;
}

const getPrimarySecondaryNames = (lang: 'ko' | 'zh') => ({
  primary: lang === 'ko' ? '한국어' : '중국어',
  secondary: lang === 'ko' ? '중국어' : '한국어',
});

const InterpreterPanel: React.FC<InterpreterPanelProps> = ({ language, slide, slideAudioUrl }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');

  const names = useMemo(() => getPrimarySecondaryNames(language), [language]);

  useEffect(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [slideAudioUrl, slide?.slideNumber]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // 간단한 Web Speech API 인식 (Chrome 계열)
  const recognitionRef = useRef<any>(null);
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const startRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }
    const recognition = new SpeechRecognition();
    // 인식 언어를 뷰어 스크립트의 반대 언어로 설정
    recognition.lang = language === 'ko' ? 'zh-CN' : 'ko-KR';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setRecognizedText(transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  // 원문 스크립트(뷰어 언어)와 통역안(반대 언어)을 분리해 표시
  const primaryScript: string | undefined = language === 'ko'
    ? (slide?.koreanScript || slide?.content)
    : (slide?.chineseScript || slide?.content);
  // 통역안은 generatePPTScripts/mergePPTData에서 항상 slide.interpretation에 저장됩니다.
  // 필요 시 보조적으로 koreanScript를 폴백으로 사용합니다.
  const oppositeScript: string | undefined = language === 'ko'
    ? (slide?.interpretation || '')
    : (slide?.interpretation || slide?.koreanScript || '');

  // 간단 평가는 통역 목표(반대 언어) 문장과 비교
  const expectedScript: string | undefined = oppositeScript || primaryScript;
  const keyPoints: string[] = Array.isArray(slide?.keyPoints) ? slide.keyPoints : [];

  const simpleScore = useMemo(() => {
    if (!expectedScript || !recognizedText) return 0;
    const exp = expectedScript.replace(/\s+/g, '');
    const rec = recognizedText.replace(/\s+/g, '');
    let match = 0;
    const len = Math.min(exp.length, rec.length);
    for (let i = 0; i < len; i++) if (exp[i] === rec[i]) match++;
    return Math.round((match / exp.length) * 100);
  }, [expectedScript, recognizedText]);

  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[var(--primary-brown)]">통역 연습</h3>
            <p className="text-sm text-gray-600">원문: {names.primary} · 통역: {names.secondary}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(o => !o)}>
              {open ? '패널 접기' : '패널 열기'}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePlayPause} disabled={!slideAudioUrl}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </Button>
            {!isRecording ? (
              <Button variant="primary" size="sm" onClick={startRecognition}>
                <Mic size={16} />
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={stopRecognition}>
                <Square size={16} />
              </Button>
            )}
          </div>
        </div>
        <audio ref={audioRef} src={slideAudioUrl || undefined} onEnded={() => setIsPlaying(false)} hidden />
      </div>

      {open && (
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-[var(--primary-brown)] mb-2">스크립트 ({names.primary})</h4>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{primaryScript || '스크립트가 없습니다.'}</p>
        </div>

        <div className="bg-[var(--background)] rounded-lg p-4">
          <h4 className="font-semibold text-[var(--primary-brown)] mb-2">통역안 ({names.secondary})</h4>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{oppositeScript || '통역안이 없습니다.'}</p>
        </div>

        {keyPoints.length > 0 && (
          <div className="bg-[var(--background)] rounded-lg p-4">
            <h4 className="font-semibold text-[var(--primary-brown)] mb-2">핵심 포인트</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              {keyPoints.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">내 통역 (녹음 인식 결과)</h4>
          <p className="text-sm leading-relaxed text-blue-800 min-h-[48px] whitespace-pre-wrap">{recognizedText || '여기에 음성 인식 결과가 표시됩니다.'}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-2">간단 평가</h4>
          <p className="text-sm text-green-800">일치도: {simpleScore}%</p>
          <p className="text-xs text-green-700">참고: 문자 일치 기반의 간단한 지표입니다.</p>
        </div>
      </div>
      )}
    </div>
  );
};

export default InterpreterPanel;