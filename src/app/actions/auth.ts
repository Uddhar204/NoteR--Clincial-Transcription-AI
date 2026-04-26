// Server Actions for login and logout
"use server";

import { createSession, deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  // Validate against env credentials
  const validEmail = (process.env.DOCTOR_EMAIL ?? "Doctor@gmail.com").toLowerCase();
  const validPassword = process.env.DOCTOR_PASSWORD ?? "doctor123";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (email !== validEmail || password !== validPassword) {
    return { error: "Invalid email or password." };
  }

  await createSession(email);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
