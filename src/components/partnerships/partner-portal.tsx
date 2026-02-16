"use client";

import type { PartnerWithRelations } from "@/types/partnerships";
import {
  Users,
  BookOpen,
  ArrowUpRight,
  Download,
  Play,
  FileText,
  CheckCircle2,
  Share2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";

interface PartnerPortalProps {
  partner: PartnerWithRelations;
}

export function PartnerPortal({ partner: p }: PartnerPortalProps) {
  const pipelineDisplay = [
    { name: "Interested", val: p.pipeline_registered },
    { name: "Interviewed", val: p.pipeline_interviewed },
    { name: "Trained", val: p.pipeline_trained },
    { name: "Approved", val: p.pipeline_approved },
    { name: "Matched", val: p.pipeline_matched },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Welcome Banner */}
      <header className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 shadow-lg text-indigo-600 font-bold text-xl">
              {p.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{p.name} Hub</h1>
              <p className="text-indigo-200 font-medium">
                Empowering {p.mentors_count} young people through mentoring.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">
                Live Mentors
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">{p.mentors_count}</p>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">
                Volunteer Hours
              </p>
              <p className="text-3xl font-bold">{p.volunteer_hours}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">
                MCR Staff Onsite
              </p>
              <p className="text-3xl font-bold">2</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">
                Collaborative Docs
              </p>
              <p className="text-3xl font-bold">{p.documents.length}</p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col */}
        <div className="lg:col-span-8 space-y-8">
          {/* Pipeline */}
          <section className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Users size={20} className="text-indigo-600" />
              Your Mentoring Pipeline
            </h2>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineDisplay}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fontWeight: 700 }}
                    stroke="#94a3b8"
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{ borderRadius: "12px", border: "none" }}
                  />
                  <Bar dataKey="val" radius={[4, 4, 0, 0]} barSize={40}>
                    {pipelineDisplay.map((_, index) => (
                      <Cell
                        key={index}
                        fill={index === 4 ? "#10b981" : "#6366f1"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 grid grid-cols-5 gap-4">
              {pipelineDisplay.map((d, i) => (
                <div key={i} className="text-center">
                  <p className="text-xl font-bold text-slate-800">{d.val}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {d.name}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Documents */}
          <section className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">
                Joint Documentation
              </h2>
              <button className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-lg">
                SHARE NEW FILE
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {p.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 border border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-slate-50 transition-all flex items-start gap-4 group"
                >
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">
                      {doc.name}
                    </p>
                    <p className="text-xs text-slate-500 mb-2">
                      {doc.type} •{" "}
                      {new Date(doc.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <div className="flex gap-3">
                      <button className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1">
                        <Download size={12} /> Download
                      </button>
                      <button className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Share2 size={12} /> Share
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Col */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CheckCircle2 size={20} />
              Ready to expand?
            </h3>
            <p className="text-sm text-indigo-100 mb-6 leading-relaxed">
              You currently have {p.pipeline_matched} matched mentors. Your goal
              is {p.goals.find((g) => g.unit === "Mentors")?.target ?? 50}. Want
              to launch a staff-wide recruitment drive?
            </p>
            <button className="w-full py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg">
              Request Recruitment Kit
            </button>
          </section>

          <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-500" />
              Latest Training
            </h3>
            <div className="space-y-4">
              {[
                {
                  title: "Mentoring V2 Workshop",
                  type: "Hybrid",
                  date: "June 10",
                },
                {
                  title: "Trauma Informed Care",
                  type: "Digital",
                  date: "Available",
                },
              ].map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {t.type} • {t.date}
                    </p>
                  </div>
                  <ArrowUpRight
                    size={14}
                    className="text-slate-300 group-hover:text-indigo-600"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <Play size={16} fill="currentColor" />
                Impact Stories
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Hear from {p.name} staff who have transformed lives this year.
              </p>
              <div className="aspect-video bg-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/20 transition-all border border-white/10">
                <Play size={32} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
