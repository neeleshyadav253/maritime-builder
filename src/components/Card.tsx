import React from "react";
import { motion } from "framer-motion";

interface CardProps {
  title: string;
  children: React.ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="p-4 border shadow-lg rounded-2xl border-slate-800 bg-slate-900/60"
    >
      <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase text-slate-300">
        {title}
      </h2>
      {children}
    </motion.div>
  );
}
