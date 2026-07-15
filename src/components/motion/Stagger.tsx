import React, { type PropsWithChildren } from "react";
import { motion, type Variants } from "motion/react";
import { cn } from "@/src/lib/utils";
import { staggerContainer, fadeUp, popItem } from "@/src/lib/motion";

/**
 * StaggerContainer orchestrates a parent/child choreography. Children wrapped
 * in <StaggerItem> animate in sequence. Defaults to scroll-triggered reveal
 * so lists "draw in" as they enter the viewport.
 */
export const StaggerContainer: React.FC<
  PropsWithChildren<{
    className?: string;
    /** Seconds between each child. */
    stagger?: number;
    delayChildren?: number;
    /** When true (default) reveal on scroll-in; otherwise animate on mount. */
    inView?: boolean;
    /** Fraction of element visible before triggering. */
    amount?: number;
    variants?: Variants;
  }>
> = ({
  children,
  className,
  stagger = 0.07,
  delayChildren = 0,
  inView = true,
  amount = 0.25,
  variants,
}) => {
  return (
    <motion.div
      className={className}
      variants={variants ?? staggerContainer(stagger, delayChildren)}
      initial="hidden"
      animate={inView ? undefined : "visible"}
      whileInView={inView ? "visible" : undefined}
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
};

/**
 * StaggerItem — a single animated child. Renders a motion.div bound to the
 * parent's variant names ("hidden" / "visible"). Pass a custom `variants` to
 * override the default fade-up.
 */
export const StaggerItem: React.FC<
  PropsWithChildren<{
    className?: string;
    variants?: Variants;
    /** Render as a different motion element. */
    as?: "div" | "li" | "article" | "section";
  }>
> = ({ children, className, variants, as = "div" }) => {
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp className={cn("will-change-transform", className)} variants={variants ?? fadeUp}>
      {children}
    </Comp>
  );
};

/** Pop-style item used for filterable lists (has an exit state). */
export const PopItem: React.FC<
  PropsWithChildren<{ className?: string }>
> = ({ children, className }) => (
  <motion.div className={className} variants={popItem} layout>
    {children}
  </motion.div>
);
