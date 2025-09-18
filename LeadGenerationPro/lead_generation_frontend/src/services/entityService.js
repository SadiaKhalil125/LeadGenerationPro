const API_BASE = "http://localhost:8000"; // FastAPI backend URL

export async function saveEntity(entityRequest) {
  const response = await fetch(${API_BASE}/save-entity, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(entityRequest),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to save entity");
  }

  return response.json();
}