import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SplitzzMarkProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  glow?: boolean;
}

/**
 * SplitzzMark - Canonical geometric split-beam glyph
 *
 * Core Metaphor: Two interlocking faceted geometric prisms separated by a 45-degree
 * diagonal split channel, symbolizing fair balance, transparent division, and seamless settlement.
 */
export function SplitzzMark({
  size = 32,
  className,
  glow = true,
  ...props
}: SplitzzMarkProps) {
  return (
    <div
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {glow && (
        <div
          className="absolute inset-0 rounded-xl bg-emerald-500/20 blur-md dark:bg-emerald-500/30 -z-10 transition-opacity"
          aria-hidden="true"
        />
      )}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm select-none"
        {...props}
      >
        <defs>
          <linearGradient
            id="splitzz-prism-top"
            x1="6"
            y1="4"
            x2="24"
            y2="20"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="60%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <linearGradient
            id="splitzz-prism-bottom"
            x1="26"
            y1="28"
            x2="8"
            y2="12"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#059669" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>

          <linearGradient
            id="splitzz-laser-beam"
            x1="10"
            y1="22"
            x2="22"
            y2="10"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>

          <filter id="splitzz-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Top/Upper Interlocking Prism (Represents 'Fair Split / First Half') */}
        <path
          d="M 6.5 7 C 6.5 5.07 8.07 3.5 10 3.5 L 21.2 3.5 C 23.1 3.5 24.2 5.6 23.1 7.2 L 15.3 17.6 C 14.5 18.7 13.2 19.3 11.8 19.3 L 8.5 19.3 C 7.4 19.3 6.5 18.4 6.5 17.3 Z"
          fill="url(#splitzz-prism-top)"
        />

        {/* Lower Interlocking Prism (Represents 'Resolution / Settled Ledger') */}
        <path
          d="M 25.5 25 C 25.5 26.93 23.93 28.5 22 28.5 L 10.8 28.5 C 8.9 28.5 7.8 26.4 8.9 24.8 L 16.7 14.4 C 17.5 13.3 18.8 12.7 20.2 12.7 L 23.5 12.7 C 24.6 12.7 25.5 13.6 25.5 14.7 Z"
          fill="url(#splitzz-prism-bottom)"
        />

        {/* Precision Central Split-Beam Accent Line */}
        <line
          x1="12"
          y1="20"
          x2="20"
          y2="12"
          stroke="url(#splitzz-laser-beam)"
          strokeWidth="1.75"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Luminous Central Settlement Vertex */}
        <circle
          cx="16"
          cy="16"
          r="1.75"
          fill="#ECFDF5"
          className="animate-pulse"
        />
      </svg>
    </div>
  );
}

interface SplitzzLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  subtitle?: string;
  href?: string;
  className?: string;
  iconClassName?: string;
  glow?: boolean;
}

const SIZE_CONFIGS = {
  xs: { markSize: 20, textClass: "text-sm", subClass: "text-[10px]" },
  sm: { markSize: 26, textClass: "text-base", subClass: "text-xs" },
  md: { markSize: 32, textClass: "text-lg font-bold tracking-tight", subClass: "text-xs" },
  lg: { markSize: 42, textClass: "text-2xl font-extrabold tracking-tight", subClass: "text-sm" },
  xl: { markSize: 56, textClass: "text-3xl font-black tracking-tight", subClass: "text-base" },
};

/**
 * SplitzzLogo - The unified Brand Emblem & Wordmark for Splitzz
 */
export function SplitzzLogo({
  size = "md",
  showWordmark = true,
  subtitle,
  href,
  className,
  iconClassName,
  glow = true,
}: SplitzzLogoProps) {
  const config = SIZE_CONFIGS[size];

  const content = (
    <div className={cn("inline-flex items-center gap-2.5 group cursor-pointer select-none", className)}>
      <SplitzzMark
        size={config.markSize}
        className={cn(
          "transition-transform duration-300 ease-out group-hover:scale-105 group-active:scale-95",
          iconClassName
        )}
        glow={glow}
      />
      {showWordmark && (
        <div className="flex flex-col text-left leading-tight">
          <div className={cn("font-bold text-foreground flex items-center tracking-tight", config.textClass)}>
            <span>Split</span>
            <span className="text-emerald-500 font-extrabold group-hover:text-emerald-400 transition-colors">
              zz
            </span>
          </div>
          {subtitle && (
            <span className={cn("text-muted-foreground font-medium", config.subClass)}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}
