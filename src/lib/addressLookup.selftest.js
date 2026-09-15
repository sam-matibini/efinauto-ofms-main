import {
  mapNominatimPlace,
  mapPhotonFeature,
  provinceCode,
  streetWithHouseNumber,
} from "./addressLookup.js";

const nominatim = {
  display_name: "Plessis Road, Meadows, Winnipeg, Manitoba, R3W 0H5, Canada",
  lat: "49.9071205",
  lon: "-97.0252588",
  importance: 0.05,
  address: {
    road: "Plessis Road",
    city: "Winnipeg",
    state: "Manitoba",
    postcode: "R3W 0H5",
    country: "Canada",
  },
};

const mapped = mapNominatimPlace(nominatim, "1981 Plessis Rd, Winnipeg, MB");
const photon = mapPhotonFeature({
  geometry: { coordinates: [-97.025, 49.897] },
  properties: {
    name: "Plessis Road",
    city: "Winnipeg",
    state: "Manitoba",
    postcode: "R2C 2X4",
    country: "Canada",
  },
}, "1981 Plessis Rd");

const checks = [
  ["province code", provinceCode("Manitoba") === "MB"],
  ["province short", provinceCode("mb") === "MB"],
  ["house number kept", streetWithHouseNumber("1981 Plessis Rd", "Plessis Road") === "1981 Plessis Road"],
  ["nominatim street", mapped.street_address === "1981 Plessis Road"],
  ["nominatim city", mapped.city === "Winnipeg"],
  ["nominatim province", mapped.province === "MB"],
  ["nominatim postal", mapped.postal_code === "R3W 0H5"],
  ["nominatim country", mapped.country === "Canada"],
  ["photon street", photon.street_address === "1981 Plessis Road"],
  ["photon city", photon.city === "Winnipeg"],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("FAILED", failed.map(([name]) => name), { mapped, photon });
  process.exit(1);
}
console.log("address lookup checks passed", checks.length);
