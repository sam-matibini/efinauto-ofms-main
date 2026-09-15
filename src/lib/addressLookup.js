const PROVINCE_CODES = {
  alberta: "AB",
  "british columbia": "BC",
  manitoba: "MB",
  "new brunswick": "NB",
  "newfoundland and labrador": "NL",
  newfoundland: "NL",
  "northwest territories": "NT",
  "nova scotia": "NS",
  nunavut: "NU",
  ontario: "ON",
  "prince edward island": "PE",
  quebec: "QC",
  québec: "QC",
  saskatchewan: "SK",
  yukon: "YT",
};

export function provinceCode(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  return PROVINCE_CODES[raw.toLowerCase()] || raw;
}

export function streetWithHouseNumber(query, street) {
  const house = String(query || "").match(/^\s*(\d+[A-Za-z]?)\b/)?.[1];
  const next = String(street || "").trim();
  if (house && next && !new RegExp(`^${house}\\b`, "i").test(next)) {
    return `${house} ${next}`;
  }
  return next;
}

export function mapNominatimPlace(place, query = "") {
  const address = place?.address || {};
  const street = streetWithHouseNumber(
    query,
    [address.house_number, address.road || address.pedestrian || address.residential || place?.name]
      .filter(Boolean)
      .join(" ")
      .trim()
  );
  const city = address.city || address.town || address.village || address.municipality || "";
  const province = provinceCode(address.state || address.province);
  const postal = address.postcode || "";
  const country = address.country || "";
  return {
    found: true,
    formatted_address: place?.display_name || [street, city, province, postal, country].filter(Boolean).join(", "),
    street_address: street,
    city,
    province,
    postal_code: postal,
    country,
    latitude: place?.lat != null ? Number(place.lat) : undefined,
    longitude: place?.lon != null ? Number(place.lon) : undefined,
    confidence: Number(place?.importance || 0) >= 0.4 ? "high" : "medium",
    business_name: place?.addresstype === "building" || place?.type === "office" ? (place?.name || "") : "",
    contact_phone: "",
    contact_person: "",
  };
}

export function mapPhotonFeature(feature, query = "") {
  const properties = feature?.properties || {};
  const street = streetWithHouseNumber(
    query,
    [properties.housenumber, properties.street || properties.name].filter(Boolean).join(" ").trim()
  );
  const city = properties.city || properties.town || properties.village || properties.district || "";
  const [longitude, latitude] = feature?.geometry?.coordinates || [];
  const province = provinceCode(properties.state);
  const postal = properties.postcode || "";
  const country = properties.country || "";
  return {
    found: true,
    formatted_address: [street, city, province, postal, country].filter(Boolean).join(", "),
    street_address: street,
    city,
    province,
    postal_code: postal,
    country,
    latitude,
    longitude,
    confidence: "medium",
    business_name: properties.osm_key === "office" || properties.osm_key === "amenity" ? (properties.name || "") : "",
    contact_phone: "",
    contact_person: "",
  };
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Address lookup failed (${response.status})`);
  }
  return response.json();
}

async function lookupNominatim(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  const rows = await fetchJson(url, { "User-Agent": "eFinAuto-OFMS/1.0 (vendor-address-lookup)" });
  return (Array.isArray(rows) ? rows : []).map((place) => mapNominatimPlace(place, query));
}

async function lookupPhoton(query) {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");
  url.searchParams.set("lang", "en");
  const payload = await fetchJson(url);
  return (payload?.features || []).map((feature) => mapPhotonFeature(feature, query));
}

export async function lookupAddresses(query) {
  const q = String(query || "").trim();
  if (!q) return [];
  try {
    const nominatim = await lookupNominatim(q);
    if (nominatim.length) return nominatim;
  } catch {
    // Photon is the fallback geocoder
  }
  const photon = await lookupPhoton(q);
  if (photon.length) return photon;
  return [];
}
