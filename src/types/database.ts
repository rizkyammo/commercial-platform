export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  organisation_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Role = {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
};

export type PermissionRow = {
  id: string;
  code: string;
  description: string | null;
};

export type UserRole = {
  user_id: string;
  role_id: string;
};