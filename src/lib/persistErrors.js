export function errorText(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  const nested = error.error && typeof error.error === "object" ? error.error : null;
  return [
    error.message,
    error.details,
    error.hint,
    error.code,
    nested?.message,
    nested?.details,
    nested?.hint,
    nested?.code,
    error.cause?.message,
  ].filter(Boolean).join(" ");
}

export function unknownColumnFromError(error) {
  const text = errorText(error);
  return text.match(/Could not find the '([^']+)' column/i)?.[1]
    || text.match(/column "([^"]+)"(?: of relation)?/i)?.[1]
    || text.match(/unknown column [`'"]([^`'"]+)[`'"]/i)?.[1]
    || null;
}

export function fieldToDropFromPersistError(error, data = {}) {
  const column = unknownColumnFromError(error);
  if (column && Object.prototype.hasOwnProperty.call(data, column)) return column;

  const text = errorText(error);
  if (/invalid input syntax for type json|malformed array literal|22P02/i.test(text)) {
    if ("purchase_documents" in data) return "purchase_documents";
    if ("images" in data) return "images";
  }

  const enumValue = text.match(/invalid input value for enum [\w.]+: "([^"]*)"/i)?.[1];
  if (enumValue != null) {
    const key = Object.keys(data).find((name) => String(data[name]) === enumValue);
    if (key) return key;
  }

  if (/value too long/i.test(text)) {
    let longest = null;
    let max = 0;
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string" && value.length > max) {
        max = value.length;
        longest = key;
      }
    }
    if (longest && max > 40) return longest;
  }

  return null;
}

export const SYSTEM_ENTITY_KEYS = new Set([
  "id",
  "created_date",
  "updated_date",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "created_date_iso",
]);

export function omitSystemEntityKeys(data = {}) {
  const out = { ...data };
  SYSTEM_ENTITY_KEYS.forEach((key) => {
    delete out[key];
  });
  return out;
}

export async function persistWithUnknownColumnRetry({
  write,
  data,
  fallback,
  maxAttempts = 16,
}) {
  let current = { ...data };
  let usedFallback = false;
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await write(current);
    } catch (error) {
      lastError = error;
      const drop = fieldToDropFromPersistError(error, current);
      if (drop) {
        const { [drop]: _removed, ...rest } = current;
        current = rest;
        continue;
      }
      if (!usedFallback && fallback) {
        const next = typeof fallback === "function" ? fallback(current, error) : fallback;
        if (next && typeof next === "object" && Object.keys(next).length) {
          current = { ...next };
          usedFallback = true;
          continue;
        }
      }
      throw error;
    }
  }

  throw lastError || new Error("Record could not be saved");
}
