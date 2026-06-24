# ShopSphere (React + Node.js + Express + MongoDB + Razorpay + Twilio)

A full-stack e-commerce marketplace — login/signup, product browsing, cart, real checkout payments, first-login phone verification, and an admin panel — with a React frontend, a MongoDB database, hashed passwords, and session-based authentication.

## Pages at a glance
| Page | Route | Purpose |
|---|---|---|
| Login | `/login` | Sign-in for everyone, including the hardcoded admin account |
| Sign up | `/signup` | Create a new regular account |
| Storefront | `/shop` | Browse, search, and buy — the main ShopSphere site |
| Admin panel | `/admin` | Add, edit, delete products — only reachable by the hardcoded admin login |

## Features
- Sign up page with validation (username, email, password, confirm password)
- Login page with validation
- Passwords hashed with bcrypt (never stored in plain text)
- MongoDB injection protection via Mongoose schema validation
- Session-based login (cookie tracks logged-in state)
- **Social login** — "Continue with Google" and "Continue with Facebook" via Passport.js, sharing the same users collection and session system as regular login
- **ShopSphere storefront** (React + Vite frontend) — category strip, breadcrumbs, a rotating hero banner carousel, top-rated product rows, a searchable/filterable product grid, and a sliding cart drawer, all backed by MongoDB
- Add to cart / remove from cart, with quantities stored per logged-in user
- **Razorpay payment integration** — real checkout flow using Razorpay's test mode: backend creates an order, the Razorpay popup collects payment, and the backend verifies the payment signature before marking the order paid and clearing the cart
- **SMS OTP verification on first login** — every account (password, Google, or Facebook) is asked to verify a phone number once via Twilio SMS before reaching the storefront; after that it's never asked again
- **Admin panel** — add, edit, and delete products through a table + form UI. Admin access is a single hardcoded username/password baked into `routes/auth.js` (not database-driven), entered through the same login form as everyone else
- Logout functionality

## Project Structure
This is now two separate projects that work together — the Express/MongoDB backend, and a React/Vite frontend.

```
shopsphere/                  (backend — API + database)
├── server.js                  # Main Express server (also serves the React build in production)
├── package.json
├── seed.js                    # Script to parse and seed products into MongoDB
├── schema.sql                  # SQL template (reference source for database seeding)
├── add_images.sql              # Verified real image URLs for Electronics products
├── .env.example                 # Template for environment variables
├── config/
│   ├── db.js                     # MongoDB Mongoose connection
│   ├── passport.js                # Google & Facebook OAuth strategy setup
│   ├── razorpay.js                 # Razorpay client setup
│   └── twilio.js                    # Twilio client setup
└── routes/
    ├── auth.js                     # Signup / login / logout / OAuth routes (admin login is hardcoded here)
    ├── products.js                  # Product listing, categories, cart, and admin CRUD routes
    └── payment.js                    # Razorpay order creation, verification, and order history
    └── otp.js                         # SMS OTP request/verify for first-time login

shopsphere-react/             (frontend — React + Vite)
├── index.html                  # Includes the Razorpay Checkout.js script tag
├── vite.config.js               # Dev server proxy to the backend on port 3000
├── package.json
└── src/
    ├── App.jsx                    # Routes: /login, /signup, /shop, /admin
    ├── api/client.js                # All fetch calls to the backend, in one place
    ├── context/                      # AuthContext (session) and CartContext (cart state)
    ├── hooks/useCheckout.js            # Razorpay payment flow logic
    ├── components/                     # Header, ProductCard, ProductModal, CartDrawer, TopRatedSection, OtpGate
    └── pages/                           # LoginPage, SignupPage, ShopPage, AdminPage
```

## Admin login
Admin access is a single hardcoded username and password, defined directly in `routes/auth.js`:
```js
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'ShopSphere@Admin123';
```
There's no separate admin login page — just go to `/login` and enter those same credentials. The backend checks for this exact username/password pair before it ever touches the database, and if it matches, the session is marked as admin and you're sent straight to `/admin`. Regular signups can never become admins; the old `is_admin` database column is no longer used for this.

