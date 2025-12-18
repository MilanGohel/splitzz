import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-brand/50 aria-invalid:ring-loss/20",
  {
    variants: {
      variant: {
        // Uses your --color-brand (#10B981)
        default: "bg-brand text-white hover:bg-brand/90 shadow-md",
        
        // Uses your --color-loss (#F97316) for destructive actions
        destructive: "bg-loss text-white hover:bg-loss/90 shadow-sm",
        
        // Uses --color-background (#121212) and --color-surface (#1E1E1E)
        outline:
          "border border-surface bg-background text-white hover:bg-surface shadow-xs",
        
        // Uses --color-surface (#1E1E1E) for a subtle secondary look
        secondary:
          "bg-surface text-white hover:bg-muted/20",
        
        // Uses --color-muted for text, highlighting to white on surface hover
        ghost:
          "hover:bg-surface hover:text-white",
        
        // Link style using the brand color
        link: "text-brand underline-offset-4 hover:underline",
        
        // Success variant using --color-gain (#22C55E)
        success: "bg-gain text-white hover:bg-gain/90",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }