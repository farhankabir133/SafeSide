import type { Transition, Variants } from "motion/react";

/**
 * Centralized motion configuration for the SafeSide tactical UI.
 * All spring physics, easing curves, and shared variants live here so the
 * entire motion language can be tuned from one place.
 */

export const EASE = {
  // Expressive "tactical" ease-out used for most reveals.
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  // Slightly overshooting curve for confident UI entrances.
  anticipate: [0.36, 0.07, 0.19, 0.97] as const,
} as const;

/** Spring presets — tuned for interactive tactical surfaces. */
export const spring: Record<string, Transition> = {
  // Default for buttons, cards, modals. Defined in the plan.
  interactive: { type: "spring", stiffness: 300, damping: 20, mass: 0.8 },
  // Gentle, weighty reveals for large surfaces.
  soft: { type: "spring", stiffness: 180, damping: 26, mass: 1 },
  // Crisp feedback for taps / indicators.
  snappy: { type: "spring", stiffness: 520, damping: 32, mass: 0.6 },
  // Playful, used sparingly (badges, success pops).
  bouncy: { type: "spring", stiffness: 420, damping: 12, mass: 0.7 },
};

/** Tween presets — used for large layout/route transitions. */
export const tween: Record<string, Transition> = {
  // Default page/route transition.
  smooth: { type: "tween", ease: EASE.out, duration: 0.6 },
  // Big layout morphs (card -> detail).
  anticipate: { type: "tween", ease: "anticipate", duration: 0.7 },
  // Fast chrome transitions (nav, tabs).
  chrome: { type: "tween", ease: EASE.out, duration: 0.35 },
};

/**
 * Reduced-motion fallback map. When the user prefers reduced motion we swap
 * every spring/tween for an instant opacity-only fade so layouts still settle
 * but nothing moves physically.
 */
export const reducedTransition: Transition = {
  type: "tween",
  duration: 0.2,
  ease: "linear",
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: spring.soft },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: spring.soft },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: spring.interactive },
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: spring.soft },
};

/** Container variant that staggers its children. */
export const staggerContainer = (
  stagger = 0.07,
  delayChildren = 0,
): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** Container variant for exit-aware staggered lists (filter changes). */
export const staggerContainerExit = (
  stagger = 0.05,
  delayChildren = 0,
): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
  exit: {
    transition: { staggerChildren: stagger / 2, staggerDirection: -1 },
  },
});

export const popItem: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: spring.interactive },
  exit: { opacity: 0, scale: 0.95, transition: reducedTransition },
};

/**
 * Adjusts a transition based on the reduced-motion preference.
 * When reduced, any transform-based animation should collapse to a fade.
 */
export function withReducedMotion(
  transition: Transition,
  reduced: boolean,
): Transition {
  return reduced ? reducedTransition : transition;
}

/** Tactical accent tokens mirrored here so motion code stays palette-aware. */
export const ACCENT = {
  yellow: "#eab308",
  cyan: "#06b6d4",
  emerald: "#10b981",
} as const;
