export const DEFAULT_PREFERENCES = {
  defaultProtocol: "https",
  showSubmissionConfirmation: true,
};

const STORAGE_KEY = "phishguardPreferences";

function isValidPreferences(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    ["http", "https"].includes(value.defaultProtocol) &&
    typeof value.showSubmissionConfirmation === "boolean"
  );
}

export function loadPreferences() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { preferences: { ...DEFAULT_PREFERENCES }, error: "" };
    }

    const parsed = JSON.parse(stored);
    if (!isValidPreferences(parsed)) {
      throw new Error("Stored preferences have an unexpected format.");
    }

    return { preferences: parsed, error: "" };
  } catch (error) {
    console.warn("Could not load PhishGuard preferences:", error);
    return {
      preferences: { ...DEFAULT_PREFERENCES },
      error: "Saved preferences could not be read. Defaults are being used.",
    };
  }
}

export function savePreferences(preferences) {
  if (!isValidPreferences(preferences)) {
    return {
      saved: false,
      error: "The preference value is invalid and was not saved.",
    };
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    return { saved: true, error: "" };
  } catch (error) {
    console.warn("Could not save PhishGuard preferences:", error);
    return {
      saved: false,
      error: "Browser storage is unavailable. This change will not persist.",
    };
  }
}
