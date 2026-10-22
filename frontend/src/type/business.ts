export type BusinessRead = {
  id: number;
  name: string;
  phone_e164: string | null;
  base_currency: "USD";
  timezone: "Asia/Beirut";
};

export type BusinessWrite = { name: string; phone_e164: string };
