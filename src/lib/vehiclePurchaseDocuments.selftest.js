import { inferPurchaseDocumentType, addPurchaseDocument, textFileFromPaste } from "./vehiclePurchaseDocuments.js";

const checks = [];
checks.push(["bos type", inferPurchaseDocumentType({ name: "BillOfSale_20266247.pdf" }) === "bill_of_sale"]);
checks.push(["invoice type", inferPurchaseDocumentType({ name: "invoice-148734.pdf" }) === "invoice"]);
const list = addPurchaseDocument([], { name: "a.pdf", url: "/a", size: 10 });
checks.push(["add", list.length === 1]);
checks.push(["dedupe", addPurchaseDocument(list, { name: "a.pdf", url: "/a", size: 10 }).length === 1]);
const file = textFileFromPaste("BILL OF SALE", { summary: { document_type: "Bill of Sale" } });
checks.push(["paste file", file instanceof File && /bill-of-sale/.test(file.name)]);

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("FAILED", failed.map(([name]) => name));
  process.exit(1);
}
console.log("purchase document helper checks passed", checks.length);
