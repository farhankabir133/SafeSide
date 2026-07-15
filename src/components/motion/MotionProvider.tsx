import React, { createContext, useContext, useMemo } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Global motion preference context.
 *
 * Combines the OS-level `prefers-reduced-motion` setting with an optional
 * manual override so the whole app can disable or dampen non-essential
 * animation from a single source of truth.
 */

type MotionQuality = "full" | "reduced" | "off";

interface MotionPrefs {
  /** OS-level preference (live). */
  systemReduced: boolean;
  /** Manual user override. `null` = follow system. */
  override: MotionQuality | null;
  /** Effective state used across the app. */
  effective: "full" | "reduced";
  /** Numeric intensity multiplier (reduced => ~0.25 for parallax). */
  intensity: number;
  /** Whether non-essential motion should play at all. */
  enabled: boolean;
  setOverride: (q: MotionQuality | null) => void;
}

const MotionContext = createContext<MotionPrefs | null>(null);

export const MotionProvider: React.FC<{
  children: React.ReactNode;
  defaultOverride?: MotionQuality | null;
}> = ({ children, defaultOverride = null }) => {
  const systemReduced = useReducedMotion();
  const [override, setOverride] = React.useState<MotionQuality | null>(
    defaultOverride,
  );

  const value = useMemo<MotionPrefs>(() => {
    const forcedOff = override === "off";
    const forcedReduced = override === "reduced";
    const forcedFull = override === "full";

    const reduced =
      (systemReduced ?? false) || forcedReduced || (forcedOff ? false : false);
    const off = forcedOff;

    const effective: MotionPrefs["effective"] = off
      ? "reduced"
      : reduced
        ? "reduced"
        : "full";

    return {
      systemReduced: systemReduced ?? false,
      override,
      effective,
      intensity: effective === "full" ? 1 : 0.25,
      enabled: !off,
      setOverride,
    };
  }, [systemReduced, override]);

  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  );
};

export function useMotionPrefs(): MotionPrefs {
  const ctx = useContext(MotionContext);
  if (!ctx) {
    // Graceful fallback when used outside the provider.
    return {
      systemReduced: false,
      override: null,
      effective: "full",
      intensity: 1,
      enabled: true,
      setOverride: () => {},
    };
  }
  return ctx;
}
