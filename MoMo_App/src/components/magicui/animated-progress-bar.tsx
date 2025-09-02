"use client";

import { motion, useMotionValue, useTransform } from "motion/react";
import React, { useEffect } from "react";
import { cn } from "@/lib/utils";

interface AnimatedProgressBarProps {
  progress: number; // 0-100
  className?: string;
  height?: number;
  showPercentage?: boolean;
  color?: "primary" | "success" | "warning" | "error";
  animated?: boolean;
  duration?: number;
}

export function AnimatedProgressBar({
  progress,
  className,
  height = 8,
  showPercentage = true,
  color = "primary",
  animated = true,
  duration = 0.8,
}: AnimatedProgressBarProps) {
  const progressValue = useMotionValue(0);
  const width = useTransform(progressValue, (value) => `${value}%`);

  useEffect(() => {
    if (animated) {
      progressValue.set(progress);
    } else {
      progressValue.set(progress);
    }
  }, [progress, progressValue, animated]);

  const colorClasses = {
    primary: "bg-primary",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar container */}
      <div
        className="relative w-full overflow-hidden rounded-full bg-muted"
        style={{ height }}
      >
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${color === 'primary' ? '#3B82F6' : color === 'success' ? '#10B981' : color === 'warning' ? '#F59E0B' : '#EF4444'}20, transparent)`,
          }}
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Progress fill */}
        <motion.div
          className={cn(
            "relative h-full rounded-full transition-all duration-300",
            colorClasses[color]
          )}
          style={{
            width: animated ? width : `${progress}%`,
          }}
          initial={{ width: 0 }}
          animate={{ width: animated ? width : `${progress}%` }}
          transition={{
            duration: animated ? duration : 0,
            ease: "easeOut",
          }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </div>

      {/* Percentage text */}
      {showPercentage && (
        <motion.div
          className="mt-2 text-center text-sm font-medium text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {Math.round(progress)}%
        </motion.div>
      )}
    </div>
  );
}