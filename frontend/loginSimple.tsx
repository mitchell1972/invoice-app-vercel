
import React, { useState } from "react";

const navigateTo = (path: string) => {
  window.location.href = path;
};

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.91 32.267 29.369 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C34.869 6.053 29.706 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.26 16.021 18.74 12 24 12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C34.869 6.053 29.706 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.304 0 10.116-2.028 13.73-5.321l-6.332-5.365C29.369 36 24 36 24 36c-5.334 0-9.851 3.708-11.299 8.723L6.306 33.31C9.63 39.691 16.184 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.217 3.207-3.827 5.733-7.139 6.928l.005.003 6.332 5.365C37.382 37.972 40 31.999 40 24c0-1.341-.138-2.65-.389-3.917z" />
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
    await new Promise((r) => setTimeout(r, 1200));
    setIsLoading(false);
    navigateTo("/dashboard");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left brand/benefits panel */}
      <div className="hidden md:flex flex-col justify-between p-10 bg-gray-100">
        <header className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gray-200 flex items-center justify-center">
            <span className="text-xl">🏢</span>
          </div>
          <div>
            <div className="text-xl font-semibold leading-none">InvoiceLab</div>
            <div className="text-sm text-gray-500">Get paid faster</div>
          </div>
        </header>

        <div className="max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-gray-600">Sign in to send invoices, track payments, and stay on top of cash flow.</p>

          <ul className="mt-8 space-y-4">
            <li className="flex items-start gap-3">
              <span className="mt-1 text-green-500">✔</span>
              <div>
                <p className="font-medium">Secure by default</p>
                <p className="text-sm text-gray-600">2FA-ready, audited encryption, GDPR compliant.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 text-blue-500">💳</span>
              <div>
                <p className="font-medium">Built for payments</p>
                <p className="text-sm text-gray-600">Stripe & PayPal integrations out of the box.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 text-purple-500">✓</span>
              <div>
                <p className="font-medium">Simple workflow</p>
                <p className="text-sm text-gray-600">Draft → Send → Get paid. Reminders automated.</p>
              </div>
            </li>
          </ul>
        </div>

        <footer className="text-xs text-gray-400">
          © {new Date().getFullYear()} InvoiceLab Ltd. All rights reserved.
        </footer>
      </div>

      {/* Right auth form */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Sign in</h2>
            <p className="text-sm text-gray-600 mt-1">Use your email and password or continue with Google.</p>
          </div>
          <div className="p-6 space-y-4">
            <button type="button" onClick={() => alert('TODO: Google OAuth')} className="w-full flex items-center justify-center border rounded px-4 py-2 text-gray-700 hover:bg-gray-50" aria-label="Continue with Google">
              <GoogleIcon />
              <span className="ml-2">Continue with Google</span>
            </button>

            <div className="relative text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative inline-flex bg-white px-2 text-xs text-gray-500">
                or
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded border-gray-300 shadow-sm pr-10 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Remember me
                </label>
                <a href="/forgot-password" className="text-sm font-medium text-blue-600 underline">Forgot password?</a>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in…' : 'Sign in'}
                <span className="ml-2">→</span>
              </button>
            </form>
          </div>
          <div className="px-6 pb-6 text-center text-sm text-gray-600">
            Don’t have an account?{' '}
            <a className="font-medium underline" href="/signup">
              Start your free 7‑day trial
            </a>
            <p className="mt-3 text-xs">
              By continuing, you agree to our{' '}
              <a className="underline" href="/legal/terms">
                Terms
              </a>{' '}
              and{' '}
              <a className="underline" href="/legal/privacy">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
