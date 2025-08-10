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
    try { console.log('🔵 [RECORD] Starting recognition'); } catch {}
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }
    // 마이크 캡처 시작(녹음 파일 확보)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      try { console.log('🟢 [RECORD] Microphone access granted'); } catch {}
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
      try { console.log('🟢 [RECORD] MediaRecorder created:', mr.state, { chosen }); } catch {}
      setRecordedChunks([]);
      recChunksRef.current = [];
      setRecordedBlob(null);
      recognizedStableRef.current = '';
      setRecognizedText('');
      mr.ondataavailable = (e) => {
        try { console.log('🔵 [RECORD] Data available:', e?.data?.size); } catch {}
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
      try { console.log('🟢 [RECORD] Recording started'); } catch {}
      setMediaRecorder(mr);
    } catch (e) {
      console.warn('마이크 접근 실패', e);
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
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopRecognition = async () => {
    try {
      console.log('🔵 [RECORD] Stopping recognition');
      console.log('🔵 [RECORD] Current chunks:', recordedChunks.length);
    } catch {}
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
            try {
              console.log('🟢 [RECORD] MediaRecorder stopped');
              console.log('🔵 [RECORD] Final chunks in onstop(ref):', recChunksRef.current.length);
            } catch {}
            const fallbackType = recorderMimeType || ((recChunksRef.current[0] as any)?.type) || 'audio/webm;codecs=opus';
            try {
              const srcList = recChunksRef.current.length > 0 ? recChunksRef.current : recordedChunks;
              const blob = srcList.length > 0 ? new Blob(srcList, { type: fallbackType }) : null;
              audioBlob = blob && blob.size > 0 ? blob : (recordedBlob || null);
              if (audioBlob) { console.log('🟢 [RECORD] Blob ready:', { size: audioBlob.size, type: audioBlob.type }); }
              else { console.error('🔴 [RECORD] No chunks in onstop callback'); }
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
      const reference = opposite || primary || '';
      try {
        console.log('🔵 Recorded blob:', recordedBlob);
        console.log('🔵 Blob size:', recordedBlob?.size);
        console.log('🔵 Blob type:', recordedBlob?.type);
      } catch {}
      const pron = await evaluatePronunciation(recordedBlob, recognizedText, reference, language === 'ko' ? 'zh' : 'ko');
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
              <Button variant="outline" size="sm" onClick={handlePlayPause} disabled={!slideAudioUrl} title="원문 음성을 재생합니다">
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
                  onClick={startRecognition}
                  data-tour="ip-record"
                  title={`나의 통역을 녹음합니다${!import.meta.env.VITE_AZURE_SPEECH_KEY ? ' (Azure 키 없음: 발음 평가는 텍스트 추정)' : ''}`}
                >
                  <Mic size={16} />
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={stopRecognition} data-tour="ip-record" title="녹음을 중지하고 결과 확인">
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
            <h4 className="font-semibold text-blue-800">내 통역 (녹음 인식 결과)</h4>
            <div className="flex items-center gap-2">
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
                  {[{label:'정확도', value: evalResult.pron.accuracy}, {label:'유창성', value: evalResult.pron.fluency}, {label:'운율', value: evalResult.pron.prosody ?? 0}].map((it, idx) => (
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
          </div>
        )}
      </div>
    </div>
  );
};

export default InterpreterPanel;