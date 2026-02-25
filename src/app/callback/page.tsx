// `src/app/callback/page.tsx`
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function CallbackPage() {

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code) {
      toast({
        title: "Error",
        description: "No authorization code found",
        variant: "destructive",
      });
      router.push("/api/auth/aws-login");
      return;
    }
    async function exchangeCodeForTokens() {
      try {
        const response = await fetch("/api/auth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, state }),
        });

        if (!response.ok) {
          throw new Error("Failed to exchange code for tokens");
        }
        const data = await response.json();
        // Redirect to dashboard or intended page
        router.push("/dashboard");
      } catch (error) {
        console.error("Token exchange error:", error);
        toast({
          title: "Error",
          description: "Failed to authenticate. Please try again.",
          variant: "destructive",
        });
        router.push("/api/auth/aws-login");
      }
    }
    exchangeCodeForTokens();
  }, [searchParams, router, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-secondary/20 px-4 py-12">
      <h1 className="text-2xl font-bold">Processing Callback...</h1>
    </div>
  );
}