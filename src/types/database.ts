export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: "staff" | "manager" | "admin" | "partner";
          team_id: string | null;
          partner_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: "staff" | "manager" | "admin" | "partner";
          team_id?: string | null;
          partner_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: "staff" | "manager" | "admin" | "partner";
          team_id?: string | null;
          partner_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          }
        ];
      };
      partners: {
        Row: {
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
        };
        Insert: {
          id?: string;
          name: string;
          types?: string[];
          heat?: number;
          last_contact?: string | null;
          summary?: string | null;
          volunteer_hours?: number;
          mentors_count?: number;
          pipeline_registered?: number;
          pipeline_interviewed?: number;
          pipeline_trained?: number;
          pipeline_approved?: number;
          pipeline_matched?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          types?: string[];
          heat?: number;
          last_contact?: string | null;
          summary?: string | null;
          volunteer_hours?: number;
          mentors_count?: number;
          pipeline_registered?: number;
          pipeline_interviewed?: number;
          pipeline_trained?: number;
          pipeline_approved?: number;
          pipeline_matched?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      partner_domains: {
        Row: {
          id: string;
          domain: string;
          partner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          domain: string;
          partner_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          domain?: string;
          partner_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_domains_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          }
        ];
      };
      emails: {
        Row: {
          id: string;
          partner_id: string;
          sender: string;
          recipient: string | null;
          subject: string;
          content: string | null;
          status: "draft" | "sent" | "received" | "opened";
          thread_id: string | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          sender: string;
          recipient?: string | null;
          subject: string;
          content?: string | null;
          status?: "draft" | "sent" | "received" | "opened";
          thread_id?: string | null;
          date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          partner_id?: string;
          sender?: string;
          recipient?: string | null;
          subject?: string;
          content?: string | null;
          status?: "draft" | "sent" | "received" | "opened";
          thread_id?: string | null;
          date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emails_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          }
        ];
      };
      tasks: {
        Row: {
          id: string;
          partner_id: string;
          title: string;
          due_date: string | null;
          status: "To Do" | "In Progress" | "Completed";
          priority: "Low" | "Medium" | "High";
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          title: string;
          due_date?: string | null;
          status?: "To Do" | "In Progress" | "Completed";
          priority?: "Low" | "Medium" | "High";
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          partner_id?: string;
          title?: string;
          due_date?: string | null;
          status?: "To Do" | "In Progress" | "Completed";
          priority?: "Low" | "Medium" | "High";
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      documents: {
        Row: {
          id: string;
          partner_id: string;
          name: string;
          type: string;
          status: "Draft" | "Final" | "Expired";
          file_url: string | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          name: string;
          type: string;
          status?: "Draft" | "Final" | "Expired";
          file_url?: string | null;
          date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          partner_id?: string;
          name?: string;
          type?: string;
          status?: "Draft" | "Final" | "Expired";
          file_url?: string | null;
          date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          }
        ];
      };
      commitments: {
        Row: {
          id: string;
          partner_id: string;
          type: string;
          description: string;
          status: "Active" | "Fulfilled" | "Planned";
          created_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          type: string;
          description: string;
          status?: "Active" | "Fulfilled" | "Planned";
          created_at?: string;
        };
        Update: {
          id?: string;
          partner_id?: string;
          type?: string;
          description?: string;
          status?: "Active" | "Fulfilled" | "Planned";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "commitments_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          }
        ];
      };
      goals: {
        Row: {
          id: string;
          partner_id: string;
          title: string;
          target: number;
          current: number;
          unit: string;
          deadline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          title: string;
          target: number;
          current?: number;
          unit: string;
          deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          partner_id?: string;
          title?: string;
          target?: number;
          current?: number;
          unit?: string;
          deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type TeamInsert = Database["public"]["Tables"]["teams"]["Insert"];

// Partnership types
export type Partner = Database["public"]["Tables"]["partners"]["Row"];
export type PartnerInsert = Database["public"]["Tables"]["partners"]["Insert"];
export type PartnerDomain = Database["public"]["Tables"]["partner_domains"]["Row"];
export type EmailRecord = Database["public"]["Tables"]["emails"]["Row"];
export type EmailInsert = Database["public"]["Tables"]["emails"]["Insert"];
export type TaskRecord = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
export type DocumentRecord = Database["public"]["Tables"]["documents"]["Row"];
export type CommitmentRecord = Database["public"]["Tables"]["commitments"]["Row"];
export type GoalRecord = Database["public"]["Tables"]["goals"]["Row"];
