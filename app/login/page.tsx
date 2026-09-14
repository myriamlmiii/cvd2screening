import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-screen min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