To change the admin password, edit those two constants in `routes/auth.js` and restart the server. Since these credentials live in plain source code, treat this repo accordingly — don't commit real production credentials here, and don't deploy this setup publicly as-is.

## Setup Instructions

Unzip both the backend (`shopsphere`) and frontend (`shopsphere-react`) projects as **sibling folders** in the same parent directory — the backend's `server.js` looks for `../shopsphere-react/dist` relative to itself in production mode.

### 1. Set up MongoDB database and seed data
Ensure MongoDB is configured (using local MongoDB or MongoDB Atlas cluster connection in `.env`), then seed the database from inside the `shopsphere` folder:
```bash
npm run seed
```
This parses `schema.sql` and `add_images.sql` to clear and seed 250 sample products (50 each across Electronics, Appliances, Fashion, Home, and Grocery) directly into your MongoDB database.

### 2. Configure environment variables
Inside `shopsphere`:
```bash

cp .env.example .env
```
Open `.env` and fill in your actual MongoDB connection string, a random session secret, and (optionally) your Razorpay/Twilio keys:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
SESSION_SECRET=some_long_random_string
PORT=3000
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

### 3. Install dependencies for both projects
```bash
cd shopsphere
npm install
cd ../shopsphere-react
npm install
```

### 4. Run it — two options

**Option A — development mode (two terminals, recommended while building):**
```bash
# Terminal 1
cd shopsphere
npm start
```
```bash
# Terminal 2
cd shopsphere-react
npm run dev
```
Open **`http://localhost:5173`** — the Vite dev server forwards API calls to the backend on port 3000 automatically.

**Option B — single server (production-style):**
```bash
cd shopsphere-react
npm run build
cd ../shopsphere
npm start
```
Open **`http://localhost:3000`** — Express serves the built React app directly, so you only need one terminal. Re-run `npm run build` any time you change frontend code.

### 5. Log in
You'll land on the login page. Click "Sign up" to create a regular account, or use the admin credentials above. After login, you'll be redirected to the ShopSphere storefront where you can browse products, filter by category, search, view top-rated picks, add items to your cart, and check out with Razorpay.

## Setting up "Continue with Google" and "Continue with Facebook"

The buttons are already built into the login page and backend — they just need real API credentials to work. Without credentials, the rest of the site runs completely normally; the buttons simply won't authenticate.

