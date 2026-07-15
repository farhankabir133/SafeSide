import React, { type PropsWithChildren } from "react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useMagnetic } from "@/src/hooks/useMagnetic";

/**
 * Magnetic — wraps any content and makes it drift toward the cursor with spring
 * physics while hovered. Used for nav links, logos, and CTA buttons to give
 * the UI a "physical" tactile feel. No-ops on touch / reduced motion.
 */
export const Magnetic: React.FC<
  PropsWithChildren<{
    className?: string;
    strength?: number;
    stiffness?: number;
    damping?: number;
  }>
> = ({ children, className, strength, stiffness, damping }) => {
  const { ref, style, onMouseMove, onMouseLeave } = useMagnetic({
    strength,
    stiffness,
    damping,
  });
  return (
    <motion.div
      ref={ref}
      style={style}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn("will-change-transform inline-flex", className)}
    >
      {children}
    </motion.div>
  );
};
