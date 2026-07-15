import React, { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useMotionPrefs } from "@/src/components/motion/MotionProvider";
import { useIsDesktop } from "@/src/hooks/useMagnetic";

/**
 * CursorGlow — a global, fixed-position tactical reticle that trails the
 * pointer across the whole app (desktop only). It is purely decorative and
 * pointer-events-none, so it never blocks interaction. Disabled automatically
 * on touch devices and when reduced motion is requested.
 */
export const CursorGlow: React.FC = () => {
  const { enabled, effective } = useMotionPrefs();
  const isDesktop = useIsDesktop();

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });

  useEffect(() => {
    if (!enabled || effective !== "full" || !isDesktop) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [enabled, effective, isDesktop, x, y]);

  if (!isDesktop) return null;

  return (
    <>
      {/* Outer ring reticle */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9998] h-9 w-9 rounded-full border border-yellow-500/40 mix-blend-screen"
        style={{
          x: sx,
          y: sy,
          marginLeft: -18,
          marginTop: -18,
          opacity: effective === "full" ? 1 : 0,
        }}
      />
      {/* Inner dot */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-1.5 w-1.5 rounded-full bg-yellow-400 mix-blend-screen"
        style={{
          x: sx,
          y: sy,
          marginLeft: -3,
          marginTop: -3,
          opacity: effective === "full" ? 1 : 0,
        }}
      />
    </>
  );
};
