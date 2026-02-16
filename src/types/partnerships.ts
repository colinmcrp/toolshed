import type * as d3 from "d3";

// D3 relationship graph types
export interface RelationshipNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  role: string;
  type: "partner" | "internal";
}

export interface RelationshipLink extends d3.SimulationLinkDatum<RelationshipNode> {
  source: string | RelationshipNode;
  target: string | RelationshipNode;
  strength: number;
}

// AI response types
export interface AISuggestion {
  title: string;
  description: string;
  benefit: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Partner with all relations (loaded via joins)
export interface PartnerWithRelations {
  id: string;
  name: string;
  types: string[];
  heat: number;
  last_contact: string | null;
  summary: string | null;
  volunteer_hours: number;
  mentors_count: number;
  pipeline_registered: number;
  pipeline_interviewed: number;
  pipeline_trained: number;
  pipeline_approved: number;
  pipeline_matched: number;
  created_at: string;
  updated_at: string;
  goals: {
    id: string;
    title: string;
    target: number;
    current: number;
    unit: string;
    deadline: string | null;
  }[];
  documents: {
    id: string;
    name: string;
    type: string;
    status: "Draft" | "Final" | "Expired";
    file_url: string | null;
    date: string;
  }[];
  commitments: {
    id: string;
    type: string;
    description: string;
    status: "Active" | "Fulfilled" | "Planned";
  }[];
  tasks: {
    id: string;
    title: string;
    due_date: string | null;
    status: "To Do" | "In Progress" | "Completed";
    priority: "Low" | "Medium" | "High";
    assigned_to: string | null;
  }[];
  emails: {
    id: string;
    sender: string;
    recipient: string | null;
    subject: string;
    content: string | null;
    status: "draft" | "sent" | "received" | "opened";
    thread_id: string | null;
    date: string;
  }[];
}
