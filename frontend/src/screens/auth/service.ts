import { apiRequest } from "../../api/client";
import type {
  LoginWrite,
  RegisterWrite,
  RegistrationRead,
  UserRead,
} from "../../type/auth";
// an object that groups functions for handling authentication-related API requests
// service for handling authentication-related API requests
export const authService = {
// login method for sending a POST request to the "auth/login/" endpoint with the provided payload and optional signal for aborting the request
  login: (payload: LoginWrite, signal?: AbortSignal) =>
    apiRequest<UserRead>("auth/login/", {
      method: "POST",
      body: payload,
      signal,
    }),

  register: (payload: RegisterWrite, signal?: AbortSignal) =>
    apiRequest<RegistrationRead>("auth/register/", {
      method: "POST",
      body: payload,
      signal,
    }),

  currentUser: (signal?: AbortSignal) =>
    apiRequest<UserRead>("auth/me/", { signal }),
  
  logout: (signal?: AbortSignal) =>
    apiRequest<void>("auth/logout/", { method: "POST", signal }),
};
