"use client";

import React, { useState, useEffect } from "react";
import { AnimatedTransactionCard } from "./magicui/animated-transaction-card";
import { FloatingPaymentButton } from "./magicui/floating-payment-button";
import { AnimatedProgressBar } from "./magicui/animated-progress-bar";
import { ShimmerCard, ShimmerList } from "./magicui/shimmer-loading";
import { motion } from "motion/react";

export function CustomAnimationsDemo() {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsLoading(false);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handlePayment = () => {
    alert("Payment initiated!");
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-primary mb-2">
          Custom Animated Components Demo
        </h1>
        <p className="text-muted-foreground">
          Showcasing custom animated components for the MoMo Merchant App
        </p>
      </motion.div>

      {/* Transaction Cards Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Transaction Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnimatedTransactionCard
            amount="₦25,000"
            status="completed"
            className="cursor-pointer"
          >
            <div className="text-sm text-muted-foreground">
              Payment to Vendor A
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Completed • 2 hours ago
            </div>
          </AnimatedTransactionCard>

          <AnimatedTransactionCard
            amount="₦15,000"
            status="pending"
            className="cursor-pointer"
          >
            <div className="text-sm text-muted-foreground">
              Transfer to Customer B
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Processing • 5 min ago
            </div>
          </AnimatedTransactionCard>

          <AnimatedTransactionCard
            amount="₦5,000"
            status="failed"
            className="cursor-pointer"
          >
            <div className="text-sm text-muted-foreground">
              Bill Payment Failed
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Failed • 1 hour ago
            </div>
          </AnimatedTransactionCard>
        </div>
      </section>

      {/* Progress Bar Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Transaction Progress</h2>
        <div className="max-w-md mx-auto space-y-4">
          <AnimatedProgressBar
            progress={progress}
            color={progress < 50 ? "warning" : progress < 100 ? "primary" : "success"}
          />
          <p className="text-center text-sm text-muted-foreground">
            {progress < 100 ? "Processing transaction..." : "Transaction completed!"}
          </p>
        </div>
      </section>

      {/* Floating Payment Buttons Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Payment Actions</h2>
        <div className="flex flex-wrap gap-4 justify-center">
          <FloatingPaymentButton
            size="lg"
            variant="primary"
            onClick={handlePayment}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </FloatingPaymentButton>

          <FloatingPaymentButton
            size="md"
            variant="success"
            onClick={handlePayment}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </FloatingPaymentButton>

          <FloatingPaymentButton
            size="sm"
            variant="secondary"
            floating={false}
            onClick={handlePayment}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </FloatingPaymentButton>
        </div>
      </section>

      {/* Loading States Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Loading States</h2>
        {isLoading ? (
          <div className="space-y-4">
            <ShimmerCard avatar />
            <ShimmerList count={3} />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <p className="text-lg font-medium">All components loaded successfully!</p>
          </motion.div>
        )}
      </section>
    </div>
  );
}