import { fieldToDropFromPersistError } from "./persistErrors.js";
import {
  hydrateInvoiceRecord,
  persistInvoiceRecord,
  toLiveInvoicePayload,
} from "./invoiceRecord.js";

const checks = [];

const live = toLiveInvoicePayload({
  invoice_number: "INV-1",
  customer_id: null,
  customer_name: "Ada Buyer",
  customer_email: "",
  due_date: "",
  invoice_date: "2026-10-06",
  currency: "CAD",
  terms: "Payment due upon receipt",
  notes: "",
  status: "draft",
  subtotal: 425,
  tax_rate: 5,
  tax_amount: 21.25,
  total_amount: 446.25,
  amount_paid: 0,
  balance_due: 446.25,
  line_items: [{
    description: "Trucking Services",
    quantity: 1,
    unit_price: 425,
    total: 425,
    service_id: "svc-1",
  }],
  extra_form_only: true,
}, { companyId: "co-1" });

checks.push(["drops unknown terms column", !("terms" in live)]);
checks.push(["maps terms onto payment_terms", live.payment_terms === "Payment due upon receipt"]);
checks.push(["omits empty due_date", !("due_date" in live)]);
checks.push(["omits empty customer_id", !("customer_id" in live)]);
checks.push(["omits empty customer_email", !("customer_email" in live)]);
checks.push(["omits form-only fields", !("extra_form_only" in live)]);
checks.push(["keeps service line", live.line_items[0].description === "Trucking Services"]);
checks.push(["keeps service id", live.line_items[0].service_id === "svc-1"]);
checks.push(["stamps company_id", live.company_id === "co-1"]);

const hydrated = hydrateInvoiceRecord({ payment_terms: "Net 15", customer_name: "Ada Buyer" });
checks.push(["hydrate exposes terms for the form", hydrated.terms === "Net 15"]);

checks.push([
  "unknown terms column is dropped",
  fieldToDropFromPersistError(
    { code: "PGRST204", message: "Could not find the 'terms' column of 'sales_invoices' in the schema cache" },
    { terms: "Payment due upon receipt", customer_name: "Ada" },
  ) === "terms",
]);

let createdPayload = null;
const saved = await persistInvoiceRecord({
  companyId: "co-1",
  form: {
    customer_name: "Ada Buyer",
    terms: "Payment due upon receipt",
    due_date: "",
    line_items: [{ description: "Trucking Services", quantity: 1, unit_price: 425, total: 425 }],
    subtotal: 425,
    tax_rate: 5,
    tax_amount: 21.25,
    total_amount: 446.25,
  },
  supabase: {
    entities: {
      SalesInvoice: {
        async create(data) {
          if ("terms" in data) {
            throw { code: "PGRST204", message: "Could not find the 'terms' column of 'sales_invoices' in the schema cache" };
          }
          if (data.due_date === "") {
            throw { message: 'invalid input syntax for type date: ""' };
          }
          createdPayload = data;
          return { id: "inv-1", ...data };
        },
      },
    },
  },
});

checks.push(["persist returns id", saved.id === "inv-1"]);
checks.push(["persist sends payment_terms", createdPayload?.payment_terms === "Payment due upon receipt"]);
checks.push(["persist never sends terms", createdPayload && !("terms" in createdPayload)]);
checks.push(["returned row still exposes terms", saved.terms === "Payment due upon receipt"]);

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error(failed.map(([name]) => `FAIL ${name}`).join("\n"));
  process.exit(1);
}
console.log(`invoiceRecord selftest passed (${checks.length} checks)`);
