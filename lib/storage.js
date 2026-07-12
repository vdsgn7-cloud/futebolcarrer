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

// Rascunho do jogador criado, usado entre a tela de criação e a peneira
// (antes de existir uma carreira de verdade pra salvar).
const DRAFT_KEY = "brasileirao-draft-v1";

export function saveDraft(draft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignora
  }
}

export function loadDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
}
