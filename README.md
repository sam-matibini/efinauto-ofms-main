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

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |

## Autoscan documents

Add Vehicle, expenses, bills, purchase orders, invoices, bills of sale, repair orders, parts, and customers include an **Autoscan document** panel. Upload a PDF/photo or paste text from an invoice or bill of sale to extract VIN, prices, dates, and vendor details into the form. Review the filled fields before saving.

## Deploy

`vercel.json` is configured for a Vite static build on Vercel.
