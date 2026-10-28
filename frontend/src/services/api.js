
const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

// Save a submitted URL to the backend database.
export async function createScan(url) {
  const response = await fetch(`${API_BASE_URL}/scans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Could not save scan (${response.status}): ${errorText}`
    );
  }

  return response.json();
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
export async function getScanById(scanId) {
  if (!Number.isInteger(Number(scanId)) || Number(scanId) < 1) {
    throw new Error("A valid scan ID is required.");
  }

  const response = await fetch(
    `${API_BASE_URL}/scans/${encodeURIComponent(scanId)}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("This scan record could not be found.");
    }

    throw new Error(
      `Could not load scan (${response.status})`
    );
  }

  return response.json();
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
