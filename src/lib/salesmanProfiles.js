const storageKey = (userId) => `efinauto.salesmanProfiles.v1.${userId || "guest"}`;

function readProfiles(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeProfiles(userId, profiles) {
  localStorage.setItem(storageKey(userId), JSON.stringify(profiles.slice(0, 12)));
}

export function listSalesmanProfiles(userId) {
  return readProfiles(userId).sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getDefaultSalesmanProfile(userId) {
  const profiles = listSalesmanProfiles(userId);
  return profiles.find((profile) => profile.isDefault) || profiles[0] || null;
}

export function saveSalesmanProfile(userId, profile) {
  const profiles = readProfiles(userId);
  const id = profile.id || `sig-${Date.now()}`;
  const next = {
    id,
    name: (profile.name || "").trim(),
    phone: (profile.phone || "").trim(),
    signature: profile.signature || "",
    isDefault: Boolean(profile.isDefault),
    updatedAt: Date.now(),
  };
  const without = profiles.filter((item) => item.id !== id);
  const others = next.isDefault ? without.map((item) => ({ ...item, isDefault: false })) : without;
  const merged = [next, ...others];
  writeProfiles(userId, merged);
  return next;
}

export function deleteSalesmanProfile(userId, id) {
  writeProfiles(userId, readProfiles(userId).filter((item) => item.id !== id));
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
