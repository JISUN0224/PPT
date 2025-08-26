import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../UI';
import { Play, Pause, Mic, Square } from 'lucide-react';
import { evaluatePronunciation, evaluateContent, combineScores } from '../../services/evalService';

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
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const recognizedStableRef = useRef<string>('');
  const [recordedChunks, setRecordedChunks] = useState<BlobPart[]>([]);
  const recChunksRef = useRef<BlobPart[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const recordedAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isRecordedPlaying, setIsRecordedPlaying] = useState(false);
  const [recorderMimeType, setRecorderMimeType] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<{ overall: number; pron?: any; content?: any } | null>(null);

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

  const startRecognition = async () => {
    // debug trimmed
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }
    // 마이크 캡처 시작(녹음 파일 확보)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // debug trimmed
      // 브라우저 호환 가능한 Opus 기반 형식 우선 선택(ogg → webm)
      const preferredOgg = 'audio/ogg;codecs=opus';
      const preferredWebm = 'audio/webm;codecs=opus';
      let chosen = '';
      if ((window as any).MediaRecorder && (window as any).MediaRecorder.isTypeSupported?.(preferredOgg)) {
        chosen = preferredOgg;
      } else if ((window as any).MediaRecorder && (window as any).MediaRecorder.isTypeSupported?.(preferredWebm)) {
        chosen = preferredWebm;
      }
      const mr = new MediaRecorder(stream, chosen ? { mimeType: chosen } as MediaRecorderOptions : undefined);
      setRecorderMimeType(chosen || '');
      // debug trimmed
      setRecordedChunks([]);
      recChunksRef.current = [];
      setRecordedBlob(null);
      recognizedStableRef.current = '';
      setRecognizedText('');
      mr.ondataavailable = (e) => {
        // debug trimmed
        if (e.data && e.data.size > 0) {
          // push synchronously to ref to avoid React state timing issues
          recChunksRef.current.push(e.data);
          setRecordedChunks(prev => [...prev, e.data]);
          // Direct blob capture to avoid timing issues
          try {
            const directType = (e.data as any)?.type || chosen || 'audio/webm;codecs=opus';
            const direct = new Blob([e.data], { type: directType });
            if (direct.size > 0) setRecordedBlob(prev => (direct.size >= (prev?.size || 0) ? direct : prev));
          } catch {}
        }
      };
      mr.start();
      // debug trimmed
      setMediaRecorder(mr);
    } catch (e) {
      console.warn('마이크 접근 실패');
    }
    const recognition = new SpeechRecognition();
    // 인식 언어를 뷰어 스크립트의 반대 언어로 설정
    recognition.lang = language === 'ko' ? 'zh-CN' : 'ko-KR';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event: any) => {
      let finalSeg = '';
      let interimSeg = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const seg = event.results[i][0].transcript || '';
        if (event.results[i].isFinal) finalSeg += seg; else interimSeg += seg;
      }
      if (finalSeg) recognizedStableRef.current += finalSeg;
      setRecognizedText((recognizedStableRef.current || '') + (interimSeg || ''));
    };
    // 인식 엔진이 일시 종료되더라도 녹음 자체는 유지되므로 UI 상태는 유지
    recognition.onend = () => {};
    recognition.onerror = () => {};
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const beginRecordWithCountdown = () => {
    if (isRecording) return;
    setCountdown(3);
    const id = window.setInterval(() => {
      setCountdown((prev) => {
        const next = (prev ?? 1) - 1;
        if (next <= 0) {
          window.clearInterval(id);
          setCountdown(null);
          void startRecognition();
        }
        return next;
      });
    }, 1000);
  };

  const stopRecognition = async () => {
    // debug trimmed
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    let audioBlob: Blob | null = null;
    if (mediaRecorder) {
      try {
        try { console.log('🔵 [RECORD] MediaRecorder state:', mediaRecorder.state); } catch {}
        await new Promise<void>((resolve) => {
          mediaRecorder.onstop = () => {
            // debug trimmed
            const fallbackType = recorderMimeType || ((recChunksRef.current[0] as any)?.type) || 'audio/webm;codecs=opus';
            try {
              const srcList = recChunksRef.current.length > 0 ? recChunksRef.current : recordedChunks;
              const blob = srcList.length > 0 ? new Blob(srcList, { type: fallbackType }) : null;
              audioBlob = blob && blob.size > 0 ? blob : (recordedBlob || null);
              // debug trimmed
            } catch {}
            resolve();
          };
          mediaRecorder.stop();
        });
      } catch {}
      setMediaRecorder(null);
    }
    setRecordedBlob(audioBlob);
    try {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      setRecordedAudioUrl(audioBlob ? URL.createObjectURL(audioBlob) : null);
    } catch {}
    setIsRecording(false);
    // 인식 종료 후 표시 텍스트를 안정화(최종 텍스트 유지)
    setRecognizedText(recognizedStableRef.current || recognizedText);
  };

  const handleEvaluate = async () => {
    try {
      setIsEvaluating(true);
      // 참조 원문 구성: 우선 통역 대상 언어(반대 언어)의 스크립트, 없으면 현재 슬라이드의 원문 스크립트로 폴백
      const primary = language === 'ko'
        ? (slide?.koreanScript || slide?.content || '')
        : (slide?.chineseScript || slide?.content || '');
      const opposite = language === 'ko'
        ? (slide?.interpretation || '')
        : (slide?.interpretation || slide?.koreanScript || '');
      // 내용 평가는 원문과 비교(통역 연습 특성상 AI 통역안 어휘에 종속되지 않도록)
      const reference = primary || opposite || '';
      // trimmed: recorded blob info
      const pron = await evaluatePronunciation(recordedBlob, recognizedText, language === 'ko' ? 'zh' : 'ko');
      const content = await evaluateContent(recognizedText, reference, language === 'ko' ? 'zh' : 'ko');
      const overall = combineScores(pron, content);
      setEvalResult({ overall, pron, content });
    } catch (e) {
      console.warn('[Eval] failed', e);
      setEvalResult(null);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleResetRecognition = () => {
    try {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    } catch {}
    try {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    } catch {}
    setIsRecording(false);
    setRecognizedText('');
    recognizedStableRef.current = '';
    setRecordedChunks([]);
    setRecordedBlob(null);
    try { if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl); } catch {}
    setRecordedAudioUrl(null);
    setIsRecordedPlaying(false);
    setEvalResult(null);
    setIsEvaluating(false);
  };

  const handleToggleRecordedPlayback = () => {
    const el = recordedAudioRef.current;
    if (!el || !recordedAudioUrl) return;
    if (isRecordedPlaying) {
      el.pause();
      setIsRecordedPlaying(false);
    } else {
      el.play();
      setIsRecordedPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      try { if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl); } catch {}
    };
  }, [recordedAudioUrl]);

  // 원문 스크립트(뷰어 언어)와 통역안(반대 언어)을 분리해 표시
  const primaryScript: string | undefined = language === 'ko'
    ? (slide?.koreanScript || slide?.content)
    : (slide?.chineseScript || slide?.content);
  // 통역안은 generatePPTScripts/mergePPTData에서 항상 slide.interpretation에 저장됩니다.
  // 필요 시 보조적으로 koreanScript를 폴백으로 사용합니다.
  const oppositeScript: string | undefined = language === 'ko'
    ? (slide?.interpretation || '')
    : (slide?.interpretation || slide?.koreanScript || '');

  // 간단 평가는 제거. 목표 스크립트와 핵심 포인트만 유지
  const keyPoints: string[] = Array.isArray(slide?.keyPoints) ? slide.keyPoints : [];

  const [showPrimary, setShowPrimary] = useState(true);
  const [showOpposite, setShowOpposite] = useState(true);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[var(--primary-brown)]">통역 연습</h3>
            <p className="text-sm text-gray-600">원문: {names.primary} · 통역: {names.secondary}</p>
          </div>
          <div className="flex items-center space-x-2"></div>
        </div>
        <audio ref={audioRef} src={slideAudioUrl || undefined} onEnded={() => setIsPlaying(false)} hidden />
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2" data-tour="ip-primary">
            <h4 className="font-semibold text-[var(--primary-brown)]">스크립트 ({names.primary})</h4>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPrimary(v => !v)} aria-expanded={showPrimary}>
                {showPrimary ? '접기' : '펼치기'}
            </Button>
              <Button variant="outline" size="sm" onClick={handlePlayPause} disabled={!slideAudioUrl} title="원문 음성을 재생합니다" data-tour="ip-play">
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </Button>
            </div>
          </div>
          {showPrimary && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{primaryScript || '스크립트가 없습니다.'}</p>
          )}
        </div>

        <div className="bg-[var(--background)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2" data-tour="ip-opposite">
            <h4 className="font-semibold text-[var(--primary-brown)]">통역안 ({names.secondary})</h4>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowOpposite(v => !v)} aria-expanded={showOpposite}>
                {showOpposite ? '접기' : '펼치기'}
              </Button>
            {!isRecording ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={beginRecordWithCountdown}
                  data-tour="ip-record"
                  title={`나의 통역을 녹음합니다${!import.meta.env.VITE_AZURE_SPEECH_KEY ? ' (Azure 키 없음: 발음 평가는 텍스트 추정)' : ''}`}
                  className="w-10 h-10 rounded-full bg-red-600 text-white p-0 hover:bg-red-700 focus:ring-red-500"
                  aria-label="녹음 시작"
                >
                <Mic size={16} />
              </Button>
            ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopRecognition}
                  data-tour="ip-record"
                  title="녹음을 중지하고 결과 확인"
                  className="w-10 h-10 rounded-full p-0 border-red-600 text-red-600 hover:bg-red-50 focus:ring-red-500"
                  aria-label="녹음 중지"
                >
                <Square size={16} />
              </Button>
            )}
          </div>
        </div>
          {showOpposite && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{oppositeScript || '통역안이 없습니다.'}</p>
          )}
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
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-blue-800">내 통역</h4>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={handleToggleRecordedPlayback} disabled={!recordedAudioUrl} title="방금 녹음한 내 통역을 재생합니다.">
                {isRecordedPlaying ? <Pause size={16} /> : <Play size={16} />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetRecognition} title="인식된 텍스트와 녹음 데이터를 초기화합니다.">초기화</Button>
              <Button variant="primary" size="sm" onClick={handleEvaluate} disabled={isRecording || (!recognizedText && !recordedBlob)} title="녹음 파일이 없으면 발음 평가는 텍스트 기반으로 간략 평가됩니다.">
                AI평가 요청
              </Button>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-blue-800 min-h-[48px] whitespace-pre-wrap">{recognizedText || '여기에 음성 인식 결과가 표시됩니다.'}</p>
          {/* 개인 녹음 오디오 플레이어 (숨김) */}
          <audio ref={recordedAudioRef} src={recordedAudioUrl || undefined} hidden onEnded={() => setIsRecordedPlaying(false)} />
        </div>

        {/* 평가 결과 */}
        {isEvaluating && (
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-1">평가 중...</h4>
            <p className="text-xs text-yellow-700">Azure 발음 평가 + AI 내용 평가를 수행 중입니다.</p>
          </div>
        )}

        {evalResult && (
          <div className="bg-white rounded-lg p-4 border">
            <h4 className="font-semibold text-gray-900 mb-3">📊 AI 평가 결과</h4>
            {/* 발음 평가 시각화 */}
            {evalResult.pron && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-gray-800">🎤 발음 평가 ({evalResult.pron.source === 'azure' ? 'Azure' : '텍스트 추정'})</div>
                </div>
                <div className="space-y-2">
                  {(() => {
                    const items: Array<{ label: string; value: number }> = [
                      { label: '정확도', value: evalResult.pron.accuracy },
                      { label: '유창성', value: evalResult.pron.fluency },
                    ];
                    if (evalResult.pron.prosody != null) {
                      items.push({ label: '운율', value: evalResult.pron.prosody });
                    }
                    return items;
                  })().map((it, idx) => (
                    <div key={idx} className="text-xs text-gray-700">
                      <div className="flex items-center justify-between mb-1">
                        <span>{it.label}</span>
                        <span>{it.value}/100</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded">
                        <div className={`${it.value>=80?'bg-green-500':it.value>=60?'bg-yellow-500':'bg-red-500'} h-2 rounded`} style={{ width: `${Math.max(0, Math.min(100, it.value))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* 내용 평가 시각화 */}
            {evalResult.content && (
              <div className="mb-3">
                <div className="font-medium text-gray-800 mb-1">📝 내용 평가 (AI)</div>
                <div className="space-y-2">
                  {[{label:'정확도', value: (evalResult.content as any).accuracy}, {label:'완성도', value: (evalResult.content as any).completeness}, {label:'자연스러움', value: (evalResult.content as any).fluency}].map((it, idx) => (
                    <div key={idx} className="text-xs text-gray-700">
                      <div className="flex items-center justify-between mb-1">
                        <span>{it.label}</span>
                        <span>{it.value}/100</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded">
                        <div className={`${it.value>=80?'bg-green-500':it.value>=60?'bg-yellow-500':'bg-red-500'} h-2 rounded`} style={{ width: `${Math.max(0, Math.min(100, it.value))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* 종합 점수 */}
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">종합 점수: {evalResult.overall}/100</div>
              <div className="text-xs text-gray-500">하이브리드(발음 50% + 내용 50%)</div>
            </div>
            {/* 요약/개선: 축약 + 토글 상세 */}
            {(evalResult.content?.summary || evalResult.content?.tips) && (
              <div className="mt-3">
                <div className="text-sm text-gray-800">✨ 요약: {evalResult.content?.summary}</div>
                <details className="mt-2">
                  <summary className="text-xs text-gray-600 cursor-pointer select-none">자세히 보기</summary>
                  <div className="mt-2 space-y-1">
                    {evalResult.content?.details && evalResult.content.details.length > 0 && (
                      <ul className="list-disc list-inside text-xs text-gray-700">
                        {evalResult.content.details.map((d: string, i: number) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    )}
                    {evalResult.content?.tips && (
                      <div className="text-xs text-gray-700">💡 개선 제안: {evalResult.content.tips}</div>
                    )}
                  </div>
                </details>
              </div>
            )}
            {/* Azure 세부 요약 (토글) */}
            {evalResult.pron?.words && evalResult.pron.words.length > 0 && (
              <details className="mt-3">
                <summary className="text-sm font-medium text-gray-800 cursor-pointer select-none">🔎 발음 상세 보기</summary>
                <div className="mt-2 space-y-3">
                  {/* Top3 문제 단어 */}
                  <div>
                    <div className="text-xs text-gray-600 mb-1">문제 단어 Top 3</div>
                    <div className="flex flex-wrap gap-2">
                      {[...evalResult.pron.words]
                        .sort((a: any, b: any) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
                        .slice(0, 3)
                        .map((w: any, i: number) => (
                          <span key={i} className={`px-2 py-1 rounded text-xs border ${w.accuracy < 60 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`} title={`정확도 ${w.accuracy}/100 • ${w.errorType || '오류'}`}>
                            {w.word}
                          </span>
                        ))}
                    </div>
                  </div>
                  {/* Prosody 미니바 */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Prosody(긴 정지 구간)</span>
                      <span>0:00 ~ {formatMs(totalDurationMs(evalResult.pron.words))}</span>
                    </div>
                    <div className="relative h-3 w-full bg-gray-100 rounded" aria-label="prosody bar">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="absolute top-0 h-3 border-l border-gray-200" style={{ left: `${i * 10}%` }} />
                      ))}
                      {(evalResult.pron.longPauses || []).map((p: any, idx: number) => {
                        const left = percentAtMs(p.startMs || 0, evalResult.pron.words);
                        const width = percentLenMs(p.durationMs || 0, evalResult.pron.words);
                        return (
                          <button
                            key={idx}
                            className="absolute top-0 h-3 bg-red-300 hover:bg-red-400 rounded"
                            style={{ left: `${left}%`, width: `${Math.max(1, width)}%` }}
                            title={`${formatMs(p.startMs)} · ${formatMs(p.durationMs)} ( ${p.beforeWord || ''} → ${p.afterWord || ''} )`}
                            onClick={() => seekToMs(p.startMs)}
                          />
                        );
                      })}
                    </div>
                  </div>
                  {/* 인식 텍스트 하이라이트 */}
                  {!!recognizedText && (
                    <div>
                      <div className="text-xs text-gray-600 mb-1">하이라이트(저득점 단어 표시)</div>
                      <p className="text-sm leading-relaxed">
                        {highlightByWords(recognizedText, evalResult.pron!.words || [], 70)}
                      </p>
                    </div>
                  )}
                  {/* 전체 보기 모달 트리거 */}
                  <PronDetailModalTrigger words={evalResult.pron.words} />
                </div>
              </details>
            )}
          </div>
        )}
      </div>
      {countdown !== null && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30">
          <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center text-4xl font-bold text-red-600">
            {countdown}
        </div>
      </div>
      )}
    </div>
  );
};

export default InterpreterPanel;

// ============== 내부 모달 컴포넌트 ==============
interface PronDetailModalProps { words: Array<{ word: string; accuracy: number; errorType?: string; phonemes?: Array<{ phoneme: string; accuracy?: number }> }> }
const PronDetailModalTrigger: React.FC<PronDetailModalProps> = ({ words }) => {
  const [open, setOpen] = useState(false);
  const top = [...words].sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));
  return (
    <>
      <button className="mt-2 text-xs px-2 py-1 rounded border text-gray-700 hover:bg-gray-50" onClick={() => setOpen(true)}>전체 보기</button>
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-4 w-[560px] max-w-[96vw] max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold text-gray-900">발음 상세</h5>
              <button className="text-sm px-2 py-1 rounded border" onClick={() => setOpen(false)}>닫기</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1">단어</th>
                  <th className="py-1">정확도</th>
                  <th className="py-1">오류</th>
                  <th className="py-1">음소</th>
                </tr>
              </thead>
              <tbody>
                {top.map((w, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1 pr-2">{w.word}</td>
                    <td className="py-1 pr-2">{w.accuracy}</td>
                    <td className="py-1 pr-2">{w.errorType || '-'}</td>
                    <td className="py-1 pr-2">
                      {Array.isArray(w.phonemes) && w.phonemes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {w.phonemes.slice(0, 6).map((p, idx) => (
                            <span key={idx} className={`px-1 rounded ${p.accuracy != null && p.accuracy < 60 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{p.phoneme}{p.accuracy != null ? `(${p.accuracy})` : ''}</span>
                          ))}
                          {w.phonemes.length > 6 && <span className="text-gray-400">…</span>}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

// ============== Prosody helpers ==============
function totalDurationMs(words?: Array<{ offsetMs?: number; durationMs?: number }>) {
  if (!words || words.length === 0) return 0;
  const last = words[words.length - 1];
  return (last.offsetMs || 0) + (last.durationMs || 0);
}
function percentAtMs(ms: number, words?: Array<{ offsetMs?: number; durationMs?: number }>) {
  const total = totalDurationMs(words);
  if (!total) return 0;
  return Math.min(98, Math.max(0, (ms / total) * 100));
}
function percentLenMs(ms: number, words?: Array<{ offsetMs?: number; durationMs?: number }>) {
  const total = totalDurationMs(words);
  if (!total) return 0;
  return Math.max(0.5, (ms / total) * 100);
}
function formatMs(ms?: number) {
  const v = Math.max(0, Math.round((ms || 0) / 1000));
  const m = Math.floor(v / 60);
  const s = v % 60;
  return `${String(m)}:${String(s).padStart(2, '0')}`;
}
function seekToMs(ms?: number) {
  // 재생 시킹(선택사항): 녹음 오디오가 있을 때 해당 시점으로 이동
  try {
    const audioEl = document.querySelector('audio[hidden]') as HTMLAudioElement | null;
    if (!audioEl || !ms) return;
    audioEl.currentTime = ms / 1000;
    audioEl.play?.();
  } catch {}
}

// ============== Highlight helper ==============
function highlightByWords(text: string, words: Array<{ word: string; accuracy: number; errorType?: string }>, threshold: number) {
  if (!text) return null;
  // 1) 저득점 단어 정규화 목록
  const lows = words
    .filter(w => (w.accuracy ?? 100) < threshold)
    .map(w => normalizeWord(w.word || ''))
    .filter(s => s.length > 0);
  if (lows.length === 0) return <span>{text}</span>;
  // 2) 길이순 정렬 후 매칭
  const uniqLows = Array.from(new Set(lows)).sort((a, b) => b.length - a.length);
  return processAllMatches(text, words, uniqLows, threshold);
}

function normalizeWord(word: string): string {
  return (word || '')
    .trim()
    .toLowerCase()
    // 영문/숫자/한중일 문자는 유지, 나머지 제거
    .replace(/[^\w\u4e00-\u9fff\u3400-\u4dbf\u3130-\u318f\u1100-\u11ff]/g, '')
    .replace(/\s+/g, '');
}

function findExactMatches(text: string, targetWord: string): Array<{ start: number; end: number; matched: string }> {
  const matches: Array<{ start: number; end: number; matched: string }> = [];
  const normalizedText = text.toLowerCase();
  const normalizedTarget = targetWord.toLowerCase();
  let startIndex = 0;
  while (true) {
    const index = normalizedText.indexOf(normalizedTarget, startIndex);
    if (index === -1) break;
    matches.push({ start: index, end: index + normalizedTarget.length, matched: text.slice(index, index + normalizedTarget.length) });
    startIndex = index + 1;
  }
  return matches;
}

function findPartialMatches(text: string, targetWord: string): Array<{ start: number; end: number; matched: string }> {
  const matches: Array<{ start: number; end: number; matched: string }> = [];
  const cleanTarget = normalizeWord(targetWord);
  const tokens = text.split(/\s+/);
  let cursor = 0;
  for (const token of tokens) {
    const cleanTok = normalizeWord(token);
    const pos = text.indexOf(token, cursor);
    if (pos >= 0) {
      if ((cleanTok.includes(cleanTarget) || cleanTarget.includes(cleanTok)) && cleanTok.length >= 2 && cleanTarget.length >= 2) {
        matches.push({ start: pos, end: pos + token.length, matched: token });
      }
      cursor = pos + token.length;
    }
  }
  return matches;
}

function calculateSimilarity(a: string, b: string): number {
  const s1 = a; const s2 = b;
  const n = s1.length; const m = s2.length;
  if (n === 0) return m === 0 ? 1 : 0;
  if (m === 0) return 0;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const distance = dp[n][m];
  const maxLen = Math.max(n, m);
  return (maxLen - distance) / maxLen;
}

function findSimilarMatches(text: string, targetWord: string): Array<{ start: number; end: number; matched: string }> {
  const matches: Array<{ start: number; end: number; matched: string }> = [];
  const tokens = text.split(/\s+/);
  let cursor = 0;
  for (const token of tokens) {
    const sim = calculateSimilarity(normalizeWord(token), normalizeWord(targetWord));
    const pos = text.indexOf(token, cursor);
    if (pos >= 0) {
      if (sim >= 0.7 && Math.abs(token.length - targetWord.length) <= 2) {
        matches.push({ start: pos, end: pos + token.length, matched: token });
      }
      cursor = pos + token.length;
    }
  }
  return matches;
}

function processAllMatches(text: string, words: Array<{ word: string; accuracy: number; errorType?: string }>, targets: string[], _threshold: number): React.ReactNode[] {
  const all: Array<{ start: number; end: number; word: string; info?: { accuracy: number; errorType?: string } }> = [];
  for (const t of targets) {
    const exact = findExactMatches(text, t);
    const partial = exact.length === 0 ? findPartialMatches(text, t) : [];
    const similar = exact.length === 0 && partial.length === 0 ? findSimilarMatches(text, t) : [];
    const info = words.find(w => normalizeWord(w.word || '') === normalizeWord(t));
    [...exact, ...partial, ...similar].forEach(m => all.push({ start: m.start, end: m.end, word: t, info }));
  }
  const uniq = all.sort((a, b) => a.start - b.start).filter((m, i, arr) => i === 0 || m.start >= arr[i - 1].end);
  const nodes: React.ReactNode[] = [];
  let last = 0;
  uniq.forEach((m, idx) => {
    if (m.start > last) nodes.push(<span key={`t-${idx}`}>{text.slice(last, m.start)}</span>);
    nodes.push(
      <span key={`h-${idx}`} className="bg-red-100 text-red-800 px-0.5 rounded border border-red-200" title={`"${m.word}" 정확도 ${m.info?.accuracy ?? '-'} / ${m.info?.errorType || '오류'}`}>{text.slice(m.start, m.end)}</span>
    );
    last = m.end;
  });
  if (last < text.length) nodes.push(<span key="t-final">{text.slice(last)}</span>);
  return nodes;
}