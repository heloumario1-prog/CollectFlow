# CollectFlow design preference

Adapted from the supplied QuestUI design document for CollectFlow. This is visual reference material. Product language, behavior, accessibility, and the user's task take precedence. Keep the source palette and its layered, ornate feel while using financial product labels and Tailwind CSS v4 syntax.

## Foundations

The page uses a deep brown background, warm brown surfaces, parchment text, restrained gold borders and glow, angular corners, and deliberate spacing. Deep red signals destructive or error states; royal purple is a sparse special accent. Do not use pure black or bright white (`#FFFFFF`) as the default surfaces or text. Keep motion subtle, typically 300 ms, and respect reduced-motion preferences.

### Tailwind v4 theme

When implementing a UI task that needs these utilities, add `@import "tailwindcss";` to the frontend stylesheet before the following `@theme` block. The current app has the Tailwind Vite plugin but does not yet import Tailwind. Integrate these tokens into the existing stylesheet without restyling unrelated screens. Load Cinzel, Spectral, and Fira Code from an approved font source when applying the design; the serif and monospace fallbacks keep their roles if a font cannot load.

```css
@import "tailwindcss";

@theme {
  --color-quest-gold: #CA8A04;
  --color-quest-gold-border: #DAA520;
  --color-quest-gold-hover: #B8780A;
  --color-quest-gold-tint: #CA8A0415;
  --color-quest-gold-border-soft: #CA8A0440;
  --color-quest-gold-row: #CA8A040D;
  --color-quest-red: #991B1B;
  --color-quest-red-border: #B91C1C;
  --color-quest-red-hover: #7F1D1D;
  --color-quest-red-text: #F87171;
  --color-quest-purple: #581C87;
  --color-quest-background: #1A0F0A;
  --color-quest-surface: #2C1A10;
  --color-quest-elevated: #3D2517;
  --color-quest-parchment: #F5E6D3;
  --color-quest-muted: #BFA98A;
  --color-quest-border: #5C3D2E;
  --color-quest-success: #22C55E;
  --color-quest-success-tint: #22C55E20;
  --color-quest-warning-tint: #CA8A0420;
  --color-quest-error-tint: #991B1B20;

  --font-quest-heading: "Cinzel", Georgia, serif;
  --font-quest-body: "Spectral", Georgia, serif;
  --font-quest-mono: "Fira Code", monospace;

  --radius-quest-sm: 2px;
  --radius-quest: 4px;
  --radius-quest-md: 6px;
  --radius-quest-lg: 8px;

  --shadow-quest-sm: 0 1px 3px rgb(202 138 4 / 15%);
  --shadow-quest: 0 2px 8px rgb(202 138 4 / 20%);
  --shadow-quest-md: 0 4px 16px rgb(202 138 4 / 25%);
  --shadow-quest-lg: 0 8px 32px rgb(202 138 4 / 30%);
  --shadow-quest-glow: 0 0 20px rgb(202 138 4 / 40%);
}
```

These tokens create utilities such as `bg-quest-background`, `text-quest-parchment`, `border-quest-border`, `font-quest-heading`, `rounded-quest`, and `shadow-quest-glow`. The default Tailwind spacing scale is 4 px per step: `gap-1` = 4 px, `p-2` = 8 px, `p-4` = 16 px, `p-6` = 24 px, `gap-8` = 32 px, `py-12` = 48 px, and `py-16` = 64 px. This preserves the source's 8 px base rhythm and 4 px half-step. The source's full radius is 9999 px; use `rounded-full` for circles.

### Color roles

| Role | Value | Tailwind utility |
| --- | --- | --- |
| Primary action and warning | `#CA8A04` | `bg-quest-gold`, `text-quest-gold` |
| Destructive action and error | `#991B1B` | `bg-quest-red`, `border-quest-red` |
| Sparse special accent or info | `#581C87` | `bg-quest-purple` |
| Page background | `#1A0F0A` | `bg-quest-background` |
| Default surface | `#2C1A10` | `bg-quest-surface` |
| Elevated surface | `#3D2517` | `bg-quest-elevated` |
| Primary text | `#F5E6D3` | `text-quest-parchment` |
| Secondary text | `#BFA98A` | `text-quest-muted` |
| Border | `#5C3D2E` | `border-quest-border` |
| Success | `#22C55E` | `text-quest-success` |

Use parchment or dark brown for essential text when gold, red, purple, or green alone would not provide readable contrast on a given surface. Preserve accent colors as borders, backgrounds, or icons where needed. Verify contrast in the actual rendered state.

### Type scale

