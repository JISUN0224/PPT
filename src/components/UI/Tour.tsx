import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';

type TourStep = {
  id: string;
  title: string;
  description: string;
  targetSelector: string; // e.g., '[data-tour="viewer"]'
  padding?: number; // highlight padding
};

interface TourProps {
  steps: TourStep[];
  visible: boolean;
  onClose: (opts?: { dontShowAgain?: boolean }) => void;
}

function useTargetRect(selector: string, padding: number) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useMemo(() => () => {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const padded = new DOMRect(
      Math.max(0, r.left - padding),
      Math.max(0, r.top - padding),
      r.width + padding * 2,
      r.height + padding * 2
    );
    setRect(padded);
  }, [selector, padding]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    const id = window.setInterval(measure, 250);
    return () => {
      window.removeEventListener('resize', measure);
      window.clearInterval(id);
    };
  }, [measure]);

  return rect;
}

const Tour: React.FC<TourProps> = ({ steps, visible, onClose }) => {
  const [index, setIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const step = steps[index];
  const padding = step?.padding ?? 8;
  const rect = useTargetRect(step?.targetSelector || '', padding);

  useEffect(() => {
    if (!visible) setIndex(0);
  }, [visible]);

  if (!visible || !step) return null;

  // Tooltip positioning: default below the target, fallback above
  const tooltipStyle: React.CSSProperties = {};
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (rect) {
    const preferBelowTop = rect.top + rect.height + 16;
    const preferLeft = Math.min(rect.left, vw - 360 - 16);
    if (preferBelowTop + 140 < vh) {
      tooltipStyle.top = preferBelowTop;
      tooltipStyle.left = preferLeft;
    } else {
      tooltipStyle.top = Math.max(16, rect.top - 156);
      tooltipStyle.left = preferLeft;
    }
  } else {
    tooltipStyle.top = 80;
    tooltipStyle.left = 16;
  }

  return (
    <div className="fixed inset-0 z-[1000]">
      {/* Dim background */}
      <div className="absolute inset-0 bg-black/50" onClick={() => onClose()} />

      {/* Highlight box */}
      {rect && (
        <div
          className="absolute rounded-xl border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, pointerEvents: 'none' }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute w-[340px] max-w-[92vw] bg-white rounded-xl shadow-xl border p-4"
        style={tooltipStyle}
        role="dialog"
        aria-live="polite"
      >
        <div className="text-xs text-gray-500 mb-1">단계 {index + 1} / {steps.length}</div>
        <h4 className="text-base font-semibold text-gray-900 mb-2">{step.title}</h4>
        <p className="text-sm text-gray-700 mb-4">{step.description}</p>
        <label className="flex items-center gap-2 text-xs text-gray-600 mb-3 select-none">
          <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} />
          다시 보지 않기
        </label>
        <div className="flex justify-between">
          <button
            className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
            onClick={() => onClose({ dontShowAgain })}
          >
            건너뛰기
          </button>
          <div className="space-x-2">
            <button
              className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => setIndex(i => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              이전
            </button>
            {index < steps.length - 1 ? (
              <button
                className="text-sm px-3 py-1.5 rounded bg-[var(--primary-brown)] text-white hover:brightness-110"
                onClick={() => setIndex(i => Math.min(steps.length - 1, i + 1))}
              >
                다음
              </button>
            ) : (
              <button
                className="text-sm px-3 py-1.5 rounded bg-[var(--primary-brown)] text-white hover:brightness-110"
                onClick={() => onClose({ dontShowAgain })}
              >
                시작하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tour;


