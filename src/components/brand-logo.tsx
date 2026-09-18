import { Fingerprint } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("brand-logo focus-ring", className)} aria-label="DecisionTwin home">
      <Fingerprint size={26} strokeWidth={1.35} aria-hidden="true" />
      <span>DecisionTwin</span>
    </Link>
  );
}
