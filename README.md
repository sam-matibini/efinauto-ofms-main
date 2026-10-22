# eFinAuto OFMS

Automotive operations platform for dealerships, repair shops, shipping, and back-office finance. Vite + React frontend with Supabase.

Source: [sam-matibini/efinauto-ofms-main](https://github.com/sam-matibini/efinauto-ofms-main)

## Run locally

```bash
npm install
cp .env.production .env   # uses the public Supabase anon key already in the repo
npm run dev
```

Then open the URL Vite prints (default `http://localhost:5173`).

Required env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## AI features (InvokeLLM)

AI calls go through the `invoke-llm` Supabase Edge Function, which proxies to any OpenAI-compatible endpoint (Ollama, vLLM, LiteLLM, OpenAI, OpenRouter, internal gateway). Deploy it and set its secrets:

```bash
supabase functions deploy invoke-llm
supabase secrets set \
  LLM_API_URL=http://your-gateway:11434/v1 \
  LLM_MODEL=llama3.1 \
  LLM_API_KEY=...            # optional; omit for an unauthenticated local Ollama
  LLM_VISION_MODEL=...       # optional; model for file_urls (vision) calls
  LLM_SYSTEM_PROMPT=...      # optional; extra instructions for every call
  LLM_ALLOW_ANON=true        # optional; lets signed-out visitors (Landing page) use AI
```

The frontend is already wired (`integrations.invokeLlmFunction: "invoke-llm"` in `src/api/supabaseClient.js`); until the function is deployed with these secrets, every AI feature fails gracefully to its fallback/static data.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |

## Autoscan documents

Add Vehicle, expenses, bills, purchase orders, invoices, bills of sale, repair orders, parts, and customers include an **Autoscan document** panel. On Add Vehicle it sits at the top of the form: upload a PDF or photo (or paste text) and the analyzer extracts and summarizes VIN, vendor, prices, and tax, then **auto-fills the fields below**. Review the filled vendor, vehicle, and tax sections, then click **Add Vehicle**. Use **Update form** only if you edit the extracted text. Scanned PDFs use on-device OCR when the file has no text layer.

Manitoba Public Insurance salvage bills of sale are parsed for CRA/MPI audit fields: year/make/model/colour/VIN from the stock line, vendor name and address, GST#/PST#, invoice/bill of sale number, date, bidder #, storage yard, stock #, pretax charges, and GST/PST.

After a successful scan, the original PDF or photo is attached to the vehicle (default) so it remains available as an audit reference. You can also attach extra invoices from **Purchase documents**.

## Vendor details on vehicle purchases

Add Vehicle includes a **Vendor / tax invoice** block. Select an existing vendor to retrieve name, address, GST#, PST#, email, and phone. If the supplier is new, use **Quick add vendor** (or save the vehicle) to create the vendor from the invoice details.

## Vehicle purchase taxes and GL

Add Vehicle includes **Sales taxes (RST) paid**: pretax amount, GST, PST, HST, RST (GST+PST+HST), and total vehicle expenditure. With **Post amounts to the general ledger** checked (default for new vehicles), saving:

- stores GST/PST/HST on the vehicle and values inventory at pretax + PST (`total_cost`)
- creates a received vehicle purchase for the net tax amount
- posts Dr Vehicle Inventory (1200) / Cr AP, and Dr GST/HST Receivable ITC (1150) / Cr AP


## Payment links (click-to-pay)

Sales invoices and repair invoices can generate a **Stripe payment link**. Clicking the link opens a hosted Stripe Checkout page; once the customer pays, a webhook records the payment, updates the invoice status, and posts the double-entry GL (Dr Cash 1000 / Cr A/R 1100) automatically.

### Stripe Connect (multi-tenant)

eFinAuto is multi-tenant SaaS, so payments use **Stripe Connect with Standard accounts and direct charges**:

- Each dealership connects **its own Stripe account** via **Settings → Payments** ("Connect with Stripe", Stripe-hosted onboarding).
- Pay links are created *as* that connected account (`Stripe-Account` header), so the **dealership is the merchant of record**, bears the card fees, and receives payouts straight to its own bank. eFinAuto never holds tenant funds and never sees tenant secret keys — only `acct_...` ids and status.
- Payment links are **blocked with a clear error until the company finishes onboarding** (`charges_enabled`).
- The webhook's `account.updated` handler keeps the connection status fresh.

- **Where it lives:** `Payment Link` / `Pay Link` buttons on the Sales Invoices list (`InvoicesTab`), the invoice preview header (`InvoicePreview`), and the repair invoice generator (`InvoiceGenerator`). Outgoing invoice emails include a **Pay Now** button when there is a balance and a valid customer email. Connection status/onboarding lives in **Settings → Payments** (`PaymentsTab.jsx`).
- **Edge functions:** `supabase/functions/create-payment-link` (creates/reuses a Stripe Checkout session), `supabase/functions/create-connect-onboarding` (creates/reuses the Connect account + hosted onboarding link), and `supabase/functions/stripe-webhook` (source of truth for recording payment + syncing Connect status).
- **Tables:** `public.payment_links` (`20261020100000_payment_links.sql`) and `public.stripe_connect_accounts` (`20261021100000_stripe_connect_accounts.sql`). This repo does not auto-apply migrations; run the SQL in the Supabase SQL editor.

### One-time setup

1. Run both SQL files in `supabase/migrations/` (Supabase SQL editor):
   `20261020100000_payment_links.sql` and `20261021100000_stripe_connect_accounts.sql`.
2. Set Edge Function secrets (`STRIPE_SECRET_KEY` is the **platform** account's key — dealerships never add keys):
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_... \
     STRIPE_WEBHOOK_SECRET=whsec_... \
     PAYMENT_RETURN_BASE_URL=https://your-app.vercel.app
   ```
3. Deploy the functions:
   ```bash
   supabase functions deploy create-payment-link
   supabase functions deploy create-connect-onboarding
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
4. In the Stripe dashboard (platform account), add a webhook endpoint pointing to
   `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` for events
   `checkout.session.completed`, `checkout.session.async_payment_failed`,
   `checkout.session.expired`, and `account.updated`. Copy its signing secret
   into `STRIPE_WEBHOOK_SECRET`.
   **Important (direct charges):** the payment events fire against the
   dealership's connected account, so the endpoint must also receive events
   from connected accounts (the endpoint's "events from connected accounts"
   / Connect option — API: `connect: true` when creating the endpoint).
   Verify in test mode that `checkout.session.completed` actually arrives;
   without this the invoice won't be marked paid automatically.
5. Each dealership: **Settings → Payments → Connect with Stripe** and complete
   onboarding (test mode first).

To test locally: `stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook` and use test card `4242 4242 4242 4242`.

## Deploy

`vercel.json` is configured for a Vite static build on Vercel.
