const KEY = "brasileirao-career-save-v1";

export function loadCareer() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCareer(career) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(career));
  } catch {
    // localStorage indisponível — a carreira simplesmente não será salva.
  }
}

export function clearCareer() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
