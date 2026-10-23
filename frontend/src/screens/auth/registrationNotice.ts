// Only carry the just-registered address across the SPA redirect, not into a URL.
let registeredEmail = "";
export const registrationNotice = {
  setEmail(email: string) { registeredEmail = email; },
  email() { return registeredEmail; },
  clear() { registeredEmail = ""; },
};
