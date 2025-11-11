import { fmt } from "../utils/constants";

interface GaugeProps {
  label: string;
  value: number;
  unit: string;
  max: number;
}

export function Gauge({ label, value, unit, max }: GaugeProps) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="p-3 rounded-xl bg-slate-800">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-gray-400">{label}</div>
          <div className="text-lg font-semibold">
            {fmt.num(value, 1)}{" "}
            <span className="text-xs font-normal text-gray-400">{unit}</span>
          </div>
        </div>
        <div className="w-20 text-xs text-right text-gray-400">max {max}</div>
      </div>
      <div className="w-full h-2 mt-2 rounded bg-slate-700">
        <div
          className="h-2 rounded bg-emerald-500"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
