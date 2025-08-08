import React, { useEffect, useState } from 'react';
// Import icons from lucide-react for the login UI
import { Eye, EyeOff, ArrowRight, ShieldCheck, CheckCircle2, CreditCard, Building2 } from 'lucide-react';
// Import Stripe hooks and components for handling card input and payments
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
// We previously imported icons from an external library, but instead we now
// define inline SVG icons below to avoid adding extra dependencies. The
// components expose a `className` prop so you can easily size and colour
// them using Tailwind utility classes.

// CheckIcon renders a simple check mark. It's used throughout the UI to
// reinforce feature lists and success messages.
const CheckIcon = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// StarIcon renders a five‑point star. We use this in our sign up and login
// pages to display the average rating in the call‑to‑action section. The
// `className` prop allows you to set colour and size via Tailwind classes.
const StarIcon = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
  >
    <path d="M12 2l2.9 6.1 6.7.9-4.8 4.7 1.1 6.6L12 17.3 6.1 20.3l1.1-6.6-4.8-4.7 6.7-.9L12 2z" />
  </svg>
);

/**
 * Main application component.
 * Handles authentication, dashboard view and invoice creation.
 */
export default function App() {
  const [page, setPage] = useState('login'); // 'login' | 'signup' | 'dashboard' | 'create'
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null); // holds user subscription and trial info
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  // Local state for showing/hiding password and remember me toggle on the login page
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  // Track loading state for the login form. When true the sign in button
  // displays a loading message and user interaction is disabled. Reset to
  // false once the login request completes, whether it succeeds or fails.
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  // Signup form state now includes fullName. The backend does not require
  // fullName so we strip it before sending, but keeping it here allows
  // collection on the client for a more complete registration experience.
  const [signupData, setSignupData] = useState({ fullName: '', email: '', password: '', mobile: '' });
  const [invoices, setInvoices] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState({
    customer: '',
    customerEmail: '',
    items: [
      { description: '', quantity: 1, price: 0 },
    ],
    notes: '',
  });

  // Internal component to render the subscription payment form. When the user submits their
  // card details, a PaymentIntent is created on the backend, the card is charged via Stripe,
  // and on success the subscription is activated. The component relies on the Stripe
  // context provided by the <Elements> wrapper defined in main.jsx.
  function SubscriptionForm({ onCancel }) {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    // In this simple demo, currency is fixed to GBP. You could expose this as a select
    // input if supporting multiple currencies.
    const currency = 'GBP';
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!stripe || !elements) return;
      setLoading(true);
      try {
        // 1. Ask for explicit confirmation before proceeding with payment (required by policy)
        const proceed = window.confirm('Proceed with payment of £5.99?');
        if (!proceed) {
          setLoading(false);
          return;
        }
        // 2. Create a PaymentIntent on the server
        const createRes = await api.post('/create-payment-intent', { currency }, { headers: { Authorization: token } });
        const { clientSecret, paymentIntentId } = createRes.data;
        // 3. Confirm the card payment using the CardElement input
        const cardElement = elements.getElement(CardElement);
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
          },
        });
        if (error) {
          alert(error.message || 'Payment failed');
          setLoading(false);
          return;
        }
        // 4. Notify the server to confirm the subscription (only if payment succeeded)
        await api.post('/confirm-subscription', { paymentIntentId: paymentIntent.id }, { headers: { Authorization: token } });
        // Update local user state
        setUser((prev) => prev ? { ...prev, subscribed: true, trialExpired: false } : prev);
        alert('Subscription successful!');
        // Navigate back to dashboard
        setPage('dashboard');
      } catch (err) {
        console.error('Subscription error', err);
        alert(err.response?.data?.error || 'Failed to subscribe');
      }
      setLoading(false);
    };
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center">Subscribe</h1>
          <p className="mb-4 text-sm text-gray-700 text-center">Enter your card details to start your subscription. The cost is £5.99.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Card Details</label>
              <div className="border rounded p-2">
                <CardElement options={{ hidePostalCode: true }} />
              </div>
            </div>
            <button
              type="submit"
              disabled={!stripe || loading}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm Subscription (£5.99)'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full bg-gray-300 text-gray-800 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Create an axios instance to talk to the backend. When deployed to Vercel, the
  // serverless functions are accessible under the /api path on the same origin. Using
  // a relative base URL ensures that API requests work both in development (via
  // proxy) and production on Vercel.
  const api = axios.create({
    baseURL: '/api',
  });

  /**
   * Fetch invoices for the authenticated user.
   */
  const fetchInvoices = async () => {
    // If not logged in or user info missing, skip
    if (!token || !user) return;
    // If trial expired and not subscribed, do not fetch
    if (user.trialExpired && !user.subscribed) {
      setInvoices([]);
      return;
    }
    try {
      const res = await api.get('/invoices', {
        headers: { Authorization: token },
      });
      setInvoices(res.data);
    } catch (err) {
      // If the server indicates trial expired, update user state
      if (err.response?.status === 403) {
        setUser((prev) => prev ? { ...prev, trialExpired: true } : prev);
      }
      console.error('Error fetching invoices', err);
    }
  };

  /**
   * Handle login form submission.
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    // Show loading indicator while processing the login request
    setIsLoadingLogin(true);
    try {
      const res = await api.post('/login', loginData);
      const { token: tk, user: userInfo } = res.data;
      setToken(tk);
      setUser(userInfo);
      setPage('dashboard');
      await fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed');
    } finally {
      setIsLoadingLogin(false);
    }
  };

  /**
   * Handle signup form submission.
   */
  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      // Extract fullName before sending signup data to the server. The backend
      // only expects email, password and mobile fields. We ignore fullName on
      // the server but keep it client‑side for a more polished UI.
      const { fullName, ...payload } = signupData;
      await api.post('/signup', payload);
      // Upon successful signup, show a success page prompting the user to log in
      setPage('signupSuccess');
    } catch (err) {
      alert(err.response?.data?.error || 'Signup failed');
    }
  };

  /**
   * Handle saving or sending an invoice. If `send` is true, the invoice will be sent via email
   * after creation (requires customerEmail and SMTP settings).
   */
  const handleSaveInvoice = async (e, send) => {
    e.preventDefault();
    try {
      const payload = {
        customer: invoiceForm.customer,
        customerEmail: invoiceForm.customerEmail,
        items: invoiceForm.items.map(item => ({
          description: item.description,
          quantity: Number(item.quantity),
          price: Number(item.price),
        })),
        notes: invoiceForm.notes,
      };
      // Create invoice first (always saved as draft)
      const res = await api.post('/invoices', payload, { headers: { Authorization: token } });
      const createdInvoice = res.data;
      if (send) {
        // Ask for confirmation before sending email
        const ok = window.confirm('Send invoice via email to the customer?');
        if (ok) {
          try {
            await api.post(`/invoices/${createdInvoice.id}/send`, null, { headers: { Authorization: token } });
            alert('Invoice sent successfully');
          } catch (err) {
            alert(err.response?.data?.error || 'Failed to send invoice');
          }
        } else {
          alert('Invoice saved as draft');
        }
      } else {
        alert('Invoice saved as draft');
      }
      setPage('dashboard');
      setInvoiceForm({ customer: '', customerEmail: '', items: [{ description: '', quantity: 1, price: 0 }], notes: '' });
      await fetchInvoices();
    } catch (err) {
      if (err.response?.status === 403) {
        // Trial expired
        setUser((prev) => prev ? { ...prev, trialExpired: true } : prev);
        alert('Trial expired. Please subscribe to continue.');
      } else {
        alert(err.response?.data?.error || 'Error creating invoice');
      }
    }
  };

  /**
   * Update invoice item at index
   */
  const updateItem = (index, field, value) => {
    setInvoiceForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  /**
   * Add a new item row to the invoice form
   */
  const addItemRow = () => {
    setInvoiceForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, price: 0 }],
    }));
  };

  /**
   * Remove an item row by index
   */
  const removeItemRow = (index) => {
    setInvoiceForm((prev) => {
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: items.length ? items : [{ description: '', quantity: 1, price: 0 }] };
    });
  };

  /**
   * Send an existing draft invoice by ID. Prompts for confirmation before sending.
   */
  const handleSendInvoice = async (invoiceId) => {
    const ok = window.confirm('Send this invoice via email to the customer?');
    if (!ok) return;
    try {
      await api.post(`/invoices/${invoiceId}/send`, null, { headers: { Authorization: token } });
      alert('Invoice sent');
      await fetchInvoices();
    } catch (err) {
      if (err.response?.status === 403) {
        setUser((prev) => prev ? { ...prev, trialExpired: true } : prev);
        alert('Trial expired. Please subscribe to continue.');
      } else {
        alert(err.response?.data?.error || 'Failed to send invoice');
      }
    }
  };

  /**
   * Activate a subscription for the current user.
   */
  const handleSubscribe = async () => {
    // Instead of immediately toggling subscription on the server, show the Stripe
    // payment form. The subscription will be activated upon successful payment.
    setPage('subscribe');
  };

  // Render login page
  if (page === 'login') {
    // Define an inline Google logo component. Using a dedicated component allows
    // the SVG markup to be reused without cluttering the JSX below.
    const GoogleIcon = () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.91 32.267 29.369 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C34.869 6.053 29.706 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.26 16.021 18.74 12 24 12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C34.869 6.053 29.706 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
        <path fill="#4CAF50" d="M24 44c5.304 0 10.116-2.028 13.73-5.321l-6.332-5.365C29.369 36 24 36 24 36c-5.334 0-9.851 3.708-11.299 8.723L6.306 33.31C9.63 39.691 16.184 44 24 44z"/>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.217 3.207-3.827 5.733-7.139 6.928l.005.003 6.332 5.365C37.382 37.972 40 31.999 40 24c0-1.341-.138-2.65-.389-3.917z"/>
      </svg>
    );

    return (
      <div className="min-h-screen grid md:grid-cols-2">
        {/* Left brand/benefits panel */}
        <div className="hidden md:flex flex-col justify-between p-10 bg-gray-100">
          <header className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-semibold leading-none">InvoiceLab</div>
              <div className="text-sm text-gray-600">Get paid faster</div>
            </div>
          </header>
          <div className="max-w-md mt-10">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-gray-600">Sign in to send invoices, track payments, and stay on top of cash flow.</p>
            <ul className="mt-8 space-y-4">
              <li className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-medium">Secure by default</p>
                  <p className="text-sm text-gray-600">2FA-ready, audited encryption, GDPR compliant.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-medium">Built for payments</p>
                  <p className="text-sm text-gray-600">Stripe & PayPal integrations out of the box.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-medium">Simple workflow</p>
                  <p className="text-sm text-gray-600">Draft → Send → Get paid. Reminders automated.</p>
                </div>
              </li>
            </ul>
          </div>
          <footer className="text-xs text-gray-500 mt-auto">
            © {new Date().getFullYear()} InvoiceLab Ltd. All rights reserved.
          </footer>
        </div>
        {/* Right auth form */}
        <div className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md bg-white shadow-lg rounded-lg">
            <div className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">Sign in</h2>
              <p className="text-gray-600 text-sm">Use your email and password or continue with Google.</p>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded px-3 py-2 text-gray-700 hover:bg-gray-50"
                onClick={() => alert('TODO: Google OAuth')}
                aria-label="Continue with Google"
              >
                <GoogleIcon />
                <span className="ml-2">Continue with Google</span>
              </button>
              <div className="relative py-2">
                <div className="border-t"></div>
                <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-2 text-xs text-gray-500">
                  or
                </span>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@company.com"
                    className="w-full border rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      className="w-full border rounded p-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-600"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    Remember me
                  </label>
                  <a href="#" className="text-sm font-medium text-blue-600 hover:underline">Forgot password?</a>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                  disabled={isLoadingLogin}
                >
                  {isLoadingLogin ? 'Signing in…' : 'Sign in'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
            <div className="border-t p-4 text-center space-y-2">
              <p className="text-sm text-gray-700">
                Don’t have an account?{' '}
                <button
                  className="font-medium text-blue-600 underline"
                  onClick={() => setPage('signup')}
                >
                  Start your free 7‑day trial
                </button>
              </p>
              <p className="text-xs text-gray-500">
                By continuing, you agree to our{' '}
                <a className="underline" href="#">Terms</a> and{' '}
                <a className="underline" href="#">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render signup page
  if (page === 'signup') {
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
        {/* Left column: sign up form */}
        <div className="md:w-1/2 flex flex-col justify-center px-8 py-12">
          <h1 className="text-4xl font-extrabold mb-4 text-gray-900">Start your free 7‑day trial</h1>
          <p className="text-gray-600 mb-6 max-w-md">Create your account and explore all the features of our invoicing platform. No credit card required.</p>
          <form onSubmit={handleSignup} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full name</label>
              <input
                type="text"
                required
                className="mt-1 w-full border rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={signupData.fullName}
                onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                className="mt-1 w-full border rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={signupData.email}
                onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Mobile number</label>
              <input
                type="tel"
                required
                className="mt-1 w-full border rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={signupData.mobile}
                onChange={(e) => setSignupData({ ...signupData, mobile: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                className="mt-1 w-full border rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={signupData.password}
                onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
              />
            </div>
            <div className="flex items-start text-sm">
              <input type="checkbox" checked readOnly className="mt-1 mr-2" />
              <span>By continuing, you agree to our <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> &amp; <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.</span>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition-colors"
            >
              Try it free
            </button>
          </form>
          <p className="mt-6 text-sm">
            Already have an account?{' '}
            <button className="text-blue-600 hover:underline" onClick={() => setPage('login')}>
              Log in
            </button>
          </p>
        </div>
        {/* Right column: hero image and overlay features */}
        <div className="hidden md:block md:w-1/2 relative overflow-hidden">
          <img src="/hero.png" alt="Creative professional" className="absolute inset-0 w-full h-full object-cover" />
          {/* Feature overlay positioned at center right */}
          <div className="absolute top-1/2 transform -translate-y-1/2 right-8 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg max-w-xs">
            <h2 className="text-lg font-bold mb-2">With your trial you can…</h2>
            <ul className="space-y-1 text-sm text-gray-700">
              <li className="flex items-center"><CheckIcon className="w-4 h-4 text-green-600 mr-2" />Send invoices</li>
              <li className="flex items-center"><CheckIcon className="w-4 h-4 text-green-600 mr-2" />Accept payments</li>
              <li className="flex items-center"><CheckIcon className="w-4 h-4 text-green-600 mr-2" />Manage cash flow</li>
              <li className="flex items-center"><CheckIcon className="w-4 h-4 text-green-600 mr-2" />Track projects</li>
            </ul>
          </div>
          {/* Rating and social proof at bottom right */}
          <div className="absolute bottom-8 right-8 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg max-w-xs">
            <div className="flex items-center">
              <StarIcon className="w-4 h-4 text-yellow-500 mr-1" />
              <span className="font-bold mr-1">4.8</span>
              <span className="text-xs text-gray-600">Average rating</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Over 225,000 businesses trust us to get paid faster.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render signup success page
  if (page === 'signupSuccess') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6 text-center">
          <CheckIcon className="w-12 h-12 text-green-600 mx-auto" />
          <h1 className="text-2xl font-extrabold text-gray-900">Account created</h1>
          <p className="text-gray-600 text-sm">
            Your account has been created successfully. Please sign in to start your free trial.
          </p>
          <button
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
            onClick={() => setPage('login')}
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  // Render dashboard page
  if (page === 'dashboard') {
    // If trial expired and not subscribed, show subscription prompt
    if (user && user.trialExpired && !user.subscribed) {
      return (
        <div className="min-h-screen p-4">
          <header className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">My Invoices</h1>
            <button
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
              onClick={() => {
                setToken(null);
                setUser(null);
                setPage('login');
                setInvoices([]);
              }}
            >
              Log out
            </button>
          </header>
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
            <p className="font-bold">Trial Expired</p>
            <p>Your 7‑day free trial has expired. Please subscribe to continue using the service.</p>
          </div>
          <div className="mt-4">
            <button
              className="mr-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              onClick={handleSubscribe}
            >
              Subscribe Now
            </button>
          </div>
        </div>
      );
    }
    // Otherwise, show invoice list and actions
    return (
      <div className="min-h-screen p-4">
        <header className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">My Invoices</h1>
          <div>
            <button
              className="mr-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              onClick={() => setPage('create')}
            >
              New Invoice
            </button>
            <button
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
              onClick={() => {
                setToken(null);
                setUser(null);
                setPage('login');
                setInvoices([]);
              }}
            >
              Log out
            </button>
          </div>
        </header>
        {invoices.length === 0 ? (
          <p>No invoices yet. Create one to get started!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  <th className="px-4 py-2 border">Invoice ID</th>
                  <th className="px-4 py-2 border">Customer</th>
                  <th className="px-4 py-2 border">Date</th>
                  <th className="px-4 py-2 border">Total (£)</th>
                  <th className="px-4 py-2 border">Status</th>
                  <th className="px-4 py-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-100">
                    <td className="px-4 py-2 border">{inv.id}</td>
                    <td className="px-4 py-2 border">{inv.customer}</td>
                    <td className="px-4 py-2 border">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 border">{inv.total.toFixed(2)}</td>
                    <td className="px-4 py-2 border capitalize">{inv.status || 'draft'}</td>
                    <td className="px-4 py-2 border text-center">
                      {inv.status === 'draft' ? (
                        <button
                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                          onClick={() => handleSendInvoice(inv.id)}
                        >
                          Send
                        </button>
                      ) : (
                        <span className="text-green-700">Sent</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Render subscription payment form when the user chooses to subscribe
  if (page === 'subscribe') {
    return <SubscriptionForm onCancel={() => setPage('dashboard')} />;
  }

  // Render invoice creation page
  if (page === 'create') {
    // Calculate total for display
    const calculatedTotal = invoiceForm.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
    return (
      <div className="min-h-screen p-4">
        <header className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Create Invoice</h1>
          <button
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
            onClick={() => setPage('dashboard')}
          >
            Back to Dashboard
          </button>
        </header>
        <form onSubmit={(e) => handleSaveInvoice(e, false)} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium">Customer Name</label>
            <input
              type="text"
              required
              className="mt-1 w-full border rounded p-2"
              value={invoiceForm.customer}
              onChange={(e) => setInvoiceForm((prev) => ({ ...prev, customer: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Customer Email</label>
            <input
              type="email"
              required
              className="mt-1 w-full border rounded p-2"
              value={invoiceForm.customerEmail}
              onChange={(e) => setInvoiceForm((prev) => ({ ...prev, customerEmail: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Items</label>
            {invoiceForm.items.map((item, index) => (
              <div key={index} className="grid grid-cols-5 gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Description"
                  className="col-span-2 border rounded p-2"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  className="border rounded p-2 text-right"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Price"
                  className="border rounded p-2 text-right"
                  value={item.price}
                  onChange={(e) => updateItem(index, 'price', e.target.value)}
                />
                <button
                  type="button"
                  className="bg-red-600 text-white px-2 rounded hover:bg-red-700"
                  onClick={() => removeItemRow(index)}
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              className="mt-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              onClick={addItemRow}
            >
              Add Item
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium">Notes</label>
            <textarea
              className="mt-1 w-full border rounded p-2"
              rows="3"
              value={invoiceForm.notes}
              onChange={(e) => setInvoiceForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <div className="text-right font-semibold">Total: £{calculatedTotal.toFixed(2)}</div>
          <div className="flex space-x-2">
            <button type="submit" className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600">
              Save Draft
            </button>
            <button
              type="button"
              className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
              onClick={(e) => handleSaveInvoice(e, true)}
            >
              Send Invoice
            </button>
          </div>
        </form>
      </div>
    );
  }

  return null;
}