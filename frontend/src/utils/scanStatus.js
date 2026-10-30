const pendingStatuses = new Set([
  "not_analyzed",
  "pending",
  "queued",
  "running",
  "processing",
  "in_progress",
]);

const completedStatuses = new Set(["analyzed", "analysed", "completed"]);
const failedStatuses = new Set(["failed", "error"]);

export function getScanStatusCategory(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  if (pendingStatuses.has(normalized)) return "pending";
  if (completedStatuses.has(normalized)) return "completed";
  if (failedStatuses.has(normalized)) return "failed";
  return "unknown";
}

export function getScanStatusLabel(status) {
  const category = getScanStatusCategory(status);

  if (category === "pending") return "Pending Analysis";
  if (category === "completed") return "Analysis Completed";
  if (category === "failed") return "Analysis Failed";

  const normalized = String(status || "").trim();

  return normalized
    ? normalized
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase())
    : "Unknown";
}