| Role | Tailwind classes | Source metrics |
| --- | --- | --- |
| Display | `font-quest-heading text-[40px]/[1.15] font-bold` | 40 px, 700, 1.15 |
| H1 | `font-quest-heading text-[32px]/[1.2] font-bold` | 32 px, 700, 1.2 |
| H2 | `font-quest-heading text-2xl/[1.25] font-semibold` | 24 px, 600, 1.25 |
| H3 | `font-quest-heading text-xl/[1.3] font-semibold` | 20 px, 600, 1.3 |
| H4 | `font-quest-heading text-base/[1.35] font-normal` | 16 px, 400, 1.35 |
| Large body | `font-quest-body text-lg/[1.7] font-normal` | 18 px, 400, 1.7 |
| Body | `font-quest-body text-base/[1.7] font-normal` | 16 px, 400, 1.7 |
| Small body | `font-quest-body text-sm/[1.6] font-normal` | 14 px, 400, 1.6 |
| Caption | `font-quest-body text-xs/[1.4] font-medium` | 12 px, 500, 1.4 |
| Code | `font-quest-mono text-sm/[1.6] font-normal` | 14 px, 400, 1.6 |

Use Cinzel for headings and short labels, Spectral for reading text, and Fira Code for code-like values. Uppercase, tracked small labels can use `uppercase tracking-[1px]`. Avoid long uppercase passages.

## Component direction

The classes below are composable examples, not a requirement to create a component library. Retain semantic HTML and accessible names. Apply `focus-visible` styling and disabled states to each interactive component.

### Buttons

- Primary: `bg-quest-gold text-quest-background border border-quest-gold-border hover:bg-quest-gold-hover shadow-quest-sm enabled:active:shadow-quest-glow`.
- Secondary: `bg-transparent text-quest-gold border border-quest-gold hover:bg-quest-gold-tint`.
- Ghost: `bg-transparent text-quest-muted hover:bg-quest-elevated`.
- Destructive: `bg-quest-red text-quest-parchment border border-quest-red-border hover:bg-quest-red-hover`.
- Shared shape and state: `rounded-quest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-quest-gold disabled:cursor-not-allowed disabled:opacity-[0.35] disabled:shadow-none`. Dim disabled borders with `disabled:border-quest-border` where a border remains.
- Size examples: small `min-h-8 px-[14px] py-[6px] text-[13px] leading-none`; medium `min-h-10 px-[22px] py-2 text-sm leading-none`; large `min-h-12 px-[30px] py-3 text-base leading-none`. The source specifies 1 px borders for small/medium and 1.5 px for large; use `border-[1.5px]` on large when that detail matters.

### Cards and panels

- Default: `rounded-quest border border-quest-border bg-quest-surface p-6 shadow-quest-sm`.
- Elevated: `rounded-quest border border-quest-gold-border-soft bg-quest-elevated p-6 shadow-quest-md`.
- Important panel: add `border-t-2 border-t-quest-gold`. On an interactive elevated card, `transition-shadow duration-300 motion-reduce:transition-none hover:shadow-quest-glow` gives the restrained source hover effect.

### Text fields

- Field: `min-h-10 rounded-quest border border-quest-border bg-quest-surface px-3 py-2 font-quest-body text-quest-parchment hover:border-quest-gold focus-visible:border-2 focus-visible:border-quest-gold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-quest-gold/25 disabled:border-quest-elevated disabled:bg-quest-background`.
- Error state: `border-2 border-quest-red ring-3 ring-quest-red/25`. Pair the state with a visible text message and `aria-invalid`/`aria-describedby`.
- Label: `mb-[6px] block font-quest-body text-sm font-medium text-quest-parchment`. Helper: `mt-1 font-quest-body text-xs text-quest-muted`. Error text uses the source red `text-quest-red`, but place it on a surface where it passes contrast; otherwise use parchment text with a red icon or border.

### Chips, rows, and selection controls

- Filter chip: `rounded-quest-sm border border-quest-border bg-quest-surface px-3 py-1 font-quest-heading text-[11px] tracking-[1px] uppercase text-quest-muted`; active: `border-transparent bg-quest-gold text-quest-background`.
- Status tints: success `bg-quest-success-tint text-quest-success`, warning `bg-quest-warning-tint text-quest-gold`, error `bg-quest-error-tint text-quest-red-text`. Check text contrast; use parchment text when necessary. These preserve the source's `#22C55E20`, `#CA8A0420`, and `#991B1B20` fills.
- List row: `min-h-12 border-b border-quest-elevated px-4 py-2 hover:bg-quest-elevated aria-selected:bg-quest-gold-row`. Use `text-base` parchment labels, `text-sm` muted descriptions, and a 28 px icon area with 12 px trailing gap (`size-7 mr-3`).
- Checkbox: `size-5 rounded-quest-sm border-2 border-quest-border bg-quest-surface accent-quest-gold`; selected uses gold with a dark checkmark; indeterminate uses a dark dash. Radio: `size-5 rounded-full border-2 border-quest-border bg-quest-surface accent-quest-gold`; selected uses a gold border and 10 px gold dot. Keep an 8 px label gap (`gap-2`), visible focus, and 35% disabled opacity. Use native controls where practical and verify the rendered checkmark/dot in the target browser.

### Tooltips and motion

Tooltip: `max-w-[260px] rounded-quest border border-quest-gold-border-soft bg-quest-elevated px-[14px] py-2 font-quest-body text-xs text-quest-parchment`. A 6 px CSS triangle may match the surface. The source uses a 300 ms show delay and immediate hide; do not hide essential information only in a tooltip. Prefer subtle fades and `motion-reduce:transition-none`.
