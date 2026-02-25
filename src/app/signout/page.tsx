// `src/app/callback/page.tsx`
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function CallbackPage() {

  useEffect(() => {
    // Clear localStorage
    localStorage.clear();
    sessionStorage.clear();
    // Remove client-side cookies
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach((cookie) => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen flex-col">
      <h1 className="text-xl font-semibold mb-4">You’ve been signed out.</h1>
      <a href="/" className="text-blue-600 hover:underline">Click here to sign in again</a>
    </div>
  );
}