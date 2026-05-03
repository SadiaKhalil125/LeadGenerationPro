const API_BASE = "https://lead-generation-backend-service.onrender.com"; // FastAPI backend URL

export async function saveEntity(entityRequest) {
  const response = await fetch(${ API_BASE } / save - entity, {
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