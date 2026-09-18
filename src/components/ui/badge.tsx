import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-semibold uppercase tracking-[0.1em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep/70 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-brand-deep",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-canvas-deep",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-line bg-card text-muted-foreground",
        /* Semantic states */
        supported: "border-supported/25 bg-supported-soft text-supported",
        uncertain: "border-uncertain/25 bg-uncertain-soft text-uncertain",
        conflicting:
          "border-conflicting/25 bg-conflicting-soft text-conflicting",
        interview: "border-interview/25 bg-interview-soft text-interview",
        /* Priority */
        essential: "border-essential/20 bg-essential-soft text-essential",
        desirable: "border-line bg-desirable-soft text-desirable",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants }
