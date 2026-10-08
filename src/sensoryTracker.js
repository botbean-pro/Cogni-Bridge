const storageKey = "cognibridge_sensory_checkins";

export function readSensoryEntries() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function getStudentSensoryEntries(email) {
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail
    ? readSensoryEntries().filter((entry) => entry.studentEmail === normalizedEmail)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
}

export function saveSensoryEntry(entry) {
  const entries = readSensoryEntries().filter((item) => item.id !== entry.id);
  entries.push(entry);
  try {
    localStorage.setItem(storageKey, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

export function updateSensoryEntry(id, changes) {
  const entries = readSensoryEntries();
  const updated = entries.map((entry) => entry.id === id ? { ...entry, ...changes } : entry);
  try {
    localStorage.setItem(storageKey, JSON.stringify(updated));
    return updated.find((entry) => entry.id === id) || null;
  } catch {
    return null;
  }
}

export function deleteSensoryEntry(id, email) {
  const normalizedEmail = email?.trim().toLowerCase();
  const entries = readSensoryEntries();
  const remaining = entries.filter((entry) => entry.id !== id || entry.studentEmail !== normalizedEmail);
  try {
    localStorage.setItem(storageKey, JSON.stringify(remaining));
    return true;
  } catch {
    return false;
  }
}
