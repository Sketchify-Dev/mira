# Mira design rules

## Anti AI slop (binding)

Avoid the patterns that mark a design as AI made. Do not use:

- Subtext helpers under headings
- Eyebrow labels above headings
- Decorative line strokes and dividers
- Drop shadows as decoration
- Blurred background effects
- Arrows in buttons
- Button glow on hover
- Highlighted hero header text (no colored, italic, or decorated words in the hero headline)
- Info line under hero CTA buttons (no icon plus text reassurance row)
- Gradients

When in doubt, leave the element out. Restraint reads as human.

## Copy rule (binding)

No em dashes anywhere: UI copy, files, commit messages, terminal output. Restructure the sentence instead of swapping in another punctuation mark.

Reference: https://contralabs.com/frontierdesign/ (blind pro designer benchmark, humans still win 76 percent; Fable 5.2 best model). Lesson: sweat small details that make a design feel alive, spacing rhythm, alignment, type scale, real content, instead of decorative effects.

## Installed skill tier (global)

Design skills installed globally via the skills CLI:

1. `unslop-ui` (felipebasurto/unslop-ui) - installed, verified on disk
2. `design.how` - installer ran twice with Done status but added no folder under `~/.claude/skills`; treat as not installed, guidance via its site only
3. `animation-vocabulary` (emilkowalski/skills) - installed, verified on disk
4. uberdesigner-studio (bogdan239) - design studio setup
5. topinspo.design/skills - reference catalog (bookmarked). No install commands on the page; many of its skills (unslop, audit-ai-design-slop, anti-ai-slop, ui-ux-pro-max, animate, better-typography, etc.) are already installed globally.

Consult the relevant skill before building or restyling any interface.
