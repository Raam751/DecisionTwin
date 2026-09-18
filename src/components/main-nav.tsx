import { NavLink } from "react-router-dom";
import { BriefcaseBusiness, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", label: "Candidates", icon: UsersRound, end: true },
  { to: "/roles", label: "Roles", icon: BriefcaseBusiness, end: false },
];

/**
 * The app's main navigation. Links to the candidate list and the role
 * management screen; the active destination is shown as a filled pill.
 */
export function MainNav() {
  return (
    <nav className="flex flex-wrap items-center gap-1.5" aria-label="Main navigation">
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-card"
                : "text-muted-foreground hover:bg-surface hover:text-ink",
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
