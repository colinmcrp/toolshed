"use client";

import type { PartnerWithRelations } from "@/types/partnerships";
import { HeatMeter } from "./heat-meter";
import { TaskBoard } from "./task-board";
import { PipelineChart } from "./pipeline-chart";
import { GoalsProgress } from "./goals-progress";
import { DocumentsTable } from "./documents-table";
import { AIInsightsCard } from "./ai-insights-card";
import { EmailActivityLog } from "./email-activity-log";
import { EmailComposeModal } from "./email-compose-modal";
import { AIChatbotPanel } from "./ai-chatbot-panel";
import { ViewAsPartnerToggle } from "./view-as-partner-toggle";
import { PartnerPortal } from "./partner-portal";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Target,
  Clock,
  Calendar,
  Briefcase,
} from "lucide-react";

const RelationshipGraph = dynamic(
  () =>
    import("./relationship-graph").then((mod) => ({
      default: mod.RelationshipGraph,
    })),
  { ssr: false }
);

interface InternalViewProps {
  partner: PartnerWithRelations;
}

export function InternalView({ partner }: InternalViewProps) {
  const [viewAsPartner, setViewAsPartner] = useState(false);

  const pipeline = {
    registered: partner.pipeline_registered,
    interviewed: partner.pipeline_interviewed,
    trained: partner.pipeline_trained,
    approved: partner.pipeline_approved,
    matched: partner.pipeline_matched,
  };

  const chatContext = {
    name: partner.name,
    types: partner.types,
    heat: partner.heat,
    summary: partner.summary,
    mentors_count: partner.mentors_count,
    volunteer_hours: partner.volunteer_hours,
    recentEmails: partner.emails
      .slice(0, 3)
      .map((e) => `${e.subject} (${e.sender})`)
      .join("; "),
    openTasks: partner.tasks
      .filter((t) => t.status !== "Completed")
      .map((t) => t.title)
      .join("; "),
  };

  if (viewAsPartner) {
    return (
      <div>
        <div className="mb-6 flex justify-end">
          <ViewAsPartnerToggle
            onToggle={setViewAsPartner}
            isPartnerView={true}
          />
        </div>
        <PartnerPortal partner={partner} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-end gap-3">
        <EmailComposeModal partnerId={partner.id} />
        <AIChatbotPanel partnerContext={chatContext} />
        <ViewAsPartnerToggle
          onToggle={setViewAsPartner}
          isPartnerView={false}
        />
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Metrics Row */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Target size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Mentor Pipeline
              </p>
              <p className="text-xl font-bold">
                {pipeline.matched} Matched
              </p>
              <p className="text-[10px] text-slate-400 font-medium italic">
                of {pipeline.registered} registered
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Volunteer Impact
              </p>
              <p className="text-xl font-bold">
                {partner.volunteer_hours} Hours
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Partnership Age
              </p>
              <p className="text-xl font-bold">4.2 Years</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                Space Commitments
              </p>
              <p className="text-xl font-bold">
                {partner.commitments.filter((c) => c.type === "Space/Facilities" && c.status === "Active").length}{" "}
                Sites Active
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-8">
          <AIInsightsCard
            partnerName={partner.name}
            summary={partner.summary}
            goals={partner.goals.map((g) => g.title)}
          />
          <PipelineChart pipeline={pipeline} />
          <TaskBoard tasks={partner.tasks} />
          <GoalsProgress goals={partner.goals} />
          <DocumentsTable documents={partner.documents} />
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <HeatMeter value={partner.heat} />
          <div className="h-[350px]">
            <RelationshipGraph />
          </div>
          <EmailActivityLog emails={partner.emails} />
        </div>
      </div>
    </div>
  );
}
