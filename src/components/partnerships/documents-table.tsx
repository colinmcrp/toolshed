"use client";

import { useState } from "react";
import type { AISuggestion } from "@/types/partnerships";
import { analyzePolicyContent } from "@/lib/ai";
import {
  Plus,
  FileText,
  Download,
  BrainCircuit,
  TrendingUp,
  Loader2,
} from "lucide-react";

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  status: "Draft" | "Final" | "Expired";
  file_url: string | null;
  date: string;
}

interface DocumentsTableProps {
  documents: DocumentItem[];
}

export function DocumentsTable({ documents }: DocumentsTableProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [policyInsights, setPolicyInsights] = useState<AISuggestion[]>([]);

  const handleAnalyzePolicy = async () => {
    setAiLoading(true);
    try {
      // TODO: Fetch actual document content from file_url when document storage is implemented
      const policyText =
        "Our Corporate Parenting plan aims to provide 10% of our workforce as mentors and offer 5 apprenticeships specifically for care-experienced youth.";
      const results = await analyzePolicyContent(policyText);
      setPolicyInsights(results);
    } catch {
      // silently fail
    }
    setAiLoading(false);
  };

  return (
    <>
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
          Collaborative Documents
          <button className="text-xs font-bold text-indigo-600 flex items-center gap-1">
            <Plus size={14} /> UPLOAD NEW
          </button>
        </h3>
        <div className="overflow-hidden border border-slate-100 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3">Document Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-slate-50 group transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-slate-400" />
                      <span className="font-medium text-slate-700">
                        {doc.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {doc.type}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${doc.status === "Final" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}
                    >
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {doc.type === "Policy" && (
                        <button
                          onClick={handleAnalyzePolicy}
                          disabled={aiLoading}
                          className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Analyze for Opportunities"
                        >
                          {aiLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <BrainCircuit size={16} />
                          )}
                        </button>
                      )}
                      <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg">
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {policyInsights.length > 0 && (
        <section className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
          <h3 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
            <BrainCircuit size={20} />
            AI Suggested Collaboration Opportunities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policyInsights.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100"
              >
                <p className="font-bold text-slate-800 text-sm mb-1">
                  {item.title}
                </p>
                <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                  {item.description}
                </p>
                <div className="pt-2 border-t border-slate-50 flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                  <TrendingUp size={12} /> {item.benefit}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
