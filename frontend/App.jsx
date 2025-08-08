import React, { useEffect, useState } from 'react';
// Import Stripe hooks and components for handling card input and payments
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';

/**
 * Main application component.
 * Handles authentication, dashboard view and invoice creation.
 */
export default function App() {
  const [page, setPage] = useState('login'); // 'login' | 'signup' | 'dashboard' | 'create'
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null); // holds user subscription and trial info
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ email: '', password: '', mobile: '' });
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
    try {
      const res = await api.post('/login', loginData);
      const { token: tk, user: userInfo } = res.data;
      setToken(tk);
      setUser(userInfo);
      setPage('dashboard');
      await fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed');
    }
  };

  /**
   * Handle signup form submission.
   */
  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      // signupData includes email, password and mobile
      await api.post('/signup', signupData);
      alert('Registration successful, please log in');
      setPage('login');
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
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-sm w-full">
          <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                required
                className="mt-1 w-full border rounded p-2"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Password</label>
              <input
                type="password"
                required
                className="mt-1 w-full border rounded p-2"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
              Login
            </button>
          </form>
          <p className="mt-4 text-sm text-center">
            Don't have an account?{' '}
            <button className="text-blue-600 hover:underline" onClick={() => setPage('signup')}>
              Sign up
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Render signup page
  if (page === 'signup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-sm w-full">
          <h1 className="text-2xl font-bold mb-4 text-center">Sign Up</h1>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                required
                className="mt-1 w-full border rounded p-2"
                value={signupData.email}
                onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Mobile Number</label>
              <input
                type="tel"
                required
                className="mt-1 w-full border rounded p-2"
                value={signupData.mobile}
                onChange={(e) => setSignupData({ ...signupData, mobile: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Password</label>
              <input
                type="password"
                required
                className="mt-1 w-full border rounded p-2"
                value={signupData.password}
                onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
              Create Account
            </button>
          </form>
          <p className="mt-4 text-sm text-center">
            Already have an account?{' '}
            <button className="text-blue-600 hover:underline" onClick={() => setPage('login')}>
              Log in
            </button>
          </p>
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