// Hand-written to match supabase/migrations. Once the project is linked,
// regenerate with: npx supabase gen types typescript --linked
export type MemberRole = "admin" | "member";
export type Cadence = "weekly" | "monthly" | "seasonal";

export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          created_by: string | null;
          created_at: string;
          /** IANA time zone, e.g. "America/New_York". */
          timezone: string;
          /** Admin-set rotation size (2–4); null means use the member count. */
          rotation_size: number | null;
          /** Monday of rotation week 1, "YYYY-MM-DD". */
          rotation_start: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      household_members: {
        Row: {
          household_id: string;
          user_id: string;
          role: MemberRole;
          display_name: string;
          joined_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      household_invites: {
        Row: {
          id: string;
          household_id: string;
          token: string;
          created_by: string | null;
          expires_at: string;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: { household_id: string; created_by?: string; expires_at?: string };
        Update: { revoked_at?: string | null };
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      spaces: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          position: number;
          rotation_offset: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      chores: {
        Row: { id: string; household_id: string; space_id: string; cadence: Cadence };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      chore_items: {
        Row: { id: string; household_id: string; chore_id: string; label: string; position: number };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      seasonal_leads: {
        Row: { household_id: string; season_start: string; space_id: string; user_id: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      chore_points: {
        Row: { chore_id: string; household_id: string; points: number };
        Relationships: [];
      };
    };
    Functions: {
      create_household: { Args: { p_name: string }; Returns: string };
      accept_invite: { Args: { p_token: string }; Returns: string };
      get_invite: {
        Args: { p_token: string };
        Returns: { household_name: string; is_valid: boolean }[];
      };
      is_household_member: { Args: { hid: string }; Returns: boolean };
      is_household_admin: { Args: { hid: string }; Returns: boolean };
      ensure_seasonal_leads: { Args: { hid: string }; Returns: string };
      update_household_settings: {
        Args: { hid: string; p_timezone: string; p_rotation_size: number | null };
        Returns: undefined;
      };
    };
    Enums: { cadence: Cadence };
    CompositeTypes: Record<never, never>;
  };
};
