"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Users, Clock, Bell, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  let AWS_COGNITO_URL=process.env.COGNITO_DOMAIN!;
  const { createAuthHeaders, user, loading: authLoading, isAuthenticated } = useAuth();
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include', // ensures cookies are sent
        });
        if (res.ok) {
          // User is authenticated
          router.push('/dashboard');
        } else {
          // Not authenticated
          router.push('/api/auth/aws-login');
        }
      } catch (err) {
        console.error('Session check failed:', err);
        router.push('/login');
      }
    };

    checkSession();
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-secondary/20">
        <div className="text-center space-y-8 max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl text-foreground">
            Guided Safety
          </h1>
          <p className="text-xl text-muted-foreground">
            Comprehensive case management system for impact response teams.
            Streamline your operations, enhance collaboration, and make a
            difference.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/onboarding">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Secure Case Management</CardTitle>
                <CardDescription>
                  End-to-end encrypted case handling with role-based access
                  control.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  <li>Encrypted data storage</li>
                  <li>Audit logging</li>
                  <li>Access controls</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Team Collaboration</CardTitle>
                <CardDescription>
                  Seamless communication and coordination between team members.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  <li>Real-time updates</li>
                  <li>Task assignment</li>
                  <li>Team messaging</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Clock className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Response Time Tracking</CardTitle>
                <CardDescription>
                  Monitor and optimize response times for better outcomes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  <li>Response metrics</li>
                  <li>SLA monitoring</li>
                  <li>Performance analytics</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Bell className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Smart Notifications</CardTitle>
                <CardDescription>
                  Stay informed with intelligent alerts and reminders.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  <li>Priority alerts</li>
                  <li>Custom notifications</li>
                  <li>Follow-up reminders</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-secondary/20">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">Making a Difference</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">24/7</div>
              <div className="text-muted-foreground">
                Round-the-clock Support
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">100%</div>
              <div className="text-muted-foreground">Data Security</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">&lt;5min</div>
              <div className="text-muted-foreground">Average Response Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>© 2024 Guided Safety. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
