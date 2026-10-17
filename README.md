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


## Deploy

`vercel.json` is configured for a Vite static build on Vercel.
