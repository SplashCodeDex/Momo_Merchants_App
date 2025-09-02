"use client";

import { motion } from "motion/react";
import React from "react";
import { cn } from "@/lib/utils";

interface ShimmerLoadingProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  shimmerColor?: string;
  backgroundColor?: string;
  speed?: number;
}

export function ShimmerLoading({
  className,
  width = "100%",
  height = "1rem",
  borderRadius = "0.375rem",
  shimmerColor = "#ffffff",
  backgroundColor = "#f3f4f6",
  speed = 1.5,
}: ShimmerLoadingProps) {
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor,
      }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent, ${shimmerColor}40, transparent)`,
        }}
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

interface ShimmerCardProps {
  className?: string;
  lines?: number;
  avatar?: boolean;
}

export function ShimmerCard({
  className,
  lines = 3,
  avatar = false,
}: ShimmerCardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-lg border bg-card p-4 shadow-sm space-y-3",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {avatar && (
        <div className="flex items-center space-x-3">
          <ShimmerLoading
            width={40}
            height={40}
            borderRadius="50%"
            className="flex-shrink-0"
          />
          <div className="flex-1 space-y-2">
            <ShimmerLoading width="60%" height={16} />
            <ShimmerLoading width="40%" height={12} />
          </div>
        </div>
      )}

      {!avatar && (
        <>
          <ShimmerLoading width="80%" height={20} />
          <ShimmerLoading width="60%" height={16} />
        </>
      )}

      {Array.from({ length: lines }, (_, i) => (
        <ShimmerLoading
          key={i}
          width={`${Math.random() * 40 + 60}%`}
          height={14}
        />
      ))}
    </motion.div>
  );
}

interface ShimmerListProps {
  className?: string;
  count?: number;
  itemHeight?: number;
}

export function ShimmerList({
  className,
  count = 5,
  itemHeight = 60,
}: ShimmerListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          className="flex items-center space-x-3 rounded-lg border bg-card p-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
        >
          <ShimmerLoading
            width={itemHeight * 0.8}
            height={itemHeight * 0.8}
            borderRadius="0.375rem"
          />
          <div className="flex-1 space-y-2">
            <ShimmerLoading width="70%" height={16} />
            <ShimmerLoading width="50%" height={12} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}