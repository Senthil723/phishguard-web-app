
const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

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

export async function getScans(limit = 20) {
  const response = await fetch(
    `${API_BASE_URL}/scans?limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Could not load scans (${response.status})`);
  }

  return response.json();
}
