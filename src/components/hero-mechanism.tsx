import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BadgeCheck, CircleDashed, Mic, Pause, Play, Scale } from "lucide-react";

import { PriorityChip } from "@/components/priority-chip";
import { cn } from "@/lib/utils";

/**
 * The hero mechanism: a live, scrubbable walkthrough of how DecisionTwin
 * works, built out of the same tokens as the product itself.
 *
 * A stylised resume is read line by line; one line is highlighted, a thread
 * draws from it to a role criterion, a Verified seal lands, a second criterion
 * finds nothing and becomes an interview question, and a human decision is
 * recorded. The whole thing loops gently and never blocks the visitor: hover
 * or click any criterion to replay its step, drag the timeline to scrub, and
 * the play/pause control stops or starts the loop.
 *
 * Under prefers-reduced-motion it renders the settled, composed state directly
 * — highlighted line, drawn thread, verified seal — with no animation.
 */
export function HeroMechanism() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const interactingRef = useRef(false);

  const reduced = prefersReduced;
  const effectiveT = reduced ? 1 : t;

  // The timeline is one pass through the mechanism, 0 → 1, looping.
  const W = {
    reveal: [0.0, 0.06],
    line: [0.06, 0.12],
    thread1: [0.12, 0.22],
    verified: [0.22, 0.3],
    scan: [0.3, 0.38],
    amber: [0.38, 0.46],
    question: [0.46, 0.56],
    decision: [0.58, 0.68],
  } as const;

  const progress = (start: number, end: number): number => {
    const raw = (effectiveT - start) / (end - start);
    return Math.min(1, Math.max(0, raw));
  };

  const revealP = progress(W.reveal[0], W.reveal[1]);
  const lineP = progress(W.line[0], W.line[1]);
  const thread1P = progress(W.thread1[0], W.thread1[1]);
  const verifiedP = progress(W.verified[0], W.verified[1]);
  const scanP = progress(W.scan[0], W.scan[1]);
  const amberP = progress(W.amber[0], W.amber[1]);
  const questionP = progress(W.question[0], W.question[1]);
  const decisionP = progress(W.decision[0], W.decision[1]);

  // Gentle autoplay. It pauses the instant the visitor reaches for anything,
  // so the animation can never block the page.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = performance.now();
    const SPEED = 0.105;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (playing && !interactingRef.current) {
        setT((prev) => {
          const next = prev + dt * SPEED;
          return next >= 1 ? next - 1 : next;
        });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced]);

  // Measure where the threads must connect: the highlighted resume line on the
  // left, the criterion cards on the right. Re-measured whenever the stage or
  // window resizes.
  const stageRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [paths, setPaths] = useState<{
    w: number;
    h: number;
    t1: { x1: number; y1: number; x2: number; y2: number };
    t2: { x1: number; y1: number; x2: number; y2: number };
  } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const stage = stageRef.current;
      const resume = resumeRef.current;
      const line = lineRefs.current[3];
      const card0 = cardRefs.current[0];
      const card1 = cardRefs.current[1];
      if (!stage || !resume || !line || !card0 || !card1) return;

      const sr = stage.getBoundingClientRect();
      const rel = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height };
      };
      const lr = rel(line);
      const r0 = rel(card0);
      const r1 = rel(card1);
      const rs = rel(resume);

      setPaths({
        w: sr.width,
        h: sr.height,
        t1: {
          x1: lr.x + lr.w,
          y1: lr.y + lr.h / 2,
          x2: r0.x,
          y2: r0.y + r0.h / 2,
        },
        t2: {
          x1: rs.x + rs.w,
          y1: rs.y + rs.h * 0.55,
          x2: r1.x,
          y2: r1.y + r1.h / 2,
        },
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (stageRef.current) ro.observe(stageRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const curve = (x1: number, y1: number, x2: number, y2: number) =>
    `M ${x1} ${y1} C ${x1 + 64} ${y1}, ${x2 - 64} ${y2}, ${x2} ${y2}`;

  const focusCriterion = useCallback((index: number) => {
    interactingRef.current = true;
    // Jump to the step where that criterion is doing its work.
    const target =
      index === 0 ? 0.16 : index === 1 ? 0.42 : 0.62;
    setT(target);
  }, []);

  const releaseCriterion = useCallback(() => {
    interactingRef.current = false;
  }, []);

  const LINES = [
    "Priya Menon — Platform Engineer, Bengaluru",
    "Seven years building internal developer platforms.",
    "Senior Platform Engineer, Northwind Payments, 2021–present",
    "Owned the partner-facing REST API end to end, including versioning and deprecation policy.",
    "Served as on-call lead for the payments gateway.",
    "Designed the normalised schema for the shipment tracking service.",
  ];

  const CRITERIA = [
    {
      label: "API ownership",
      required: true,
      question: "",
    },
    {
      label: "Production Kubernetes",
      required: true,
      question: "Which production Kubernetes workloads have you operated?",
    },
    {
      label: "Data modelling",
      required: false,
      question: "",
    },
  ];

  return (
    <div
      ref={stageRef}
      className="card-surface relative overflow-hidden rounded-3xl border-2 p-4 shadow-lift md:p-5"
      style={{
        opacity: 0.3 + revealP * 0.7,
        transform: `translateY(${(1 - revealP) * 14}px)`,
        transition: "opacity 300ms ease, transform 300ms ease",
      }}
    >
      {/* Case header */}
      <div
        className="flex items-center justify-between gap-3 border-b-2 border-line pb-3"
        style={{ opacity: revealP, transition: "opacity 300ms ease" }}
      >
        <div>
          <p className="eyebrow">Hiring case</p>
          <p className="font-serif text-xl font-semibold tracking-tight text-ink">
            Platform Engineer
          </p>
        </div>
        <span className="rounded-full bg-canvas-deep px-3 py-1.5 font-mono text-2xs font-semibold text-ink">
          PRIYA MENON
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row">
        {/* Stylised resume */}
        <div
          ref={resumeRef}
          className="w-full shrink-0 rounded-2xl border-2 border-line bg-surface p-3.5 sm:w-[46%]"
        >
          <p className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
            Resume · numbered lines
          </p>
          <ol className="space-y-1">
            {LINES.map((text, index) => {
              const isFoundLine = index === 3;
              const highlighted = isFoundLine && lineP > 0;
              const scanning = index >= 3 && index <= 5 && scanP > 0 && !isFoundLine;
              return (
                <li
                  key={text}
                  ref={(node) => {
                    lineRefs.current[index] = node;
                  }}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border-2 border-transparent px-2 py-1 transition-colors duration-200",
                    highlighted && "border-peach-foreground/30 bg-peach",
                    scanning && "border-uncertain/30 bg-uncertain-soft",
                  )}
                  style={{
                    opacity:
                      (0.55 + 0.45 * revealP) * (highlighted ? 1 : scanning ? 0.85 : 1),
                  }}
                >
                  <span className="w-4 shrink-0 select-none text-right font-mono text-2xs tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-2xs leading-5",
                      highlighted ? "text-ink" : "text-muted-foreground",
                    )}
                  >
                    {text}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Role criteria */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
          {CRITERIA.map((criterion, index) => {
            const linked = index === 0 && thread1P > 0;
            const verified = index === 0 && verifiedP > 0;
            const amber = index === 1 && amberP > 0;
            const question = index === 1 && questionP > 0;

            return (
              <div key={criterion.label} className="relative">
                <button
                  type="button"
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  onClick={() => focusCriterion(index)}
                  onPointerEnter={() => focusCriterion(index)}
                  onPointerLeave={releaseCriterion}
                  onFocus={() => focusCriterion(index)}
                  onBlur={releaseCriterion}
                  aria-label={`Replay how ${criterion.label} is assessed`}
                  className={cn(
                    "w-full rounded-2xl border-2 px-4 py-3 text-left transition-colors duration-200",
                    verified
                      ? "border-supported/40 bg-supported-soft"
                      : amber
                        ? "border-uncertain/40 bg-uncertain-soft"
                        : linked
                          ? "border-brand/40 bg-card"
                          : "border-line bg-card",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        verified ? "text-supported" : amber ? "text-uncertain" : "text-ink",
                      )}
                    >
                      {criterion.label}
                    </span>
                    <PriorityChip required={criterion.required} />
                  </div>

                  <span className="mt-1.5 block text-2xs leading-relaxed text-muted-foreground">
                    {verified ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-supported">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified — quote checked against lines 4–5
                      </span>
                    ) : amber ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-uncertain">
                        <CircleDashed className="h-3.5 w-3.5" />
                        No supporting evidence found in this document
                      </span>
                    ) : (
                      "Awaiting review"
                    )}
                  </span>
                </button>

                {/* Interview question, born from the amber criterion */}
                {question && (
                  <div
                    className="pop-in mt-2 flex items-start gap-2 rounded-xl border-2 border-interview/30 bg-interview-soft px-3 py-2"
                  >
                    <Mic className="mt-0.5 h-3.5 w-3.5 shrink-0 text-interview" />
                    <span className="text-2xs leading-relaxed text-interview">
                      Interview question: {CRITERIA[1].question}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Threads between the resume and the criteria */}
      {paths && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          width={paths.w}
          height={paths.h}
          aria-hidden
        >
          {/* Thread 1: a found citation. Draws, then stays. */}
          <path
            d={curve(paths.t1.x1, paths.t1.y1, paths.t1.x2, paths.t1.y2)}
            fill="none"
            stroke="hsl(var(--brand))"
            strokeWidth={3}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - thread1P}
            style={{ opacity: 0.9, transition: "stroke-dashoffset 60ms linear" }}
          />
          {/* Thread 2: the search that finds nothing. Dashes, then fades. */}
          <path
            d={curve(paths.t2.x1, paths.t2.y1, paths.t2.x2, paths.t2.y2)}
            fill="none"
            stroke="hsl(var(--uncertain))"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.01 0.03"
            pathLength={1}
            strokeDashoffset={1 - scanP}
            style={{
              opacity: scanP > 0 ? 0.85 * (1 - amberP * 0.85) : 0,
              transition: "opacity 200ms ease",
            }}
          />
        </svg>
      )}

      {/* The human decision */}
      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t-2 border-line pt-3.5"
        style={{
          opacity: decisionP,
          transform: `translateY(${(1 - decisionP) * 12}px)`,
          transition: "opacity 300ms ease, transform 300ms ease",
        }}
      >
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink">
          <Scale className="h-4 w-4 text-brand-deep" />
          Decision recorded
        </span>
        <span className="text-xs text-muted-foreground">
          Move forward with interview questions · Meera Iyer · 18 Sep
        </span>
      </div>

      {/* Controls: replay, scrub, pause. Hidden for the reduced-motion version. */}
      {!reduced && (
        <div className="mt-3 flex items-center gap-3 border-t-2 border-line pt-2.5">
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "Pause the demonstration" : "Play the demonstration"}
            className="inline-flex items-center gap-1.5 rounded-full bg-canvas-deep px-3 py-1.5 text-2xs font-semibold text-ink transition-colors hover:bg-peach"
          >
            {playing ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {playing ? "Pause" : "Play"}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(effectiveT * 100)}
            aria-label="Scrub through the demonstration"
            onChange={(event) => setT(Number(event.target.value) / 100)}
            onPointerDown={() => {
              interactingRef.current = true;
            }}
            onPointerUp={releaseCriterion}
            onFocus={() => {
              interactingRef.current = true;
            }}
            onBlur={releaseCriterion}
            className="h-2 min-w-0 flex-1 cursor-pointer accent-[hsl(var(--brand))]"
          />
          <span className="text-2xs tabular-nums text-muted-foreground">
            {Math.round(effectiveT * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