### Google
1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and create a project (or use an existing one).
2. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
3. If prompted, configure the **OAuth consent screen** first (External, fill in app name/email — for local testing you can leave it in "Testing" mode and add your own Google account as a test user).
4. Choose **Web application** as the application type.
5. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
   (When you deploy live, add your real domain's equivalent too, e.g. `https://yourdomain.com/api/auth/google/callback`.)
6. Click Create. Copy the **Client ID** and **Client Secret**.
7. Paste them into your `.env` file:
   ```
   GOOGLE_CLIENT_ID=your_actual_client_id
   GOOGLE_CLIENT_SECRET=your_actual_client_secret
   ```
8. Restart the server. The Google button will now work.

### Facebook
1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and click **Create App** (choose "Consumer" or "Other" as the type).
2. In the app dashboard, add the **Facebook Login** product.
3. Go to **Facebook Login → Settings**, and under **Valid OAuth Redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/facebook/callback
   ```
4. Go to **App Settings → Basic** and copy the **App ID** and **App Secret**.
5. Paste them into your `.env` file:
   ```
   FACEBOOK_APP_ID=your_actual_app_id
   FACEBOOK_APP_SECRET=your_actual_app_secret
   ```
6. While the app is in **Development mode**, only accounts listed as admins/developers/testers on the Facebook app can actually log in with it — this is a Facebook restriction, not a bug in this code. You'll need to submit for App Review (requesting the `email` permission) before the general public can use it.
7. Restart the server. The Facebook button will now work for authorized test accounts.

### How an OAuth login becomes a ShopSphere account
The first time someone signs in with Google or Facebook, a new row is created in the same `users` table everyone else uses — with `auth_provider` set to `'google'` or `'facebook'`, no `password_hash`, and the username auto-generated from their email (with a number appended if that username is already taken). If they ever sign in again with the same Google/Facebook account, they're matched by `google_id`/`facebook_id` and logged into that same account — no duplicates. If someone already has a regular ShopSphere account under the same email and then uses "Continue with Google" for the first time, their existing account is linked rather than a second one being created.

From that point on, an OAuth-created account behaves exactly like any other regular user: it has its own private cart and order history. It can never become an admin though — admin access is the one hardcoded account described earlier, not a database flag.

## Setting up Razorpay payments

The checkout flow is fully wired up — it just needs real (test-mode) Razorpay keys to actually open the payment popup. Without keys, clicking Checkout will show a clear "payments are not configured yet" message instead of crashing.

1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com/) and sign up (no business verification needed to use test mode).
2. Go to **Settings → API Keys** and click **Generate Test Key**.
3. Copy the **Key Id** (starts with `rzp_test_`) and **Key Secret**.
4. Paste them into your `.env` file:
   ```
   RAZORPAY_KEY_ID=rzp_test_your_actual_key_id
   RAZORPAY_KEY_SECRET=your_actual_key_secret
   ```
5. Restart the backend server.
6. In the React app, add an item to your cart, open the cart drawer, and click **Checkout**. Razorpay's popup will open.

### Testing a payment without real money
Razorpay's test mode accepts fake card numbers and never charges anything real. The most common one:
- **Card number:** `4111 1111 1111 1111`
- **Expiry:** any future date (e.g. `12/30`)
- **CVV:** any 3 digits (e.g. `123`)
- **OTP (if asked):** `123456`

For UPI in test mode, you can use the **success** simulated UPI ID Razorpay provides directly in its test checkout UI.

### How a payment actually gets confirmed
Clicking Checkout calls `POST /api/payment/create-order`, which reads your cart, checks stock, and asks Razorpay to register an order — this creates a row in the `orders` table with status `'created'`, and a matching snapshot of each item in `order_items`. The Razorpay popup then handles collecting card/UPI details directly with Razorpay (your server never sees card numbers). Once payment completes, Razorpay's popup calls back into the frontend with a payment id and signature, which gets sent to `POST /api/payment/verify`. That route recomputes the expected signature using your `RAZORPAY_KEY_SECRET` and compares it — **this signature check is what actually proves the payment is genuine**, not just that the popup closed normally. Only after that check passes does the order get marked `'paid'`, product stock get reduced, and the cart get cleared.

## Setting up SMS OTP verification (Twilio)

Every account — whether created by password signup, Google, or Facebook — is asked to verify a phone number once, the first time they log in. After that one-time check, `phone_verified` is set to `true` for that account and they're never asked again.

1. Go to [console.twilio.com](https://console.twilio.com) and sign up. Trial accounts get free credit and one free phone number, no credit card required up front.
2. From the Twilio Console dashboard, copy your **Account SID** and **Auth Token** (shown directly on the main dashboard page).
3. Get a phone number: **Phone Numbers → Manage → Buy a number** (trial accounts can claim one for free) — copy the number in `+1XXXXXXXXXX` format.
4. Paste all three into your `.env` file:
   ```
   TWILIO_ACCOUNT_SID=your_actual_account_sid
   TWILIO_AUTH_TOKEN=your_actual_auth_token
   TWILIO_PHONE_NUMBER=+1your_actual_twilio_number
   ```
5. Restart the backend server.

### Important trial account limitation
Twilio trial accounts can only send SMS to phone numbers you've **verified** in the Twilio Console (under **Phone Numbers → Manage → Verified Caller IDs**). This is a Twilio restriction to prevent abuse of free trial accounts, not a bug in this code — if you try to send an OTP to an unverified number on a trial account, Twilio will reject it with an error that this app will surface to you directly. Add your own number (and any test numbers) there first. To send to *any* number without this restriction, you'd need to upgrade to a paid Twilio account.

### How OTP verification actually works
Right after any successful login, the React app checks `user.phoneVerified` (included in the `/api/me` response). If it's `false`, `OtpGate` renders a verification screen instead of the actual page — this is wired into `ProtectedRoute`, so it applies to both `/shop` and `/admin` uniformly, regardless of login method. Submitting a phone number calls `POST /api/otp/request`, which generates a random 6-digit code, stores it in the `otp_codes` table with a 10-minute expiry, and sends it via Twilio. Submitting that code calls `POST /api/otp/verify`, which checks the code matches, hasn't expired, and hasn't been used before — then sets `phone_verified = true` on the account. The hardcoded admin login skips this entirely since it has no row in the `users` table.

## How It Works

**Sign up** (`POST /api/auth/signup`): Validates input, checks for duplicate username/email, hashes the password with bcrypt, and inserts the new user into MongoDB.

**Login** (`POST /api/auth/login`): Looks up the user by username or email, compares the submitted password against the stored hash using bcrypt, and if it matches, creates a session.

**Session check** (`GET /api/me`): Used by the shop page to verify the user is actually logged in server-side (not just based on a redirect).

**Logout** (`POST /api/auth/logout`): Destroys the session.

**Google/Facebook login** (`GET /api/auth/google`, `GET /api/auth/facebook` + their `/callback` routes): These redirect to Google/Facebook's own login screen, then back to this app once the person approves access. `config/passport.js` handles finding-or-creating the matching row in the `users` table; `routes/auth.js` then copies the result into `req.session.user` in the exact same shape a password login uses, so every other route in the app treats both login methods identically.

**Payments** (`POST /api/payment/create-order`, `POST /api/payment/verify`, `GET /api/payment/orders`): `create-order` turns the logged-in user's cart into a Razorpay order (checking stock first). `verify` re-checks the payment signature server-side and only then marks the order paid, decrements stock, and clears the cart. `orders` returns that user's full order history with line items, for a future "My Orders" page.

**OTP verification** (`GET /api/otp/status`, `POST /api/otp/request`, `POST /api/otp/verify`): `status` reports whether the logged-in account has verified a phone yet (also folded directly into `/api/me`, so the frontend usually doesn't need to call this separately). `request` generates a 6-digit code, stores it with a 10-minute expiry, and sends it via Twilio SMS. `verify` checks the submitted code against that stored value before flipping `phone_verified` to true.

**Products** (`GET /api/products`): Returns all products, optionally filtered by `?category=` and/or `?search=`.

**Categories** (`GET /api/products/categories`): Returns the distinct list of product categories for the filter pills.

**Cart** (`GET/POST /api/products/cart`, `DELETE /api/products/cart/:cartId`): Reads, adds to, and removes from the logged-in user's cart. Cart rows are tied to `user_id`, so each user's cart is private and persists in MongoDB between visits.

**Admin product management** (`GET/POST /api/products/admin`, `GET/PUT/DELETE /api/products/admin/:id`): Create, read, update, and delete products. All of these routes are protected by a `requireAdmin` middleware that checks `req.session.user.isAdmin` — if you're not logged in, or logged in but not an admin, these return a 401/403 error instead of running.

## Security Notes
- Passwords are hashed with bcrypt (salted, one-way) — the database never stores readable passwords.
- All SQL queries use parameterized placeholders (`?`) to prevent SQL injection.
- Session cookies are `httpOnly` so they can't be accessed via JavaScript (helps prevent XSS-based session theft).
- The admin username/password are hardcoded in `routes/auth.js` rather than stored in the database. This was a deliberate choice for simplicity, but it means anyone with access to this source file (or a public GitHub repo containing it) can read the admin password. Fine for local/learning use; do not deploy this as-is to a public server.
- `RAZORPAY_KEY_SECRET` must never be exposed to the frontend — it's only used server-side to verify payment signatures. Only `RAZORPAY_KEY_ID` (the public key) is sent to the browser, and that's intentional.
- `TWILIO_AUTH_TOKEN` must also stay server-side only — it's never sent to the frontend, since anyone with it could send SMS on your Twilio account's bill.
- For production: serve over HTTPS, set `cookie.secure: true` in `server.js`, and use a strong, unique `SESSION_SECRET`.
- This is a learning/demo-grade project — for production use, consider rate limiting login attempts, email verification, and a more robust session store (e.g., Redis) instead of the default in-memory store.
