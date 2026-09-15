import { isPdfStructureNoise, usableDocumentText } from "./pdfNoise.js";

const catalog = `%PDF-1.7
2 0 obj
[/PDF /Text /ImageB /ImageC /ImageI]
endobj
11 0 obj
<</Length 12 0 R>>
`;

const mpi = `Manitoba Public Insurance
1981 Plessis Rd
Winnipeg, MB R2C 5C7
Invoice # 148734
`;

const checks = [
  ["catalog is noise", isPdfStructureNoise(catalog) === true],
  ["catalog not usable", usableDocumentText(catalog) === ""],
  ["mpi text usable", usableDocumentText(mpi).includes("Manitoba Public Insurance")],
  ["empty not noise", isPdfStructureNoise("") === false],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("FAILED", failed.map(([name]) => name));
  process.exit(1);
}
console.log("pdf noise checks passed", checks.length);
