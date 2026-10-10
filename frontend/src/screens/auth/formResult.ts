import { data } from "react-router";
import { ApiError } from "../../api/client";
import type { z } from "zod";

export type FormResult = { ok: boolean; message?: string; fieldErrors: Record<string, string>; intent?: string };

export function invalid(issues: z.core.$ZodIssue[], intent?: string) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const name = String(issue.path[0] ?? "");
    if (name && !fieldErrors[name]) fieldErrors[name] = issue.message;
  }
  return data<FormResult>({ ok: false, message: "Please check the highlighted fields.", fieldErrors, intent }, { status: 400 });
}

export function failed(error: unknown, intent?: string) {
  if (error instanceof ApiError) {
    return data<FormResult>({ ok: false, message: Object.keys(error.fields).length ? "Please check the highlighted fields." : error.message, fieldErrors: error.fields, intent }, { status: error.status >= 400 ? error.status : 503 });
  }
  if (error instanceof DOMException && error.name === "AbortError") throw error;
  return data<FormResult>({ ok: false, message: "We couldn't complete your request. Please try again.", fieldErrors: {}, intent }, { status: 503 });
}

export function success(message: string, intent?: string): FormResult {
  return { ok: true, message, fieldErrors: {}, intent };
}

export function formString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}
