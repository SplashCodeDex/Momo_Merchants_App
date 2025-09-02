"use client";

import { motion } from "motion/react";
import React from "react";
import { cn } from "@/lib/utils";

interface AnimatedTransactionCardProps {
  children?: React.ReactNode;
  className?: string;
  amount?: string;
  status?: "pending" | "completed" | "failed";
  pulseColor?: string;
}

export function AnimatedTransactionCard({
  children,
  className,
  amount = "₦0.00",
  status = "pending",
  pulseColor = "#10B981",
}: AnimatedTransactionCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "#10B981"; // green
      case "failed":
        return "#EF4444"; // red
      case "pending":
      default:
        return "#F59E0B"; // yellow
    }
  };

  const statusColor = getStatusColor();

  return (
    <motion.div
      className={cn(
        "relative rounded-lg border bg-card p-4 shadow-sm",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Pulse effect for pending transactions */}
      {status === "pending" && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{
            background: `radial-gradient(circle, ${pulseColor}20 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Status indicator */}
      <motion.div
        className="absolute top-2 right-2 h-3 w-3 rounded-full"
        style={{ backgroundColor: statusColor }}
        animate={status === "pending" ? { scale: [1, 1.2, 1] } : {}}
        transition={{
          duration: 1.5,
          repeat: status === "pending" ? Infinity : 0,
          ease: "easeInOut",
        }}
      />

      {/* Amount display with animation */}
      <motion.div
        className="mb-2 text-2xl font-bold text-primary"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        {amount}
      </motion.div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}