import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { HeroMechanism } from "@/components/hero-mechanism";

const Landing = () => {
  const navigate = useNavigate();
  return (
    <div className="landing-museum">
      <div className="museum-layout">
        <header className="museum-header">
          <BrandLogo />
          <p>EVIDENCE OVER INSTINCT.</p>
        </header>
        <main className="museum-main">
          <div className="museum-copy">
            <p className="museum-eyebrow"><span />THE PROBLEM</p>
            <h1>A hiring score tells you the answer, <em>not the evidence.</em></h1>
            <p className="museum-description">Decisions deserve more than a number. Trace every claim to its source, surface what’s missing, and preserve the reasoning behind the human decision.</p>
            <Button variant="museum" className="museum-cta" onClick={() => navigate("/dashboard")}>Get started<ArrowRight size={18} /></Button>
            <p className="museum-cta-note">One role. Three candidates. See the evidence for yourself.</p>
            <div className="museum-principles"><span>Source-linked</span><i /><span>Auditable</span><i /><span>Human-decided</span></div>
          </div>
          <HeroMechanism />
        </main>
        <footer className="museum-footer">
          <span>NOT ANOTHER SCORE. A REASON YOU CAN STAND BEHIND.</span>
          <div className="museum-art-credits"><a href="https://www.nga.gov/artworks/1005-thinker-le-penseur" target="_blank" rel="noreferrer">The Thinker · Rodin / NGA · Public domain</a><span> / </span><a href="https://clevelandart.org/art/1972.66.a" target="_blank" rel="noreferrer">Athena · CMA · CC0</a></div>
        </footer>
      </div>
    </div>
  );
};
export default Landing;
