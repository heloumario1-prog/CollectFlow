export type Settings = {
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  currency: "USD" | "LBP";
  language: "English" | "French";
};

let settings: Settings = {
  fullName: "Mario Haddad",
  email: "mario@collectflow.demo",
  phone: "+961 70 555 014",
  businessName: "Haddad Trading Co.",
  businessPhone: "+961 1 555 014",
  businessAddress: "Hamra Street, Beirut, Lebanon",
  currency: "USD",
  language: "English",
};

export function getSettings() {
  return { ...settings };
}

export function updateSettings(nextSettings: Settings) {
  settings = { ...nextSettings };
}