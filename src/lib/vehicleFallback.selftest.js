import {
  VEHICLE_FALLBACK_TYPE,
  fallbackLogBody,
  mergeVehicleLists,
  vehicleFromFallbackLog,
  wrapVehicleEntity,
} from "./vehicleFallback.js";

const checks = [];

const log = {
  id: "log-1",
  company_id: "co-1",
  notification_type: VEHICLE_FALLBACK_TYPE,
  body: JSON.stringify({ vin: "1G1BE5SM0J7226676", make: "Chevrolet", model: "Cruze", year: 2018, company_id: "co-1" }),
  created_date: "2026-09-15T00:00:00.000Z",
};

const vehicle = vehicleFromFallbackLog(log);
checks.push(["parse vin", vehicle.vin === "1G1BE5SM0J7226676"]);
checks.push(["parse id", vehicle.id === "log-1"]);
checks.push(["parse fallback flag", vehicle._fallback === true]);

const merged = mergeVehicleLists(
  [{ id: "veh-1", vin: "AAAA", company_id: "co-1" }],
  [vehicle, { id: "veh-1", vin: "AAAA", company_id: "co-1" }],
);
checks.push(["merge dedupes id", merged.filter((row) => row.id === "veh-1").length === 1]);
checks.push(["merge keeps fallback", merged.some((row) => row.vin === "1G1BE5SM0J7226676")]);
checks.push(["body roundtrip", JSON.parse(fallbackLogBody(vehicle)).vin === "1G1BE5SM0J7226676"]);

const wrapped = wrapVehicleEntity({
  filter: async () => [{ id: "veh-1", vin: "SERVER", company_id: "co-1" }],
  list: async () => [],
  get: async () => null,
  update: async () => { throw { code: "PGRST116", message: "0 rows" }; },
  delete: async () => { throw { message: "not found" }; },
}, {
  entities: {
    NotificationLog: {
      filter: async () => [log],
      get: async () => log,
      update: async (id, data) => ({ id, ...log, ...data }),
      delete: async () => true,
    },
  },
});
const listed = await wrapped.filter({ company_id: "co-1" });
checks.push(["wrapped filter merges fallback", listed.some((row) => row.vin === "1G1BE5SM0J7226676") && listed.some((row) => row.vin === "SERVER")]);

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("FAILED", failed.map(([name]) => name));
  process.exit(1);
}
console.log("vehicle fallback checks passed", checks.length);
