"use client";

import { Thermometer } from "lucide-react";

interface HeatMeterProps {
  value: number;
}

export function HeatMeter({ value }: HeatMeterProps) {
  const getLabel = () => {
    if (value > 80) return "Flaming Hot";
    if (value > 60) return "Warm";
    if (value > 40) return "Mild";
    return "Cooling";
  };

  const getColorClass = () => {
    if (value > 80) return "bg-rose-500";
    if (value > 60) return "bg-orange-500";
    if (value > 40) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Thermometer size={18} className="text-rose-500" />
          Partnership Heat
        </h3>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getColorClass()} text-white`}
        >
          {getLabel()}
        </span>
      </div>
      <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out ${getColorClass()}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-3">
        <span className="text-2xl font-bold text-slate-900">{value}°</span>
        <span className="text-xs text-slate-500 italic">Target: 90°+</span>
      </div>
    </div>
  );
}
