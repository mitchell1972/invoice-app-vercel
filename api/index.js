const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

// Stripe initialization
// Use the secret key from environment variables. If not provided, fall back to a placeholder
// test key so that the backend can create PaymentIntents in development. Replace
// 'sk_test_example' with your actual Stripe secret key in production via environment variables.
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_example');

// In‑memory stores for users and invoices.
// Each user record looks like:
// { email, password, mobile, trialStart, subscribed }
const users = {};
const invoices = [];

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

/*
 * Helper function to generate simple invoice IDs.
 * In a real application you would use a UUID or database auto‑generated key.
 */
function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

/*
 * POST /signup
 * Registers a new user. Expects { email, password }.
 * In production, you should hash passwords and store them securely.
 */
app.post('/signup', (req, res) => {
  const { email, password, mobile } = req.body;
  if (!email || !password || !mobile) {
    return res.status(400).json({ error: 'Email, password and mobile number are required.' });
  }
  if (users[email]) {
    return res.status(400).json({ error: 'User already exists.' });
  }
  // Check if this mobile has already been used for a trial
  const mobileUsed = Object.values(users).some(u => u.mobile === mobile);
  if (mobileUsed) {
    return res.status(400).json({ error: 'This mobile number has already been used for a trial.' });
  }
  // Initialize trial start date and subscription status
  const trialStart = new Date().toISOString();
  users[email] = { email, password, mobile, trialStart, subscribed: false };
  return res.json({ message: 'User registered successfully.' });
});

/*
 * POST /login
 * Authenticates a user. Expects { email, password }.
 * Returns a simple token (email) for demonstration purposes.
 */
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users[email];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  // Compute trial expiration status
  const trialExpired = isTrialExpired(user);
  return res.json({
    token: email,
    user: {
      subscribed: user.subscribed,
      trialExpired,
      trialStart: user.trialStart,
      mobile: user.mobile,
    },
  });
});

// Helper to determine if a user's trial has expired (7 days from trialStart and not subscribed)
function isTrialExpired(user) {
  if (!user || user.subscribed) return false;
  const start = new Date(user.trialStart);
  const now = new Date();
  const diffMs = now - start;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 7;
}

// Middleware to enforce subscription/trial status for invoice operations
function enforceActiveSubscription(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = users[token];
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  if (isTrialExpired(user)) {
    return res.status(403).json({ error: 'Trial expired. Please subscribe to continue.' });
  }
  req.user = user;
  next();
}

/*
 * GET /invoices
 * Retrieves all invoices for the authenticated user.
 * Expects `Authorization` header containing the user email.
 */
app.get('/invoices', enforceActiveSubscription, (req, res) => {
  const userEmail = req.user.email;
  const userInvoices = invoices.filter(inv => inv.owner === userEmail);
  return res.json(userInvoices);
});

/*
 * POST /invoices
 * Creates a new invoice. Expects { customer, items }.
 * Items is an array of { description, quantity, price }.
 */
app.post('/invoices', enforceActiveSubscription, (req, res) => {
  const { customer, items, notes, customerEmail, status } = req.body;
  if (!customer || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Customer and items are required.' });
  }
  // Calculate total
  const total = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    return sum + qty * price;
  }, 0);
  const newInvoice = {
    id: generateId(),
    owner: req.user.email,
    customer,
    customerEmail: customerEmail || '',
    items,
    notes: notes || '',
    total,
    date: new Date().toISOString(),
    status: status === 'sent' ? 'sent' : 'draft',
  };
  invoices.push(newInvoice);
  return res.status(201).json(newInvoice);
});

/**
 * POST /invoices/:id/send
 * Sends an invoice via email to the customer and updates its status to 'sent'.
 */
