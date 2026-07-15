import { useRef } from "react";
import { useMotionValue, type MotionValue } from "motion/react";
import { useMotionPrefs } from "@/src/components/motion/MotionProvider";

/**
 * Cursor-reveal: tracks the pointer position *relative to an element* so the
 * element can render a radial spotlight, glow trail, or tilt based on cursor
 * proximity. Relative coordinates are returned as plain MotionValues so they
 * can be dropped into a `background` or `mask` style binding.
 */
export function useCursorReveal<T extends HTMLElement = HTMLDivElement>() {
  const { enabled, effective } = useMotionPrefs();
  const ref = useRef<T>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Opacity ramps up while the pointer is inside the element.
  const active = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!enabled || effective !== "full") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
    active.set(1);
  };

  const handleMouseLeave = () => {
    active.set(0);
  };

  return {
    ref,
    x,
    y,
    active,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  };
}

/**
 * Tracks the global pointer position (viewport coords) for a fixed-position
 * custom cursor / glow trail that follows the mouse everywhere.
 */
export function useCursorPosition(): {
  x: MotionValue<number>;
  y: MotionValue<number>;
  setX: (v: number) => void;
  setY: (v: number) => void;
} {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  return {
    x,
    y,
    setX: (v: number) => x.set(v),
    setY: (v: number) => y.set(v),
  };
}
