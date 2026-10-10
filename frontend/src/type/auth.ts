export type UserRead = {
  id: number;
  email: string;
  full_name: string;
  role: "OWNER" | "STAFF";
  business_id: number;
};

export type LoginWrite = { email: string; password: string };

export type RegisterWrite = {
  business: { name: string; phone_e164: string };
  owner: { full_name: string; email: string; password: string };
};

export type RegistrationRead = { message: string; email: string };
