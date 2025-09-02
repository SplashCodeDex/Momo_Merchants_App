"use client";

import { motion } from "motion/react";
import React from "react";
import { cn } from "@/lib/utils";

interface FloatingPaymentButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "success";
  floating?: boolean;
}

export const FloatingPaymentButton = React.forwardRef<
  HTMLButtonElement,
  FloatingPaymentButtonProps
>(
  (
    {
      className,
      children,
      size = "md",
      variant = "primary",
      floating = true,
      ...props
    },
    ref,
  ) => {
    const sizeClasses = {
      sm: "h-10 w-10",
      md: "h-14 w-14",
      lg: "h-16 w-16",
    };

    const variantClasses = {
      primary: "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
      secondary: "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/25",
      success: "bg-green-500 text-white shadow-lg shadow-green-500/25",
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          "relative flex items-center justify-center rounded-full font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          sizeClasses[size],
          variantClasses[variant],
          floating && "hover:shadow-xl",
          className,
        )}
        whileHover={{
          scale: 1.1,
          y: floating ? -4 : 0,
        }}
        whileTap={{ scale: 0.95 }}
        animate={
          floating
            ? {
                y: [0, -8, 0],
              }
            : {}
        }
        transition={{
          y: {
            duration: 2,
            repeat: floating ? Infinity : 0,
            ease: "easeInOut",
          },
          scale: {
            type: "spring",
            stiffness: 400,
            damping: 10,
          },
        }}
        {...props}
      >
        {/* Ripple effect on press */}
        <motion.div
          className="absolute inset-0 rounded-full bg-white/20"
          initial={{ scale: 0, opacity: 1 }}
          whileTap={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full opacity-0"
          style={{
            background: `radial-gradient(circle, ${variant === 'primary' ? '#3B82F6' : variant === 'success' ? '#10B981' : '#6B7280'}40 0%, transparent 70%)`,
          }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />

        {/* Content */}
        <span className="relative z-10 flex items-center justify-center">
          {children}
        </span>
      </motion.button>
    );
  },
);

FloatingPaymentButton.displayName = "FloatingPaymentButton";