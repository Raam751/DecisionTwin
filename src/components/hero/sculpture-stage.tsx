import { memo, useLayoutEffect, useRef } from "react";
import { BadgeCheck, CircleDashed, FileText, Mic, Scale } from "lucide-react";

type SculptureStageProps = { phase: number; onInspect: (value: number) => void };

export const SculptureStage = memo(function SculptureStage({ phase, onInspect }: SculptureStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const svg = root.querySelector("svg.evidence-constellation");
      if (!svg) return;
      const bounds = svg.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      // Read all endpoints before writing SVG paths; never measure per frame.
      const endpoints = [[".source-api", ".seal-api", "api"], [".source-incident", ".seal-incident", "incident"], [".source-search", ".seal-question", "question"]].map(([source, target, suffix]) => ({
        a: root.querySelector(source)?.getBoundingClientRect(),
        b: root.querySelector(target)?.getBoundingClientRect(),
        suffix,
      }));
      for (const { a, b, suffix } of endpoints) {
        if (!a || !b) continue;
        const x1 = (a.right - bounds.left) * 640 / bounds.width;
        const y1 = (a.top + a.height / 2 - bounds.top) * 520 / bounds.height;
        const x2 = (b.left - bounds.left) * 640 / bounds.width;
        const y2 = (b.top + b.height / 2 - bounds.top) * 520 / bounds.height;
        const d = `M${x1} ${y1} C${x1 + 145} ${y1 + 30} ${x2 - 145} ${y2 - 80} ${x2} ${y2}`;
        root.querySelectorAll(`.ribbon-${suffix} path`).forEach((path) => path.setAttribute("d", d));
        const arrival = root.querySelector(`.ribbon-${suffix} .ribbon-arrival`);
        arrival?.setAttribute("cx", String(x2));
        arrival?.setAttribute("cy", String(y2));
        const comet = root.querySelector<SVGElement>(`.comet-${suffix}`);
        if (comet) comet.style.offsetPath = `path('${d}')`;
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    void document.fonts.ready.then(measure);
    return () => { cancelled = true; observer.disconnect(); };
  }, []);

  return (
    <div ref={rootRef} className="deliberation-stage" data-phase={phase}>
      <div className="museum-arch" aria-hidden="true" />
      <div className="museum-arch museum-arch-inner" aria-hidden="true" />
      <div className="sculpture-aura" aria-hidden="true" />
      <div className="museum-light" aria-hidden="true" />
      <div className="celestial-ring celestial-ring-back" aria-hidden="true" />
      <div className="celestial-ring celestial-ring-front" aria-hidden="true" />
      <div className="wisdom-medallion" aria-hidden="true">
        <img src="/athena-relief.webp" width="300" height="272" alt="" />
        <span>ATHENA · WISDOM</span>
      </div>
      <div className="thinker-plinth" aria-hidden="true" />
      <div className="thinker-figure">
        <img src="/thinker-bronze.webp" width="475" height="637" fetchPriority="high" alt="Rodin’s bronze Thinker, seated in contemplation" />
        <div className="thinker-rim" aria-hidden="true" />
      </div>
      <div className="stage-coordinates" aria-hidden="true"><span>THE ART OF</span><span>DELIBERATION</span></div>
      <svg className="evidence-constellation" viewBox="0 0 640 520" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="evidence-ribbon" x1="80" y1="370" x2="590" y2="150" gradientUnits="userSpaceOnUse">
            <stop stopColor="hsl(var(--scene-bronze))" stopOpacity=".2" />
            <stop offset=".55" stopColor="hsl(var(--scene-gold))" />
            <stop offset="1" stopColor="hsl(var(--scene-bronze))" />
          </linearGradient>
        </defs>
        <g className="orbital-map">
          <ellipse cx="337" cy="266" rx="235" ry="116" transform="rotate(-28 337 266)" />
          <ellipse cx="337" cy="266" rx="211" ry="146" transform="rotate(32 337 266)" />
          <path d="M96 392 L491 82 M92 143 L570 407" strokeDasharray="2 9" />
          <circle cx="491" cy="82" r="4" /><circle cx="92" cy="143" r="3" /><circle cx="570" cy="407" r="4" />
        </g>
        <g className="ribbon ribbon-api">
          <path className="ribbon-halo" d="M184 310 C315 325 335 90 461 158" />
          <path className="ribbon-line" pathLength="1" d="M184 310 C315 325 335 90 461 158" />
          <circle className="ribbon-arrival" cx="461" cy="158" r="10" />
        </g>
        <g className="ribbon ribbon-incident">
          <path className="ribbon-halo" d="M184 369 C366 404 298 154 461 252" />
          <path className="ribbon-line" pathLength="1" d="M184 369 C366 404 298 154 461 252" />
          <circle className="ribbon-arrival" cx="461" cy="252" r="10" />
        </g>
        <g className="ribbon ribbon-question">
          <path className="ribbon-line" pathLength="1" d="M184 426 C310 493 325 318 461 351" />
          <circle className="ribbon-arrival" cx="461" cy="351" r="10" />
        </g>
        <circle className="evidence-comet comet-api" r="4" />
        <circle className="evidence-comet comet-incident" r="4" />
        <circle className="evidence-comet comet-question" r="3" />
        <g className="thinking-stars">
          <path d="M328 59v14m-7-7h14 M386 117v10m-5-5h10 M262 185v10m-5-5h10 M436 404v12m-6-6h12" />
          <circle cx="298" cy="91" r="2" /><circle cx="422" cy="85" r="2" /><circle cx="247" cy="366" r="2" />
        </g>
      </svg>
      <div className="source-excerpts">
        <div className="source-heading"><FileText size={12} /><span>PRIYA’S RESUME</span></div>
        <div className="source-excerpt source-api"><span className="source-line">04</span><p>“Owned the partner-facing REST API end to end…”</p></div>
        <div className="source-excerpt source-incident"><span className="source-line">05</span><p>“Served as on-call lead for the payments gateway.”</p></div>
        <div className="source-excerpt source-search"><span className="source-line">?</span><p>Kubernetes?<br /><span>Search the source.</span></p></div>
      </div>
      <div className="criteria-constellation">
        <button className="criterion-seal seal-api" type="button" onClick={() => onInspect(.27)} aria-label="Inspect API ownership evidence">
          <span className="seal-symbol"><BadgeCheck size={18} /></span>
          <span><strong>API ownership</strong><small>{phase >= 1 ? "Citation verified · line 4" : "Tracing the source"}</small></span>
        </button>
        <button className="criterion-seal seal-incident" type="button" onClick={() => onInspect(.44)} aria-label="Inspect incident response evidence">
          <span className="seal-symbol"><BadgeCheck size={18} /></span>
          <span><strong>Incident response</strong><small>{phase >= 2 ? "Citation verified · line 5" : "Awaiting evidence"}</small></span>
        </button>
        <button className="criterion-seal seal-question" type="button" onClick={() => onInspect(.69)} aria-label="Inspect missing Kubernetes evidence">
          <span className="seal-symbol"><CircleDashed size={18} /></span>
          <span><strong>Production Kubernetes</strong><small>{phase >= 3 ? "No supporting evidence" : "Not yet established"}</small></span>
        </button>
      </div>
      <div className="interview-insight"><Mic size={15} /><p>Which production Kubernetes<br />workloads have you operated?</p></div>
      <div className="human-verdict"><span className="verdict-mark"><Scale size={20} /></span><span><small>THE HUMAN DECISION</small><strong>Move forward. Ask the question.</strong><span>Recorded by Meera Iyer · reasoning preserved</span></span></div>
      <div className="sculpture-caption"><span>Evidence informs.</span><em>You decide.</em></div>
    </div>
  );
});
