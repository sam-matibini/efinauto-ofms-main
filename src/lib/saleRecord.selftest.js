import { fieldToDropFromPersistError } from "./persistErrors.js";
import {
  hydrateSaleRecord,
  toLiveSalePayload,
  persistSaleRecord,
  withSalesmanPhoneNote,
} from "./saleRecord.js";

const checks = [];

const live = toLiveSalePayload({
  customer_name: "Ada Buyer",
  vehicle_details: "2018 Chevrolet Cruze",
  sale_price: 2500,
  salesman: "sam",
  salesman_phone: "(204) 555-0142",
  seller_signed_at: "",
  delivery_date: "",
  pst_exempt_reason: "",
  customer_id: null,
  vehicle_id: "",
  notes: "Retail deal",
  extra_form_only: true,
}, { companyId: "691d0f2ba44178d346970f28" });

checks.push(["drops salesman_phone column", !("salesman_phone" in live)]);
checks.push(["keeps salesman name", live.salesman === "sam"]);
checks.push(["packs phone into notes", /Salesman phone: \(204\) 555-0142/.test(live.notes)]);
checks.push(["keeps original notes", live.notes.includes("Retail deal")]);
checks.push(["omits empty seller_signed_at", !("seller_signed_at" in live)]);
checks.push(["omits empty delivery_date", !("delivery_date" in live)]);
checks.push(["omits empty pst_exempt_reason", !("pst_exempt_reason" in live)]);
checks.push(["omits empty customer_id", !("customer_id" in live)]);
checks.push(["omits empty vehicle_id", !("vehicle_id" in live)]);
checks.push(["stamps company_id", live.company_id === "691d0f2ba44178d346970f28"]);
checks.push(["defaults bos_status", live.bos_status === "draft"]);

const hydrated = hydrateSaleRecord({ notes: live.notes, customer_name: "Ada Buyer" });
checks.push(["hydrate reads phone from notes", hydrated.salesman_phone === "(204) 555-0142"]);
checks.push(["note helper is idempotent", withSalesmanPhoneNote(live.notes, "(204) 555-0142") === live.notes]);

checks.push([
  "unknown salesman_phone column is dropped",
  fieldToDropFromPersistError(
    { code: "PGRST204", message: "Could not find the 'salesman_phone' column of 'sales' in the schema cache" },
    { salesman_phone: "204", customer_name: "Ada" },
  ) === "salesman_phone",
]);

checks.push([
  "empty timestamp error drops seller_signed_at",
  fieldToDropFromPersistError(
    { message: 'invalid input syntax for type timestamp with time zone: ""' },
    { seller_signed_at: "", customer_name: "Ada" },
  ) === "seller_signed_at",
]);

let createdPayload = null;
const saved = await persistSaleRecord({
  companyId: "co-1",
  form: {
    customer_name: "Ada Buyer",
    vehicle_details: "2018 Chevrolet Cruze",
    sale_price: 1939,
    salesman_phone: "204-555-0142",
    seller_signed_at: "",
  },
  supabase: {
    entities: {
      Sale: {
        async create(data) {
          if ("salesman_phone" in data) {
            throw { code: "PGRST204", message: "Could not find the 'salesman_phone' column of 'sales'" };
          }
          if (data.seller_signed_at === "") {
            throw { message: 'invalid input syntax for type timestamp with time zone: ""' };
          }
          createdPayload = data;
          return { id: "sale-1", ...data };
        },
      },
    },
  },
});

checks.push(["persist returns id", saved.id === "sale-1"]);
checks.push(["persist never sent salesman_phone", createdPayload && !("salesman_phone" in createdPayload)]);
checks.push(["persist still exposes phone on the returned row", saved.salesman_phone === "204-555-0142"]);

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error(failed.map(([name]) => `FAIL ${name}`).join("\n"));
  process.exit(1);
}
console.log(`saleRecord selftest passed (${checks.length} checks)`);
