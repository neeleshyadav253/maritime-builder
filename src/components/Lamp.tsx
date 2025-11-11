import React from "react";

interface LampProps {
  on: boolean;
  label: string;
  color?: string;
}

export function Lamp({ on, label, color = "bg-amber-400" }: LampProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-3 w-3 rounded-full shadow ${on ? color : "bg-gray-600"}`}
      />
      <span className="text-xs text-gray-300">{label}</span>
    </div>
  );
}
