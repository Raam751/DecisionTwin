import { useCallback, useEffect, useRef, useState } from "react";

export const HERO_DURATION = 1000 / 0.0525;

/** One clock for every visual layer. React only receives integer progress. */
export function useHeroTimeline() {
  const stageRef = useRef<HTMLDivElement>(null);
  const animations = useRef<Animation[]>([]);
  const position = useRef(0);
  const [percent, setPercent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const seek = useCallback((value: number) => {
    position.current = Math.max(0, Math.min(1, value));
    animations.current.forEach((animation) => { animation.currentTime = (position.current === 1 ? .94 : position.current) * HERO_DURATION; });
    setPercent(Math.round(position.current * 100));
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => setReduced(media.matches);
    media.addEventListener("change", onMotionChange);
    const stage = stageRef.current;
    if (!stage) return () => media.removeEventListener("change", onMotionChange);
    animations.current = stage.getAnimations({ subtree: true });
    animations.current.forEach((animation) => animation.pause());
    let inViewport = true;
    const updateVisibility = () => setVisible(inViewport && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      updateVisibility();
    });
    observer.observe(stage);
    document.addEventListener("visibilitychange", updateVisibility);
    updateVisibility();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
      media.removeEventListener("change", onMotionChange);
      animations.current = [];
    };
  }, []);

  useEffect(() => {
    if (reduced) {
      seek(0.94);
      return;
    }
    if (!playing || !visible) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(now - last, 50);
      last = now;
      seek((position.current + elapsed / HERO_DURATION) % 1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, visible, reduced, seek]);

  const inspect = useCallback((value: number) => {
    if (reduced) return;
    setPlaying(false);
    seek(value);
  }, [seek, reduced]);

  return { stageRef, percent: reduced ? 94 : percent, playing, reduced, seek, inspect, setPlaying };
}
