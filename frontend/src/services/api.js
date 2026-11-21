
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000/api/v1"
).replace(/\/+$/, "");


export class ApiError extends Error {
  constructor(message, { kind, status, cause } = {}) {
    super(message);

    this.name = "ApiError";
    this.kind = kind;
    this.status = status;

    if (cause) {
      this.cause = cause;
    }
  }
}


// --------------------------------------------------
// COMMON AUTHENTICATED REQUEST HELPER
// --------------------------------------------------

async function apiRequest(
  path,
  {
    method = "GET",
    body,
    signal,
  } = {}
) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
      body: body === undefined
        ? undefined
        : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      "Unable to connect to the PhishGuard server.",
      {
        kind: "network",
        cause: error,
      }
    );
  }

  if (!response.ok) {
    let detail = "";

    try {
      const errorData = await response.json();

      if (typeof errorData.detail === "string") {
        detail = errorData.detail;
      }
    } catch {
      // Use a generic error if the response is not JSON.
    }

    throw new ApiError(
      detail || `Request failed (${response.status}).`,
      {
        kind: response.status === 401
          ? "unauthorized"
          : "http",
        status: response.status,
      }
    );
  }

  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch (error) {
    throw new ApiError(
      "The server returned an invalid response.",
      {
        kind: "invalid-response",
        cause: error,
      }
    );
  }
}


// --------------------------------------------------
// AUTHENTICATION
// --------------------------------------------------

// Register a new PhishGuard account.
export async function registerUser({
  username,
  email,
  password,
}) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: {
      username,
      email,
      password,
    },
  });
}


// Log in and receive an HttpOnly session cookie.
export async function loginUser({
  username,
  password,
  rememberMe = false,
}) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: {
      username,
      password,
      remember_me: rememberMe,
    },
  });
}


// Restore the currently authenticated user.
export async function getCurrentUser({ signal } = {}) {
  return apiRequest("/auth/me", { signal });
}


// Revoke the current session and clear its cookie.
export async function logoutUser() {
  return apiRequest("/auth/logout", {
    method: "POST",
  });
}

export async function requestPasswordReset(email) {
  return apiRequest("/auth/password-reset/request", {
    method: "POST",
    body: { email },
  });
}

export async function confirmPasswordReset(token, password) {
  return apiRequest("/auth/password-reset/confirm", {
    method: "POST",
    body: { token, password },
  });
}


// --------------------------------------------------
// CREATE SCAN AND RUN ML PREDICTION
// --------------------------------------------------

export async function createScan(url) {
  const savedScan = await apiRequest("/scans", {
    method: "POST",
    body: { url },
  });

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
    throw new ApiError(
      "The server returned an incomplete scan record.",
      {
        kind: "invalid-response",
      }
    );
  }

  return savedScan;
}


// --------------------------------------------------
// SCAN HISTORY
// --------------------------------------------------

export async function getScans(limit = 20, offset = 0) {
  return apiRequest(
    `/scans?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`
  );
}

export async function getAllScans() {
  const batchSize = 100;
  const scans = [];
  let batch;

  do {
    batch = await getScans(batchSize, scans.length);
    if (!Array.isArray(batch)) {
      throw new ApiError("The server returned an invalid scan list.", { kind: "invalid-response" });
    }
    scans.push(...batch);
  } while (batch.length === batchSize);

  return scans;
}


// --------------------------------------------------
// INDIVIDUAL SCAN RESULT
// --------------------------------------------------

export async function getScanById(
  scanId,
  { signal } = {}
) {
  if (
    !Number.isSafeInteger(Number(scanId)) ||
    Number(scanId) < 1
  ) {
    throw new ApiError(
      "A valid scan ID is required.",
      {
        kind: "invalid-id",
      }
    );
  }

  let scan;

  try {
    scan = await apiRequest(
      `/scans/${encodeURIComponent(scanId)}`,
      { signal }
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new ApiError(
        "This scan record could not be found.",
        {
          kind: "not-found",
          status: 404,
        }
      );
    }

    throw error;
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
    throw new ApiError(
      "The server returned an incomplete scan record.",
      {
        kind: "invalid-response",
      }
    );
  }

  return scan;
}


// --------------------------------------------------
// SCAN STATISTICS
// --------------------------------------------------

export async function getScanStats() {
  return apiRequest("/scans/stats");
}


// --------------------------------------------------
// REPORTS AND ANALYTICS
// --------------------------------------------------

export async function getScanAnalytics(
  { fromDate, throughDate } = {}
) {
  const params = new URLSearchParams();

  if (fromDate) {
    params.set("from_date", fromDate);
  }

  if (throughDate) {
    params.set("through_date", throughDate);
  }

  const query = params.toString();

  return apiRequest(
    `/scans/analytics${query ? `?${query}` : ""}`
  );
}