app.post('/invoices/:id/send', enforceActiveSubscription, async (req, res) => {
  const { id } = req.params;
  const invoice = invoices.find(inv => inv.id === id && inv.owner === req.user.email);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  try {
    await sendInvoiceEmail(invoice);
    invoice.status = 'sent';
    return res.json({ message: 'Invoice sent', invoice });
  } catch (err) {
    console.error('Error sending invoice email:', err);
    return res.status(500).json({ error: 'Failed to send invoice email' });
  }
});

/*
 * POST /subscribe
 * Activates a subscription for the logged‑in user.
 * This simple implementation just toggles the subscribed flag to true.
 */
app.post('/subscribe', (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = users[token];
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  if (!user.subscribed) {
    user.subscribed = true;
  }
  return res.json({ message: 'Subscription activated', user: { subscribed: true } });
});

/*
 * POST /create-payment-intent
 * Creates a Stripe PaymentIntent for a subscription payment. The amount is fixed at 5.99 (in
 * the smallest currency unit, e.g. £5.99 -> 599 pence). A currency may be supplied in the
 * request body (default is GBP). The user must be authenticated and not already subscribed.
 */
app.post('/create-payment-intent', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = users[token];
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  // If user is already subscribed, no need to create another payment intent
  if (user.subscribed) {
    return res.status(400).json({ error: 'Already subscribed' });
  }
  const currency = (req.body && req.body.currency ? req.body.currency : 'GBP').toLowerCase();
  // Convert the fixed price of £5.99 to minor units (e.g. 599 pence or cents). For simplicity,
  // the same amount is charged regardless of currency. In a real application you might convert
  // based on exchange rates.
  const amount = 599;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    });
    return res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    console.error('Error creating payment intent:', err);
    return res.status(500).json({ error: err.message || 'Failed to create payment intent' });
  }
});

/*
 * POST /confirm-subscription
 * Confirms that a Stripe PaymentIntent has succeeded and activates the user's subscription.
 * Expects { paymentIntentId } in the request body. The user must be authenticated.
 */
app.post('/confirm-subscription', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = users[token];
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  const paymentIntentId = req.body && req.body.paymentIntentId;
  if (!paymentIntentId) {
    return res.status(400).json({ error: 'paymentIntentId required' });
  }
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status === 'succeeded') {
      user.subscribed = true;
      return res.json({ message: 'Subscription confirmed', user: { subscribed: true } });
    } else {
      return res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (err) {
    console.error('Error confirming subscription:', err);
    return res.status(500).json({ error: err.message || 'Failed to confirm subscription' });
  }
});

/**
 * Send an invoice via email using nodemailer.
 * This function uses environment variables for SMTP settings.
 * If environment variables are not defined, it will log the email contents instead.
 */
async function sendInvoiceEmail(invoice) {
  const { customerEmail, customer, items, total, notes, id } = invoice;
  if (!customerEmail) {
    throw new Error('Customer email is missing');
  }
  // Prepare email body
  const itemLines = items.map(item => {
    return `${item.quantity} x ${item.description} @ £${item.price}`;
  }).join('\n');
  const emailSubject = `Invoice ${id}`;
  const emailText =
    `Hello ${customer},\n\n` +
    `Please find your invoice below:\n\n` +
    `${itemLines}\n\n` +
    `Total: £${total.toFixed(2)}\n\n` +
    (notes ? `Notes: ${notes}\n\n` : '') +
    `Thank you for your business.`;
  // Check if SMTP credentials are provided
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // Log to console if no SMTP settings
    console.warn('SMTP credentials not configured. Email will not be sent.');
    console.info('Invoice email contents:', { to: customerEmail, subject: emailSubject, text: emailText });
    return;
  }
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: customerEmail,
    subject: emailSubject,
    text: emailText,
  });
}

// Export the Express app as a serverless handler when running on Vercel. When
// running locally (e.g. via `npm run dev`), we still start the server on the
// specified port for development purposes.
const serverless = require('serverless-http');
module.exports = serverless(app);

// Only listen when invoked directly (not when imported by serverless)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend API running on port ${PORT}`);
  });
}
