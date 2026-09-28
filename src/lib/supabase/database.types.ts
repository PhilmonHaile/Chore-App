// Hand-written to match supabase/migrations. Once the project is linked,
// regenerate with: npx supabase gen types typescript --linked
export type MemberRole = "admin" | "member";

export type Database = {
  public: {
    Tables: {
      households: {
        Row: { id: string; name: string; created_by: string | null; created_at: string };
        Insert: { id?: string; name: string; created_by?: string; created_at?: string };
        Update: { name?: string };
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
    };
    Views: Record<never, never>;
    Functions: {
      create_household: { Args: { p_name: string }; Returns: string };
      accept_invite: { Args: { p_token: string }; Returns: string };
      get_invite: {
        Args: { p_token: string };
        Returns: { household_name: string; is_valid: boolean }[];
      };
      is_household_member: { Args: { hid: string }; Returns: boolean };
      is_household_admin: { Args: { hid: string }; Returns: boolean };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
