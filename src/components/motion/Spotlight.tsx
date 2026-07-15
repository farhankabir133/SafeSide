import React from "react";
import { motion, useMotionTemplate } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useCursorReveal } from "@/src/hooks/useCursorReveal";

/**
 * Spotlight — an absolutely-positioned, pointer-events-none layer that paints a
 * radial glow following the cursor inside its parent. Bind it as the last child
 * of a relative container (e.g. a stats grid / hero visual) for a "cursor
 * flashlight" effect. Color + radius are configurable.
 */
export const Spotlight: React.FC<{
  className?: string;
  /** CSS color for the glow center. */
  color?: string;
  /** Radius of the glow in px. */
  size?: number;
}> = ({ className, color = "rgba(234,179,8,0.16)", size = 420 }) => {
  const { ref, x, y, active, onMouseMove, onMouseLeave } = useCursorReveal();
  const background = useMotionTemplate`radial-gradient(${size}px circle at ${x}px ${y}px, ${color}, transparent 70%)`;

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      aria-hidden
      className={cn("absolute inset-0 pointer-events-none z-0", className)}
      style={{ background, opacity: active }}
    />
  );
};
