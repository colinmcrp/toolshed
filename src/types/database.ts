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
      postcards: {
        Row: {
          id: string;
          author_id: string | null;
          training_title: string;
          elevator_pitch: string | null;
          lightbulb_moment: string | null;
          programme_impact: string | null;
          golden_nugget: string | null;
          visibility: "org" | "team";
          team_id: string | null;
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
          visibility?: "org" | "team";
          team_id?: string | null;
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
          visibility?: "org" | "team";
          team_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "postcards_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "postcards_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
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
          visibility: "org" | "team";
          team_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id?: string | null;
          training_title: string;
          learnings: string[];
          changes: string[];
          question?: string | null;
          visibility?: "org" | "team";
          team_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string | null;
          training_title?: string;
          learnings?: string[];
          changes?: string[];
          question?: string | null;
          visibility?: "org" | "team";
          team_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "three_two_one_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "three_two_one_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
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
          visibility: "org" | "team";
          team_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          presenter_id?: string | null;
          meeting_date: string;
          top_learnings?: string[] | null;
          visibility?: "org" | "team";
          team_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          presenter_id?: string | null;
          meeting_date?: string;
          top_learnings?: string[] | null;
          visibility?: "org" | "team";
          team_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "takeovers_presenter_id_fkey";
            columns: ["presenter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "takeovers_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      themes: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "themes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      postcard_themes: {
        Row: {
          postcard_id: string;
          theme_id: string;
        };
        Insert: {
          postcard_id: string;
          theme_id: string;
        };
        Update: {
          postcard_id?: string;
          theme_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "postcard_themes_postcard_id_fkey";
            columns: ["postcard_id"];
            isOneToOne: false;
            referencedRelation: "postcards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "postcard_themes_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          }
        ];
      };
      three_two_one_themes: {
        Row: {
          three_two_one_id: string;
          theme_id: string;
        };
        Insert: {
          three_two_one_id: string;
          theme_id: string;
        };
        Update: {
          three_two_one_id?: string;
          theme_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "three_two_one_themes_three_two_one_id_fkey";
            columns: ["three_two_one_id"];
            isOneToOne: false;
            referencedRelation: "three_two_one";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "three_two_one_themes_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          }
        ];
      };
      takeover_themes: {
        Row: {
          takeover_id: string;
          theme_id: string;
        };
        Insert: {
          takeover_id: string;
          theme_id: string;
        };
        Update: {
          takeover_id?: string;
          theme_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "takeover_themes_takeover_id_fkey";
            columns: ["takeover_id"];
            isOneToOne: false;
            referencedRelation: "takeovers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "takeover_themes_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_postcards_by_themes: {
        Args: {
          theme_slugs: string[] | null;
        };
        Returns: {
          id: string;
          training_title: string;
          elevator_pitch: string | null;
          lightbulb_moment: string | null;
          programme_impact: string | null;
          golden_nugget: string | null;
          visibility: string;
          team_id: string | null;
          author_id: string;
          created_at: string;
          team_name: string | null;
          theme_data: Json;
        }[];
      };
      get_three_two_ones_by_themes: {
        Args: {
          theme_slugs: string[] | null;
        };
        Returns: {
          id: string;
          training_title: string;
          learnings: string[];
          changes: string[];
          question: string | null;
          visibility: string;
          team_id: string | null;
          author_id: string | null;
          created_at: string;
          team_name: string | null;
          theme_data: Json;
        }[];
      };
      get_takeovers_by_themes: {
        Args: {
          theme_slugs: string[] | null;
        };
        Returns: {
          id: string;
          meeting_date: string;
          top_learnings: string[] | null;
          visibility: string;
          team_id: string | null;
          presenter_id: string | null;
          created_at: string;
          team_name: string | null;
          theme_data: Json;
        }[];
      };
      global_search: {
        Args: {
          search_term: string;
          theme_ids: string[] | null;
        };
        Returns: {
          id: string;
          type: string;
          title: string;
          preview: string | null;
          theme_data: Json;
        }[];
      };
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

export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type TeamInsert = Database["public"]["Tables"]["teams"]["Insert"];
export type Visibility = "org" | "team";

export type Theme = Database["public"]["Tables"]["themes"]["Row"];
export type ThemeInsert = Database["public"]["Tables"]["themes"]["Insert"];

// Extended types with themes
export type PostcardWithThemes = Postcard & {
  themes: Theme[];
};
export type ThreeTwoOneWithThemes = ThreeTwoOne & {
  themes: Theme[];
};
export type TakeoverWithThemes = Takeover & {
  themes: Theme[];
};
