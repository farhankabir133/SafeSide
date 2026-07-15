import { useRef } from "react";
import {
  useScroll,
  useTransform,
  useSpring,
  type MotionValue,
} from "motion/react";
import { useMotionPrefs } from "@/src/components/motion/MotionProvider";

/**
 * Reusable scroll-linked motion patterns.
 *
 * Every helper returns a `ref` to attach to the target element plus one or
 * more `MotionValue`s to bind in `style`. Parallax intensity is automatically
 * dampened when the user prefers reduced motion.
 */

interface ParallaxOptions {
  /** Fraction of element height to travel across its scroll range. 0.3 = subtle. */
  speed?: number;
  /** Scroll offset tuple passed to `useScroll`. */
  offset?: [string, string];
  /** Return a smoothed (spring) value instead of raw. */
  spring?: boolean;
}

export function useParallax<T extends HTMLElement = HTMLDivElement>(
  options: ParallaxOptions = {},
) {
  const { speed = 0.3, offset = ["start end", "end start"], spring: withSpring = true } = options;
  const { intensity } = useMotionPrefs();
  const ref = useRef<T>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: offset as [any, any],
  });

  const rawY = useTransform(
    scrollYProgress,
    [0, 1],
    [`${-speed * 50 * intensity}%`, `${speed * 50 * intensity}%`],
  );
  const y = withSpring ? useSpring(rawY, { stiffness: 120, damping: 30 }) : rawY;

  // Fade in as the element enters, fade out as it leaves.
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.18, 0.82, 1],
    [0.15 * intensity + (intensity < 1 ? 0.7 : 0), 1, 1, 0.3],
  );

  return { ref, y, opacity, scrollYProgress };
}

/**
 * Reveals children (opacity + y) as the element scrolls into view, then keeps
 * them visible. Good for section headers / stat blocks.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  distance = 40,
) {
  const { intensity } = useMotionPrefs();
  const ref = useRef<T>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "start 0.4"],
  });

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`${distance * intensity}px`, "0px"],
  );
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return { ref, y, opacity };
}

/**
 * Tracks the page (or container) scroll Y as a smoothed MotionValue, useful
 * for fixed HUD elements that drift with scroll.
 */
export function useScrollY(target?: React.RefObject<HTMLElement>): MotionValue<number> {
  const { scrollY } = useScroll(target ? { container: target } : undefined);
  return useSpring(scrollY, { stiffness: 100, damping: 30, mass: 0.5 });
}
