import { AccountForm } from "./AccountForm";
// calls account form and renders the register page by passing the mode as register
export function RegisterPage() {
  return <AccountForm key="register" mode="register" />;
}
