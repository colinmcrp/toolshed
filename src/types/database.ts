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
          role: "staff" | "manager" | "admin";
          team_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: "staff" | "manager" | "admin";
          team_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: "staff" | "manager" | "admin";
          team_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
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
