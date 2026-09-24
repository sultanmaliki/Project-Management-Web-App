import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export const MIN_PASSWORD_LENGTH = 8;

/** Client-side checks mirror the API's rules so users get instant feedback; the API re-validates. */
export function validateSignup(name: string, email: string, password: string, confirm: string): string | null {
  if (!name.trim()) return "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Please enter a valid email address.";
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (new TextEncoder().encode(password).length > 72) return "Password is too long (72 bytes maximum).";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

export function SignupPage() {
  const { signup } = useAuth();
  const { data: config, loading: configLoading } = useApi(() => api.auth.config(), []);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateSignup(name, email, password, confirm);
    if (problem) return setError(problem);
    setError(null);
    setSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password);
    } catch (err) {
      setError(errorMessage(err, "Could not create the account. Please try again."));
      setSubmitting(false);
    }
  };

  const disabled = !configLoading && config?.allow_signup === false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-200 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-blue-600 text-2xl">Create an account</CardTitle>
          <CardDescription>New accounts start as Developers. An admin can change your role later.</CardDescription>
        </CardHeader>
        <CardContent>
          {disabled ? (
            <p role="alert" className="text-sm text-slate-700 text-center">
              Self-service sign-up is turned off. Ask an administrator to create your account.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" placeholder={`Minimum ${MIN_PASSWORD_LENGTH} characters`} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input id="confirmPassword" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating account…" : "Create account"}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
