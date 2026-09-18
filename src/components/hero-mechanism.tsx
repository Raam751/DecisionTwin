import { Pause, Play, RotateCcw } from "lucide-react";
import { SculptureStage } from "@/components/hero/sculpture-stage";
import { useHeroTimeline } from "@/components/hero/use-hero-timeline";

const CHAPTERS = [
  { label: "Contemplate", description: "Start with the source. Not an impression.", at: 0 },
  { label: "Trace", description: "API ownership traced to the candidate’s own words.", at: 21 },
  { label: "Verify", description: "A second citation. A second check against the source.", at: 38 },
  { label: "Question", description: "Missing evidence becomes a question—not a guess.", at: 56 },
  { label: "Decide", description: "A human makes the call. The reasoning stays.", at: 78 },
];

export function HeroMechanism() {
  const { stageRef, percent, playing, reduced, inspect, seek, setPlaying } = useHeroTimeline();
  const phase = Math.max(0, CHAPTERS.findLastIndex((chapter) => percent >= chapter.at));
  const chapter = CHAPTERS[phase];

  return (
    <section className="deliberation" aria-label="An illustrative journey from evidence to a human hiring decision">
      <div className="stage-heading"><span className="stage-live-dot" />THE DELIBERATION ROOM<span>ILLUSTRATIVE WALKTHROUGH</span></div>
      <div ref={stageRef} className="scene-animation-root" data-reduced={reduced}>
        <SculptureStage phase={phase} onInspect={inspect} />
      </div>
      <div className="scene-transcript"><span>0{phase + 1} / 05</span><p>{chapter.description}</p></div>
      <div className="scene-controls">
        <button type="button" className="scene-control" disabled={reduced} onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause the demonstration" : "Play the demonstration"}>
          {playing && !reduced ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button type="button" className="scene-control" disabled={reduced} aria-label="Replay the demonstration" onClick={() => { seek(0); setPlaying(true); }}><RotateCcw size={14} /></button>
        <input aria-label="Scrub through the demonstration" type="range" min="0" max="100" value={percent} disabled={reduced} onChange={(event) => inspect(Number(event.target.value) / 100)} />
        <span>{reduced ? "STILL" : "0.5×"}</span>
        <span className="scene-control-percent">{percent}%</span>
      </div>
      <div className="scene-chapters" aria-label="Demonstration chapters">
        {CHAPTERS.map((item, index) => <button type="button" key={item.label} disabled={reduced} aria-current={phase === index ? "step" : undefined} onClick={() => inspect((item.at + 3) / 100)}><span>0{index + 1}</span>{item.label}</button>)}
      </div>
    </section>
  );
}
