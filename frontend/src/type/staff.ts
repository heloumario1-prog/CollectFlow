export type StaffRead = {
  id: number;
  full_name: string;
  email: string;
  role: "STAFF";
  is_active: boolean;
  created_at: string;
};

export type StaffCreateWrite = { full_name: string; email: string; password: string };
export type StaffUpdateWrite = { full_name: string; email: string };
export type StaffResetPasswordWrite = { new_password: string };
