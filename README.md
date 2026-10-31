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

Bills of sale, sales invoices and repair invoices can generate an **eFinMoney payment link**. The customer pays on eFinMoney's hosted page (card, Interac or bank transfer depending on currency); once paid, a signed webhook records the payment, updates the invoice status, and posts the double-entry GL (Dr Cash 1000 / Cr A/R 1100) automatically.

### How it works (multi-tenant)

- Each dealership connects **its own eFinMoney account** (Settings → Payments, or Banking → eFinMoney: the same connection). The customer link token is stored AES-GCM encrypted in `efinmoney_links` and never reaches the browser.
- Payment links are created on that connected account, so money lands in the **dealership's own eFinMoney wallet** for the invoice currency. Payment links can only collect money. eFinAuto never holds tenant funds.
- Supported currencies (minimum amount): CAD/USD (2), GHS/KES/ZMW (10), NGN (100). The account needs an active wallet in that currency.
- Customers who connected before payment links existed must **reconnect once** and approve payment links, otherwise creation fails with `scope_missing`.
- Links expire after 7 days. An open link is reused while its amount still matches the invoice; if the amount changed, the old link is cancelled at eFinMoney and a new one is created.
- **Where it lives:** `Payment Link` / `Pay Link` buttons on the Sales list and Bill of Sale dialog (`Sales.jsx`; a paid link is appended to the sale's `payments`), the Sales Invoices list (`InvoicesTab`), the invoice preview header (`InvoicePreview`), and the repair invoice generator (`InvoiceGenerator`). Outgoing invoice emails include a **Pay Now** button when there is a balance.
- **Edge functions:** `supabase/functions/create-payment-link` (creates/reuses an eFinMoney payment link) and `supabase/functions/efinmoney-webhook` (source of truth for recording payment). Shared API/crypto helpers live in `supabase/functions/_shared/efinmoney.ts`.
- **Tables:** `public.payment_links` (`20261020100000_payment_links.sql`, plus `20261029100000_payment_links_sales.sql` to allow bills of sale). If you already ran the earlier Stripe version of the SQL, also run `20261028100000_payment_links_efinmoney.sql`. This repo does not auto-apply migrations; run the SQL in the Supabase SQL editor.

### One-time setup

1. Run the SQL in `supabase/migrations/` (Supabase SQL editor): `20261020100000_payment_links.sql`, plus `20261028100000_payment_links_efinmoney.sql` if upgrading from Stripe.
2. `EFINMONEY_API_KEY` and `EFINMONEY_TOKEN_ENC_KEY` are already set for the Banking integration. Payment links reuse them.
3. Deploy the functions:
   ```bash
   supabase functions deploy efinmoney
   supabase functions deploy create-payment-link
   supabase functions deploy efinmoney-webhook --no-verify-jwt
   ```
4. Register the webhook (once per partner account, server-side only, never from the browser). The response's `signing_secret` is shown **only once**:
   ```bash
   BASE=https://dkdnwumllibwdlqbjkwy.supabase.co/functions/v1/partner-api
   curl -X PUT "$BASE/v1/webhook" -H "X-API-Key: $EFINMONEY_API_KEY" -H "Content-Type: application/json"      -d '{"url":"https://<project-ref>.supabase.co/functions/v1/efinmoney-webhook"}'
   supabase secrets set EFINMONEY_WEBHOOK_SECRET=whsec_...
   curl -X POST "$BASE/v1/webhook/test" -H "X-API-Key: $EFINMONEY_API_KEY"   # expect a 200 in the function logs
   ```
   Calling `PUT /v1/webhook` again rotates the secret, so update `EFINMONEY_WEBHOOK_SECRET` if you do.
5. Each dealership: **Settings → Payments → Connect eFinMoney** (or Reconnect) and approve payment links.
6. Go-live check: create a small link, pay it, and confirm the invoice flips to paid and a `payment_received` GL entry appears.

## Deploy

`vercel.json` is configured for a Vite static build on Vercel.
