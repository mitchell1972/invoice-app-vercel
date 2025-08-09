import React, { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // handle login (placeholder)
    alert(`Logging in with ${email}`);
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-gray-50">
      {/* Left panel with brand and features */}
      <div className="hidden md:flex flex-col justify-between p-10 bg-blue-50">
        <header className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <span role="img" aria-label="invoice">💼</span>
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
              <span className="text-xl mt-0.5">🔒</span>
              <div>
                <p className="font-medium">Secure by default</p>
                <p className="text-sm text-gray-600">2FA-ready, encrypted, GDPR compliant.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl mt-0.5">💳</span>
              <div>
                <p className="font-medium">Built for payments</p>
                <p className="text-sm text-gray-600">Stripe & PayPal integrations.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl mt-0.5">✅</span>
              <div>
                <p className="font-medium">Simple workflow</p>
                <p className="text-sm text-gray-600">Draft → Send → Get paid. Reminders automated.</p>
              </div>
            </li>
          </ul>
        </div>
        <footer className="text-xs text-gray-500">
          © {new Date().getFullYear()} InvoiceLab Ltd. All rights reserved.
        </footer>
      </div>
      {/* Right panel login form */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md bg-white p-8 shadow-lg rounded">
          <h2 className="text-2xl font-semibold mb-2">Sign in</h2>
          <p className="text-sm text-gray-600 mb-4">Use your email and password to sign in.</p>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="border rounded px-3 py-2 w-full"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="border rounded px-3 py-2 w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white rounded py-2 mt-2 hover:bg-blue-700"
            >
              Sign in
            </button>
          </form>
          <p className="text-sm text-gray-600 mt-4">
            Don’t have an account?{' '}
            <a href="/signup" className="text-blue-600 underline">Start your free 7‑day trial</a>
          </p>
        </div>
      </div>
    </div>
  );
}
