import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type UseAutoFitScaleOptions = {
  maxScale?: number; // default 1
  paddingRatio?: number; // default 0.98 (2% 여유)
};

export function useAutoFitScale(options?: UseAutoFitScaleOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState<number>(1);

  const { maxScale, paddingRatio } = useMemo(
    () => ({ maxScale: options?.maxScale ?? 1.1, paddingRatio: options?.paddingRatio ?? 0.99 }),
    [options?.maxScale, options?.paddingRatio]
  );

  const recalc = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const sw = content.scrollWidth || content.clientWidth || 1;
    const sh = content.scrollHeight || content.clientHeight || 1;
    if (cw <= 0 || ch <= 0 || sw <= 0 || sh <= 0) return;
    const ratioW = cw / sw;
    const ratioH = ch / sh;
    const next = Math.min(ratioW, ratioH, maxScale) * paddingRatio;
    // avoid micro jitters
    const rounded = Math.max(0.1, Math.min(1, Math.round(next * 1000) / 1000));
    setScale(rounded);
  }, [maxScale, paddingRatio]);

  useEffect(() => {
    const ro = new (window as any).ResizeObserver?.(() => recalc());
    if (containerRef.current && ro) ro.observe(containerRef.current);
    if (contentRef.current && ro) ro.observe(contentRef.current);
    window.addEventListener('resize', recalc);
    const id = window.setTimeout(recalc, 0);
    return () => {
      window.removeEventListener('resize', recalc);
      window.clearTimeout(id);
      try {
        ro && ro.disconnect();
      } catch {}
    };
  }, [recalc]);

  return { containerRef, contentRef, scale } as const;
}


