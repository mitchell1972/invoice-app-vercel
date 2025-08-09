import React, { useState } from "react";
import { Eye, EyeOff, ArrowRight, ShieldCheck, CheckCircle2, CreditCard, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Replace with your router/nav push
const navigateTo = (path: string) => {
  window.location.href = path;
};

// Simple inline Google logo SVG
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.91 32.267 29.369 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C34.869 6.053 29.706 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.26 16.021 18.74 12 24 12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C34.869 6.053 29.706 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.304 0 10.116-2.028 13.73-5.321l-6.332-5.365C29.369 36 24 36 24 36c-5.334 0-9.851 3.708-11.299 8.723L6.306 33.31C9.63 39.691 16.184 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.217 3.207-3.827 5.733-7.139 6.928l.005.003 6.332 5.365C37.382 37.972 40 31.999 40 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Replace with your auth call
    await new Promise((r) => setTimeout(r, 1200));
    setIsLoading(false);
    navigateTo("/dashboard");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left brand/benefits panel */}
      <div className="hidden md:flex flex-col justify-between p-10 bg-muted/30">
        <header className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-semibold leading-none">InvoiceLab</div>
            <div className="text-sm text-muted-foreground">Get paid faster</div>
          </div>
        </header>

        <div className="max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">Sign in to send invoices, track payments, and stay on top of cash flow.</p>

          <ul className="mt-8 space-y-4">
            <li className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-medium">Secure by default</p>
                <p className="text-sm text-muted-foreground">2FA-ready, audited encryption, GDPR compliant.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-medium">Built for payments</p>
                <p className="text-sm text-muted-foreground">Stripe & PayPal integrations out of the box.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-medium">Simple workflow</p>
                <p className="text-sm text-muted-foreground">Draft → Send → Get paid. Reminders automated.</p>
              </div>
            </li>
          </ul>
        </div>

        <footer className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} InvoiceLab Ltd. All rights reserved.
        </footer>
      </div>

      {/* Right auth form */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use your email and password or continue with Google.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <Button variant="outline" className="w-full" type="button" onClick={() => alert("TODO: Google OAuth")}
                aria-label="Continue with Google">
                <GoogleIcon />
                <span className="ml-2">Continue with Google</span>
              </Button>

              <div className="relative py-2">
                <Separator />
                <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-background px-2 text-xs text-muted-foreground">
                  or
                </span>
              </div>

              <form onSubmit={onSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPass ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground"
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" checked={remember} onCheckedChange={(v: boolean) => setRemember(!!v)} />
                    <Label htmlFor="remember" className="text-sm text-muted-foreground">Remember me</Label>
                  </div>
                  <a href="/forgot-password" className="text-sm font-medium underline underline-offset-4">Forgot password?</a>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in…" : "Sign in"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Don’t have an account? <a className="font-medium underline underline-offset-4" href="/signup">Start your free 7‑day trial</a>
            </p>
            <p className="text-[11px] text-muted-foreground text-center">
              By continuing, you agree to our <a className="underline" href="/legal/terms">Terms</a> and <a className="underline" href="/legal/privacy">Privacy Policy</a>.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
