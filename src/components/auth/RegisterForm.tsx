"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { FormField } from "@/components/auth/FormField";
import { FormMessage } from "@/components/auth/FormMessage";
import { Button } from "@/components/ui/button";
import { registerSchema } from "@/lib/auth-schemas";

type Field = "name" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<Field, string>>;

interface RegisterResponse {
  success: boolean;
  data?: { email: string };
  error?: string;
}

const EMPTY_VALUES: Record<Field, string> = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function RegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);

    // 與 API 相同的 schema：前端先擋下明顯錯誤，API 仍會再驗一次
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      const { fieldErrors: errors } = z.flattenError(parsed.error);
      setFieldErrors({
        name: errors.name?.[0],
        email: errors.email?.[0],
        password: errors.password?.[0],
        confirmPassword: errors.confirmPassword?.[0],
      });
      return;
    }
    setFieldErrors({});

    setIsPending(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = (await response.json()) as RegisterResponse;
      if (!result.success || !result.data) {
        setFormError(result.error ?? "Registration failed, please try again");
        return;
      }
      const email = encodeURIComponent(result.data.email);
      router.push(`/sign-in?registered=1&email=${email}`);
    } catch {
      setFormError("Network error, please try again");
    } finally {
      setIsPending(false);
    }
  }

  function fieldProps(field: Field) {
    return {
      id: field,
      name: field,
      value: values[field],
      error: fieldErrors[field],
      onChange: (event: { target: { value: string } }) =>
        setValues((prev) => ({ ...prev, [field]: event.target.value })),
    };
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {formError && <FormMessage variant="error">{formError}</FormMessage>}
      <FormField label="Name" autoComplete="name" {...fieldProps("name")} />
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        {...fieldProps("email")}
      />
      <FormField
        label="Password"
        type="password"
        autoComplete="new-password"
        {...fieldProps("password")}
      />
      <FormField
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        {...fieldProps("confirmPassword")}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
