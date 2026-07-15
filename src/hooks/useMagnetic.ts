import { useRef } from "react";
import { useMotionValue, useSpring, type MotionValue } from "motion/react";
import { useMotionPrefs } from "@/src/components/motion/MotionProvider";

/**
 * Magnetic hover: the element (or a child) follows the cursor with spring
 * physics when hovered, then springs back to rest on leave.
 *
 * Desktop / pointer-fine only — returns no-ops on reduced motion or touch.
 */
export function useMagnetic<T extends HTMLElement = HTMLDivElement>(options?: {
  /** How strongly the element is pulled toward the cursor (0–1). */
  strength?: number;
  /** Spring used for the return. */
  stiffness?: number;
  damping?: number;
}) {
  const { strength = 0.35, stiffness = 260, damping = 18 } = options ?? {};
  const { enabled, intensity } = useMotionPrefs();
  const ref = useRef<T>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness, damping, mass: 0.6 });
  const sy = useSpring(y, { stiffness, damping, mass: 0.6 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!enabled || intensity < 1) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return {
    ref,
    x: sx,
    y: sy,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    style: { x: sx, y: sy },
  };
}

/** True only for fine-pointer (desktop) devices — gates cursor-reactive UI. */
export function useIsDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
