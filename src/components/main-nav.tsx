import { NavLink } from "react-router-dom";
import { BriefcaseBusiness, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/dashboard", label: "Candidates", icon: UsersRound, end: true },
  { to: "/roles", label: "Roles", icon: BriefcaseBusiness, end: false },
];

/**
 * The app's main navigation. Links to the candidate list and the role
 * management screen; an editorial underline identifies the active destination.
 */
export function MainNav() {
  return (
    <nav className="workspace-nav" aria-label="Main navigation">
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "workspace-nav-link focus-ring",
              isActive && "workspace-nav-link-active",
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
