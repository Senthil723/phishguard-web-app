
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, { kind, status, cause } = {}) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    if (cause) this.cause = cause;
  }
}

// Save a submitted URL to the backend database.
export async function createScan(url) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/scans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });
  } catch (error) {
    throw new ApiError("Unable to connect to the PhishGuard server.", {
      kind: "network",
      cause: error,
    });
  }

  if (!response.ok) {
    throw new ApiError("The server could not save this URL.", {
      kind: "http",
      status: response.status,
    });
  }

  let savedScan;

  try {
    savedScan = await response.json();
  } catch (error) {
    throw new ApiError("The server returned an invalid response.", {
      kind: "invalid-response",
      cause: error,
    });
  }

  if (
    !savedScan ||
    typeof savedScan !== "object" ||
    Array.isArray(savedScan) ||
    !Number.isSafeInteger(savedScan.id) ||
    savedScan.id < 1 ||
    typeof savedScan.url !== "string" ||
    typeof savedScan.status !== "string" ||
    typeof savedScan.created_at !== "string" ||
    Number.isNaN(Date.parse(savedScan.created_at))
  ) {
    throw new ApiError("The server returned an incomplete scan record.", {
      kind: "invalid-response",
    });
  }

  return savedScan;
}

// Fetch the latest scan records for Recent Scans and Scan History.
export async function getScans(limit = 20) {
  const response = await fetch(
    `${API_BASE_URL}/scans?limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(
      `Could not load scans (${response.status})`
    );
  }

  return response.json();
}

// Fetch one saved scan using its database ID.
export async function getScanById(scanId, { signal } = {}) {
  if (!Number.isInteger(Number(scanId)) || Number(scanId) < 1) {
    throw new ApiError("A valid scan ID is required.", {
      kind: "invalid-id",
    });
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}/scans/${encodeURIComponent(scanId)}`,
      { signal }
    );
  } catch (error) {
    if (error.name === "AbortError") throw error;

    throw new ApiError("Unable to connect to the PhishGuard server.", {
      kind: "network",
      cause: error,
    });
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new ApiError("This scan record could not be found.", {
        kind: "not-found",
        status: response.status,
      });
    }

    throw new ApiError("The scan record could not be loaded.", {
      kind: "http",
      status: response.status,
    });
  }

  let scan;

  try {
    scan = await response.json();
  } catch (error) {
    throw new ApiError("The server returned an invalid scan record.", {
      kind: "invalid-response",
      cause: error,
    });
  }

  if (
    !scan ||
    typeof scan !== "object" ||
    Array.isArray(scan) ||
    !Number.isSafeInteger(scan.id) ||
    scan.id !== Number(scanId) ||
    typeof scan.url !== "string" ||
    !scan.url.trim() ||
    typeof scan.status !== "string" ||
    !scan.status.trim() ||
    typeof scan.created_at !== "string" ||
    Number.isNaN(Date.parse(scan.created_at))
  ) {
    throw new ApiError("The server returned an incomplete scan record.", {
      kind: "invalid-response",
    });
  }

  return scan;
}

// Fetch statistics calculated across the entire database.
export async function getScanStats() {
  const response = await fetch(`${API_BASE_URL}/scans/stats`);

  if (!response.ok) {
    throw new Error(
      `Could not load scan statistics (${response.status})`
    );
  }

  return response.json();
}
