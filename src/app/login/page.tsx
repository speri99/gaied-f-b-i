"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    if (urlError) {
      const decodedError = decodeURIComponent(urlError);
      setError(decodedError);
      toast({
        title: "Authentication Error",
        description: decodedError,
        variant: "destructive",
      });
    }
  }, [urlError, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show the specific error message from the server
        setError(data.error || "Authentication failed");
        
        // Special handling for SAML users
        if (data.error && data.error.includes("SAML")) {
          toast({
            title: "SAML Authentication Required",
            description: "This account uses SAML authentication. Please use the SAML login option.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Authentication Error",
            description: data.error || "Authentication failed",
            variant: "destructive",
          });
        }
        return;
      }

      // If mustChangePassword is true, redirect to reset-password page
      if (data.mustChangePassword && data.userId) {
        toast({
          title: "Password Change Required",
          description: "You must change your password before continuing.",
        });
        // Don't store token if password change is required
        router.push(`/reset-password?userId=${data.userId}`);
        return;
      }

      // Successful login
      console.log("Login successful, redirecting to:", callbackUrl);
      
      // Store the token in localStorage for client-side access
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      // Force a hard navigation to ensure the cookie is properly set
      window.location.href = callbackUrl;
    } catch (error) {
      console.error("Login error:", error);
      setError("Unable to connect to the server. Please check your internet connection and try again.");
      toast({
        title: "Authentication Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-secondary/20 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign in to your account</CardTitle>
          <CardDescription>
            Enter your email and password to access your dashboard
          </CardDescription>
        </CardHeader>
        {error && (
          <div className="mx-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={error ? "border-destructive" : ""}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={error ? "border-destructive" : ""}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/onboarding" className="text-primary hover:underline">
                Create one
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 