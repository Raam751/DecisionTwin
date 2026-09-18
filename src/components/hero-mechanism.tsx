import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  CircleDashed,
  FileText,
  Link2,
  Mic,
  Pause,
  Play,
  Scale,
  Search,
} from "lucide-react";

import { PriorityChip } from "@/components/priority-chip";
import { cn } from "@/lib/utils";

interface Point {
  x: number;
  y: number;
}

/** Point on a cubic bezier at parameter u (0 → 1). */
function bezierAt(u: number, p0: Point, c1: Point, c2: Point, p1: Point): Point {
  const mt = 1 - u;
  return {
    x:
      mt * mt * mt * p0.x +
      3 * mt * mt * u * c1.x +
      3 * mt * u * u * c2.x +
      u * u * u * p1.x,
    y:
      mt * mt * mt * p0.y +
      3 * mt * mt * u * c1.y +
      3 * mt * u * u * c2.y +
      u * u * u * p1.y,
  };
}

/**
 * The hero mechanism: a live, scrubbable walkthrough of how DecisionTwin
 * works, built out of the same tokens as the product itself.
 *
 * The document is read line by line. Two claims are pulled out, threaded to
 * their criteria and verified; a third criterion is searched for and found
 * absent, so it becomes an interview question; then a human decision is
 * recorded and the case settles. It loops gently at half speed, and never
 * blocks the visitor: hover or click any criterion to replay its step, drag
 * the timeline to scrub, and the play/pause control stops or starts the loop.
 *
 * Under prefers-reduced-motion it renders the settled, composed state directly
 * — highlighted lines, drawn threads, verified seals — with no animation.
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

  // One pass through the mechanism, 0 → 1, at half the original pace.
  const W = {
    reveal: [0.0, 0.1],
    line4: [0.1, 0.14],
    thread1: [0.14, 0.21],
    verified1: [0.21, 0.27],
    line5: [0.28, 0.31],
    thread2: [0.31, 0.38],
    verified2: [0.38, 0.44],
    scan: [0.45, 0.51],
    thread3: [0.51, 0.56],
    amber: [0.56, 0.62],
    question: [0.62, 0.71],
    decision: [0.73, 0.81],
  } as const;

  const prog = (start: number, end: number): number => {
    const raw = (effectiveT - start) / (end - start);
    return Math.min(1, Math.max(0, raw));
  };

  const revealP = prog(W.reveal[0], W.reveal[1]);
  const line4P = prog(W.line4[0], W.line4[1]);
  const thread1P = prog(W.thread1[0], W.thread1[1]);
  const verified1P = prog(W.verified1[0], W.verified1[1]);
  const line5P = prog(W.line5[0], W.line5[1]);
  const thread2P = prog(W.thread2[0], W.thread2[1]);
  const verified2P = prog(W.verified2[0], W.verified2[1]);
  const scanP = prog(W.scan[0], W.scan[1]);
  const thread3P = prog(W.thread3[0], W.thread3[1]);
  const amberP = prog(W.amber[0], W.amber[1]);
  const questionP = prog(W.question[0], W.question[1]);
  const decisionP = prog(W.decision[0], W.decision[1]);

  // Gentle autoplay at half speed. It pauses the instant the visitor reaches
  // for anything, so the animation can never block the page.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = performance.now();
    const SPEED = 0.0525;
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

  const LINES = [
    "Priya Menon — Platform Engineer, Bengaluru",
    "Seven years building internal developer platforms.",
    "Senior Platform Engineer, Northwind Payments, 2021–present",
    "Owned the partner-facing REST API end to end, including versioning and deprecation policy.",
    "Served as on-call lead for the payments gateway.",
    "Designed the normalised schema for the shipment tracking service.",
  ];

  // Criteria, in the order they appear. lineIndex is the resume line (0-based)
  // that the found threads must connect to; the searched one connects to the
  // line being examined when nothing is found.
  const CRITERIA = [
    { label: "API ownership", required: true, lineIndex: 3, question: "" },
    { label: "Incident response", required: true, lineIndex: 4, question: "" },
    { label: "Production Kubernetes", required: true, lineIndex: 5, question: "Which production Kubernetes workloads have you operated?" },
    { label: "Data modelling", required: false, lineIndex: -1, question: "" },
  ];

  // Measure where the threads must connect. Re-measured whenever the stage or
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
    t3: { x1: number; y1: number; x2: number; y2: number };
  } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const stage = stageRef.current;
      const resume = resumeRef.current;
      const line4 = lineRefs.current[3];
      const line5 = lineRefs.current[4];
      const line6 = lineRefs.current[5];
      const card0 = cardRefs.current[0];
      const card1 = cardRefs.current[1];
      const card2 = cardRefs.current[2];
      if (!stage || !resume || !line4 || !line5 || !line6 || !card0 || !card1 || !card2)
        return;

      const sr = stage.getBoundingClientRect();
      const rel = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height };
      };
      const r4 = rel(line4);
      const r5 = rel(line5);
      const r6 = rel(line6);
      const r0 = rel(card0);
      const r1 = rel(card1);
      const r2 = rel(card2);

      setPaths({
        w: sr.width,
        h: sr.height,
        t1: { x1: r4.x + r4.w, y1: r4.y + r4.h / 2, x2: r0.x, y2: r0.y + r0.h / 2 },
        t2: { x1: r5.x + r5.w, y1: r5.y + r5.h / 2, x2: r1.x, y2: r1.y + r1.h / 2 },
        t3: { x1: r6.x + r6.w, y1: r6.y + r6.h / 2, x2: r2.x, y2: r2.y + r2.h / 2 },
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

  const curve = (p0: Point, p2: Point) =>
    `M ${p0.x} ${p0.y} C ${p0.x + 64} ${p0.y}, ${p2.x - 64} ${p2.y}, ${p2.x} ${p2.y}`;

  const focusCriterion = useCallback((index: number) => {
    interactingRef.current = true;
    const target = [0.16, 0.34, 0.6, 0.76][index] ?? 0.76;
    setT(target);
  }, []);

  const releaseCriterion = useCallback(() => {
    interactingRef.current = false;
  }, []);

  // A running transcript of the mechanism's current step.
  const STEPS = [
    { at: 0, Icon: FileText, label: "Reading the source document" },
    { at: 0.1, Icon: Link2, label: "Linking a claim to a criterion" },
    { at: 0.21, Icon: BadgeCheck, label: "Citation verified against the source" },
    { at: 0.31, Icon: Link2, label: "Linking a second claim" },
    { at: 0.38, Icon: BadgeCheck, label: "Second citation verified" },
    { at: 0.45, Icon: Search, label: "Searching for Kubernetes evidence" },
    { at: 0.56, Icon: CircleDashed, label: "No supporting evidence found" },
    { at: 0.62, Icon: Mic, label: "Becomes an interview question" },
    { at: 0.72, Icon: Scale, label: "Recording the human decision" },
    { at: 0.8, Icon: BadgeCheck, label: "Review complete — replayable start to finish" },
  ];
  const currentStep = STEPS.filter((step) => effectiveT >= step.at).pop() ?? STEPS[0];
  const StepIcon = currentStep.Icon;

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

      {/* Step transcript */}
      <div
        className="mt-3 flex items-center gap-2 rounded-xl bg-canvas-deep px-3 py-2"
        style={{ opacity: revealP, transition: "opacity 300ms ease" }}
      >
        <StepIcon className="h-3.5 w-3.5 shrink-0 text-brand-deep" />
        <span className="font-mono text-2xs font-medium text-ink">
          {currentStep.label}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row">
        {/* Stylised resume */}
        <div
          ref={resumeRef}
          className="relative w-full shrink-0 rounded-2xl border-2 border-line bg-surface p-3.5 sm:w-[46%]"
        >
          <p className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
            Resume · numbered lines
          </p>
          <ol className="space-y-1">
            {LINES.map((text, index) => {
              const isLine4 = index === 3;
              const isLine5 = index === 4;
              const isSearched = index === 5;
              const highlighted = (isLine4 && line4P > 0) || (isLine5 && line5P > 0);
              const searching = isSearched && scanP > 0;
              const revealStart = 0.002 + index * 0.012;
              const lineReveal = prog(revealStart, revealStart + 0.03);
              return (
                <li
                  key={text}
                  ref={(node) => {
                    lineRefs.current[index] = node;
                  }}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border-2 px-2 py-1 transition-colors duration-200",
                    highlighted
                      ? "border-peach-foreground/30 bg-peach"
                      : searching
                        ? "border-uncertain/30 bg-uncertain-soft"
                        : "border-transparent",
                  )}
                  style={{
                    opacity:
                      (0.55 + 0.45 * lineReveal) *
                      (highlighted ? 1 : searching ? 0.85 : 1),
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
            const linked = thread1P > 0 && index === 0;
            const verified =
              (index === 0 && verified1P > 0) || (index === 1 && verified2P > 0);
            const amber = index === 2 && amberP > 0;
            const scanned = index === 2 && scanP > 0;
            const verifyP = index === 0 ? verified1P : index === 1 ? verified2P : 0;

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
                        : scanned
                          ? "border-uncertain/30 bg-uncertain-soft/60"
                          : linked
                            ? "border-brand/40 bg-card"
                            : "border-line bg-card",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        verified
                          ? "text-supported"
                          : amber || scanned
                            ? "text-uncertain"
                            : "text-ink",
                      )}
                    >
                      {criterion.label}
                    </span>
                    <PriorityChip required={criterion.required} />
                  </div>

                  <span className="mt-1.5 block text-2xs leading-relaxed text-muted-foreground">
                    {verified ? (
                      <span
                        className="inline-flex items-center gap-1.5 font-medium text-supported"
                        style={{
                          transform: `scale(${0.6 + 0.4 * verifyP})`,
                          transformOrigin: "left center",
                          transition: "transform 200ms ease",
                        }}
                      >
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified — quote checked against the document
                      </span>
                    ) : amber ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-uncertain">
                        <CircleDashed className="h-3.5 w-3.5" />
                        No supporting evidence found in this document
                      </span>
                    ) : scanned ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-uncertain">
                        <Search className="h-3.5 w-3.5" />
                        Searching for evidence…
                      </span>
                    ) : (
                      "Awaiting review"
                    )}
                  </span>
                </button>

                {/* Interview question, born from the amber criterion */}
                {index === 2 && questionP > 0 && (
                  <div className="pop-in mt-2 flex items-start gap-2 rounded-xl border-2 border-interview/30 bg-interview-soft px-3 py-2">
                    <Mic className="mt-0.5 h-3.5 w-3.5 shrink-0 text-interview" />
                    <span className="text-2xs leading-relaxed text-interview">
                      Interview question: {CRITERIA[2].question}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Threads between the resume and the criteria, plus travelling dots */}
      {paths && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          width={paths.w}
          height={paths.h}
          aria-hidden
        >
          {/* Found threads: draw, glow softly, then stay */}
          {[
            {
              p: paths.t1,
              done: thread1P,
              glow: thread1P,
              dot: thread1P,
              stroke: "hsl(var(--brand))",
            },
            {
              p: paths.t2,
              done: thread2P,
              glow: thread2P,
              dot: thread2P,
              stroke: "hsl(var(--brand))",
            },
          ].map((thread, i) => {
            const dot =
              thread.dot > 0.01
                ? bezierAt(
                    Math.min(thread.dot, 1),
                    { x: thread.p.x1, y: thread.p.y1 },
                    { x: thread.p.x1 + 64, y: thread.p.y1 },
                    { x: thread.p.x2 - 64, y: thread.p.y2 },
                    { x: thread.p.x2, y: thread.p.y2 },
                  )
                : null;
            return (
              <g key={i}>
                <path
                  d={curve({ x: thread.p.x1, y: thread.p.y1 }, { x: thread.p.x2, y: thread.p.y2 })}
                  fill="none"
                  stroke={thread.stroke}
                  strokeWidth={8}
                  strokeLinecap="round"
                  opacity={0.14 * thread.glow}
                  style={{ transition: "opacity 200ms ease" }}
                />
                <path
                  d={curve({ x: thread.p.x1, y: thread.p.y1 }, { x: thread.p.x2, y: thread.p.y2 })}
                  fill="none"
                  stroke={thread.stroke}
                  strokeWidth={3}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset={1 - thread.done}
                  style={{
                    opacity: 0.9,
                    transition: "stroke-dashoffset 60ms linear",
                  }}
                />
                {dot && <circle r={4} fill={thread.stroke} cx={dot.x} cy={dot.y} />}
              </g>
            );
          })}

          {/* The search thread: dashes in, then fades once nothing is found */}
          {(() => {
            const dot =
              thread3P > 0.01
                ? bezierAt(
                    Math.min(thread3P, 1),
                    { x: paths.t3.x1, y: paths.t3.y1 },
                    { x: paths.t3.x1 + 64, y: paths.t3.y1 },
                    { x: paths.t3.x2 - 64, y: paths.t3.y2 },
                    { x: paths.t3.x2, y: paths.t3.y2 },
                  )
                : null;
            return (
              <g>
                <path
                  d={curve({ x: paths.t3.x1, y: paths.t3.y1 }, { x: paths.t3.x2, y: paths.t3.y2 })}
                  fill="none"
                  stroke="hsl(var(--uncertain))"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray="0.01 0.03"
                  pathLength={1}
                  strokeDashoffset={1 - thread3P}
                  style={{
                    opacity: scanP > 0 ? 0.85 * (1 - amberP * 0.85) : 0,
                    transition: "opacity 200ms ease",
                  }}
                />
                {dot && (
                  <circle
                    r={3.5}
                    fill="hsl(var(--uncertain))"
                    cx={dot.x}
                    cy={dot.y}
                    style={{ opacity: 1 - amberP * 0.85 }}
                  />
                )}
              </g>
            );
          })()}
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
