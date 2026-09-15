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

Add Vehicle, expenses, bills, purchase orders, invoices, bills of sale, repair orders, parts, and customers include an **Autoscan document** panel at the bottom of the form. Upload a PDF/photo or paste text from an invoice or bill of sale, click **Scan document**, then click **Update form** to copy extracted VIN, prices, dates, and vendor details into the fields above. Review the filled fields before saving. Scanned PDFs use on-device OCR when the file has no text layer.

Manitoba Public Insurance salvage bills of sale are parsed for CRA/MPI audit fields: vendor name and address, GST#/PST#, invoice/bill of sale number, date, bidder #, storage yard, stock #, pretax charges, and GST/PST.

## Vendor details on vehicle purchases

Add Vehicle includes a **Vendor / tax invoice** block. Select an existing vendor to retrieve name, address, GST#, PST#, email, and phone. If the supplier is new, use **Quick add vendor** (or save the vehicle) to create the vendor from the invoice details.

## Vehicle purchase taxes and GL

Add Vehicle includes **Sales taxes (RST) paid**: pretax amount, GST, PST, HST, RST (GST+PST+HST), and total vehicle expenditure. With **Post amounts to the general ledger** checked (default for new vehicles), saving:

- stores GST/PST/HST on the vehicle and values inventory at pretax + PST (`total_cost`)
- creates a received vehicle purchase for the net tax amount
- posts Dr Vehicle Inventory (1200) / Cr AP, and Dr GST/HST Receivable ITC (1150) / Cr AP


## Deploy

`vercel.json` is configured for a Vite static build on Vercel.
