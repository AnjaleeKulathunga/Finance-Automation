const API_BASE = "http://localhost:8000/api";

export async function uploadFiles(files) {
  const formData = new FormData();
  formData.append("tb_current", files.tb_current);
  formData.append("tb_previous", files.tb_previous);
  formData.append("budget", files.budget);
  formData.append("mapping", files.mapping);

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Upload failed");
  }

  return response.json();
}

export async function generateReport(sessionId) {
  const response = await fetch(`${API_BASE}/generate?session_id=${sessionId}`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Report generation failed");
  }

  return response.json();
}

export function getDownloadUrl(filename) {
  return `${API_BASE}/download/${filename}`;
}

export async function generateUnmappedReport(sessionId) {
  const response = await fetch(`${API_BASE}/generate-unmapped?session_id=${sessionId}`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Unmapped report generation failed");
  }

  return response.json();
}

export function getUnmappedDownloadUrl(filename) {
  return `${API_BASE}/download-unmapped/${filename}`;
}
