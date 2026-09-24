import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function LoginPage() {
  const { login } = useAuth();
  const { data: config } = useApi(() => api.auth.config(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // PublicOnly redirects to the page the user originally asked for.
    } catch (err) {
      setError(errorMessage(err, "Login failed. Please try again."));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-200 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-blue-600 text-2xl">ProjectFlow</CardTitle>
          <CardDescription>Sign in to manage your projects</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={submitting || !email.trim() || !password}>
              {submitting ? "Signing in…" : "Login"}
            </Button>

            <div className="flex justify-between text-sm text-slate-600">
              <span>Forgot your password? Ask an administrator to reset it.</span>
              {config?.allow_signup && (
                <Link to="/signup" className="text-blue-600 hover:underline whitespace-nowrap ml-4">
                  Sign up
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
