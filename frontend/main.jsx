import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import LoginPage from './login.tsx';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Load the Stripe publishable key from environment variables. You should set
// VITE_STRIPE_PUBLISHABLE_KEY in a .env file or environment at build time.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Elements stripe={stripePromise}>
      <LoginPage />
    </Elements>
  </React.StrictMode>
);
