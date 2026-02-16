"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

interface PipelineChartProps {
  pipeline: {
    registered: number;
    interviewed: number;
    trained: number;
    approved: number;
    matched: number;
  };
}

export function PipelineChart({ pipeline }: PipelineChartProps) {
  const data = [
    { name: "Registered", val: pipeline.registered, color: "#94a3b8" },
    { name: "Interviewed", val: pipeline.interviewed, color: "#6366f1" },
    { name: "Trained", val: pipeline.trained, color: "#8b5cf6" },
    { name: "Approved", val: pipeline.approved, color: "#ec4899" },
    { name: "Matched", val: pipeline.matched, color: "#10b981" },
  ];

  return (
    <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <h3 className="font-bold text-slate-800 mb-6">
        Mentor Pipeline Stage Tracking
      </h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fontWeight: 600 }}
              stroke="#64748b"
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Bar dataKey="val" radius={[6, 6, 0, 0]} barSize={50}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList
                dataKey="val"
                position="top"
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  fill: "#1e293b",
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
