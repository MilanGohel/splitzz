# Splitzz — Brand Identity & Design System

> **The Modern Social Ledger**  
> Split costs. Simplify debts. Keep relationships effortless.

---

## 1. Brand Essence & Core Metaphor

### The Problem
Traditional expense sharing apps feel like transactional spreadsheets or cluttered, ad-heavy ledgers. They treat social finances like a debt-collection agency rather than a collaborative convenience between friends, flatmates, and travel companions.

### The Splitzz Philosophy
**Splitzz** is engineered as a precision social-finance platform. It pairs the mathematical rigor of an audited financial ledger with the lightness, tactility, and warmth of modern consumer software.

### The Core Metaphor: *The Split-Beam*
The **Splitzz Mark** represents fair division and frictionless convergence:
- **Two Interlocking Prisms**: Representing the two sides of every financial interaction—paying and sharing—engineered with balanced geometric chamfers.
- **The Diagonal Laser Cut**: A 45-degree split channel dividing the planes, symbolizing absolute transparency and clean separation of liability.
- **The Central Settlement Vertex**: An electric luminous pulse at the intersection, symbolizing instant debt resolution and balanced zero-sum accounts.

---

## 2. Design Read & Configuration

Following the **Anti-Slop Taste Skill (`design-taste-frontend` & `brandkit`)**:

> **Design Read**: *"Consumer social-finance platform for friends, roommates, and group travelers, with a precision-engineered, warm modern fintech language, leaning toward electric emerald + obsidian graphite, sharp geometric split-mark glyph, tactile elevation, and anti-slop typography."*

### The Three Dials
- **`DESIGN_VARIANCE: 7`** — High aesthetic distinctiveness with intentional geometric symmetry; escapes generic template traps without sacrificing usability.
- **`MOTION_INTENSITY: 6`** — Tactile, physics-informed transitions on interactive elements (hover scale, subtle radial glows, reactive sheet drawers).
- **`VISUAL_DENSITY: 4`** — Airy, spacious layout with clear visual hierarchy, avoiding claustrophobic fintech clutter while preserving data density where needed.

---

## 3. Color Architecture & Tokens

Our palette marries deep obsidian graphite with high-energy emerald and functional semantic tints.

| Token | CSS Variable | Hex / OKLCH | Semantic Role |
| :--- | :--- | :--- | :--- |
| **Emerald Pulse** | `--color-brand`, `--primary` | `#10B981` / `oklch(0.698 0.163 165.72)` | Primary brand identity, primary CTA buttons, logo glyph highlight |
| **Gain Green** | `--color-gain`, `--splitzz-green` | `#22C55E` / `oklch(0.728 0.172 160.78)` | Receivable balances ("You are owed"), positive net settlements |
| **Loss Amber** | `--color-loss`, `--splitzz-orange` | `#F97316` / `oklch(0.706 0.186 37.28)` | Payable balances ("You owe"), pending obligations |
| **Obsidian Canvas**| `--color-background` (dark) | `#121212` / `oklch(0.145 0 0)` | Root application canvas, deeply immersive and battery-efficient |
| **Obsidian Surface** | `--color-card`, `--color-surface` | `#1E1E1E` / `oklch(0.184 0 0)` | Elevated cards, sidebars, modal dialogues, segmented controls |
| **Crisp Light** | `--color-foreground` (dark) | `#FAFAFA` / `oklch(0.985 0 0)` | High-contrast legible text and sharp vector strokes |

---

## 4. Typography & Tabular Numerics

### Primary Sans: `Geist Sans`
- Used for application headings, wordmarks, navigation, and badges.
- **Letter Spacing**: `-0.02em` (`tracking-tight`) on display headings and wordmarks for a crisp, engineered personality.

### Primary Mono & Numerics: `Geist Mono` (`tabular-nums`)
- Every financial amount (currency values, percentages, settlement shares, breakdown tables) **MUST** render with `tabular-nums` and monospace alignment.
- Guarantees numbers do not jump or jitter during calculations or inline editing.

---

## 5. Brand Touchpoints & Usage

### 1. Logo Component (`@/components/brand/logo.tsx`)
```tsx
import { SplitzzLogo, SplitzzMark } from "@/components/brand/logo";

// Standalone Mark
<SplitzzMark size={32} glow />

// Full Wordmark Logo
<SplitzzLogo size="md" showWordmark subtitle="Expense Sharing" />
```

### 2. Available Sizes
- `xs` (20px): Compact breadcrumbs and inline status tags.
- `sm` (26px): Application header, mobile bars, modal titles.
- `md` (32px): Navigation bars, sidebar headers, footer branding.
- `lg` (42px): Auth cards, onboarding dialogs, marketing heroes.
- `xl` (56px): Splash screens, high-impact brand showcases.

---

## 6. Voice & Tone Principles

1. **Equitable & Clear**: "Split evenly", "Settle ₹450 with Alex", not "Alex owes you money". We treat expense tracking as collaborative harmony.
2. **Transparent Financial Precision**: Currency units are clearly denoted with two decimal precision or localized symbols (`₹`, `$`, `€`).
3. **Frictionless Action**: Settle up via UPI with one tap; scan receipts with instant auto-parsing; export clean CSVs with zero friction.
4. **Anti-Slop Discipline**:
   - 🚫 No generic AI-purple mesh gradients.
   - 🚫 No generic placeholder icons (e.g. default Lucide `CreditCard`).
   - 🚫 No cartoon piggy banks or flying coins.
   - ✅ Custom geometric vector glyphs, high-contrast typography, and purposeful micro-interactions.
