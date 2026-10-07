const storageKey = (userId) => `efinauto.accountantSignature.${userId || "local"}`;

export function accountantDisplayName(user) {
  const combined = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  return user?.full_name || user?.name || combined || user?.email || "Accountant";
}

export function loadAccountantSignature(userId) {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAccountantSignature(userId, signature) {
  if (typeof localStorage === "undefined") return signature;
  const record = {
    name: signature?.name || "Accountant",
    designation: signature?.designation || "Accountant",
    image: signature?.image || "",
    signedAt: signature?.signedAt || new Date().toISOString(),
  };
  localStorage.setItem(storageKey(userId), JSON.stringify(record));
  return record;
}

export function resolveAccountantSignature(user) {
  const saved = loadAccountantSignature(user?.id);
  return {
    name: saved?.name || accountantDisplayName(user),
    designation: saved?.designation || "Accountant",
    image: saved?.image || "",
    signedAt: saved?.signedAt || "",
  };
}

export function formatSignedAt(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}
