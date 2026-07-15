import React, { type PropsWithChildren } from "react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
import { useParallax } from "@/src/hooks/useScrollAnimation";

/**
 * ParallaxSection wraps a block and applies a scroll-linked vertical drift +
 * opacity fade as it travels through the viewport. Pure `transform`/`opacity`
 * only, so it never triggers layout. Intensity is auto-dampened for reduced
 * motion via the hook.
 */
export const ParallaxSection: React.FC<
  PropsWithChildren<{
    className?: string;
    /** Parallax travel fraction. */
    speed?: number;
    /** Render as a different element. */
    as?: "section" | "div" | "header";
  }>
> = ({ children, className, speed = 0.3, as = "section" }) => {
  const { ref, y, opacity } = useParallax({ speed });
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp ref={ref} style={{ y, opacity }} className={cn("will-change-transform", className)}>
      {children}
    </Comp>
  );
};

/**
 * ParallaxLayer — a child that drifts at its own speed relative to a scroll
 * container. Bind to a parent that is itself the scroll target.
 */
export const ParallaxLayer: React.FC<
  PropsWithChildren<{
    className?: string;
    /** Positive = moves down on scroll, negative = up. */
    speed?: number;
  }>
> = ({ children, className, speed = 0.15 }) => {
  const { ref, y } = useParallax({ speed, spring: false });
  return (
    <motion.div ref={ref} style={{ y }} className={cn("will-change-transform", className)}>
      {children}
    </motion.div>
  );
};
