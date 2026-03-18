import { Suspense } from "react";
import { LoginForm } from "@/app/(auth)/login/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-sm bg-white rounded-lg p-8 shadow-lg">
        <div className="h-8 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          <div className="h-9 bg-gray-100 rounded animate-pulse" />
          <div className="h-9 bg-gray-100 rounded animate-pulse" />
          <div className="h-9 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
