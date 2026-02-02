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
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: "staff" | "manager" | "admin";
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: "staff" | "manager" | "admin";
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: "staff" | "manager" | "admin";
          created_at?: string;
        };
        Relationships: [];
      };
      postcards: {
        Row: {
          id: string;
          author_id: string | null;
          training_title: string;
          elevator_pitch: string | null;
          lightbulb_moment: string | null;
          programme_impact: string | null;
          golden_nugget: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id?: string | null;
          training_title: string;
          elevator_pitch?: string | null;
          lightbulb_moment?: string | null;
          programme_impact?: string | null;
          golden_nugget?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string | null;
          training_title?: string;
          elevator_pitch?: string | null;
          lightbulb_moment?: string | null;
          programme_impact?: string | null;
          golden_nugget?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "postcards_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      three_two_one: {
        Row: {
          id: string;
          author_id: string | null;
          training_title: string;
          learnings: string[];
          changes: string[];
          question: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id?: string | null;
          training_title: string;
          learnings: string[];
          changes: string[];
          question?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string | null;
          training_title?: string;
          learnings?: string[];
          changes?: string[];
          question?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "three_two_one_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      takeovers: {
        Row: {
          id: string;
          presenter_id: string | null;
          meeting_date: string;
          top_learnings: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          presenter_id?: string | null;
          meeting_date: string;
          top_learnings?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          presenter_id?: string | null;
          meeting_date?: string;
          top_learnings?: string[] | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "takeovers_presenter_id_fkey";
            columns: ["presenter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
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

// Helper types for easier use
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Postcard = Database["public"]["Tables"]["postcards"]["Row"];
export type ThreeTwoOne = Database["public"]["Tables"]["three_two_one"]["Row"];
export type Takeover = Database["public"]["Tables"]["takeovers"]["Row"];

export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type PostcardInsert = Database["public"]["Tables"]["postcards"]["Insert"];
export type ThreeTwoOneInsert = Database["public"]["Tables"]["three_two_one"]["Insert"];
export type TakeoverInsert = Database["public"]["Tables"]["takeovers"]["Insert"];
