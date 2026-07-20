const API_BASE = "http://localhost:8000/api";

function getAuthHeaders(headers = {}) {
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Upload & Report Generation
export async function uploadFiles(files) {
  const formData = new FormData();
  formData.append("tb_current", files.tb_current);
  formData.append("tb_previous", files.tb_previous);
  if (files.budget) {
    formData.append("budget", files.budget);
  }
  if (files.mapping) {
    formData.append("mapping", files.mapping);
  }

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.errors?.join(", ") || error.detail || "Upload failed");
  }

  return response.json();
}

export async function generateReport(sessionId) {
  const response = await fetch(`${API_BASE}/generate?session_id=${sessionId}`, {
    method: "POST",
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
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

// Admin Services (Templates & Flexfields)
export async function getAdminConfig() {
  const response = await fetch(`${API_BASE}/admin/config`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch admin config");
  }
  return response.json();
}

export async function uploadDefaultFile(fileType, file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/admin/upload-default?file_type=${fileType}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.errors?.join(", ") || error.detail || "Default upload failed");
  }
  return response.json();
}

export async function getSessions() {
  const response = await fetch(`${API_BASE}/admin/sessions`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch sessions history");
  }
  return response.json();
}

export async function getFlexfields() {
  const response = await fetch(`${API_BASE}/admin/flexfields`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch flexfields configuration");
  }
  return response.json();
}

export async function updateFlexfields(flexfields) {
  const response = await fetch(`${API_BASE}/admin/flexfields`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(flexfields),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update flexfields");
  }
  return response.json();
}

// AUTH SERVICES
export async function authRegister(fullName, email, password, confirmPassword, role) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      full_name: fullName,
      email,
      password,
      confirm_password: confirmPassword,
      role,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Registration failed");
  }
  return response.json();
}

export async function authLogin(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Login failed");
  }
  return response.json();
}

export async function requestPasswordResetOtp(email) {
  const response = await fetch(`${API_BASE}/auth/forgot-password/request-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to send OTP");
  }
  return response.json();
}

export async function verifyPasswordResetOtp(email, otp) {
  const response = await fetch(`${API_BASE}/auth/forgot-password/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, otp }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Invalid OTP");
  }
  return response.json();
}

export async function resetForgottenPassword(email, otp, newPassword, confirmPassword) {
  const response = await fetch(`${API_BASE}/auth/forgot-password/reset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      otp,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to reset password");
  }
  return response.json();
}

export async function authLogout() {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Logout failed");
  }
  return response.json();
}

export async function authMe() {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch current user profile");
  }
  return response.json();
}

// USER MANAGEMENT SERVICES
export async function getUsers() {
  const response = await fetch(`${API_BASE}/users`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  return response.json();
}

export async function getUser(id) {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch user with ID ${id}`);
  }
  return response.json();
}

export async function createUser(user) {
  const response = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(user),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create user");
  }
  return response.json();
}

export async function updateUser(id, userData) {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: "PUT",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(userData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update user");
  }
  return response.json();
}

export async function deleteUser(id) {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to delete user");
  }
  return response.json();
}

export async function approveUser(id) {
  const response = await fetch(`${API_BASE}/users/${id}/approve`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to approve user");
  }
  return response.json();
}

export async function rejectUser(id) {
  const response = await fetch(`${API_BASE}/users/${id}/reject`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to reject user");
  }
  return response.json();
}

export async function activateUser(id) {
  const response = await fetch(`${API_BASE}/users/${id}/activate`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to activate user");
  }
  return response.json();
}

export async function deactivateUser(id) {
  const response = await fetch(`${API_BASE}/users/${id}/deactivate`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to deactivate user");
  }
  return response.json();
}

export async function changeUserRole(id, role) {
  const response = await fetch(`${API_BASE}/users/${id}/role`, {
    method: "PATCH",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    throw new Error("Failed to change role");
  }
  return response.json();
}

export async function resetUserPassword(id, newPassword) {
  const response = await fetch(`${API_BASE}/users/${id}/reset-password`, {
    method: "PATCH",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ new_password: newPassword }),
  });
  if (!response.ok) {
    throw new Error("Failed to reset password");
  }
  return response.json();
}

// AUDIT LOG SERVICES
export async function getSystemAuditLogs(params = {}) {
  const queryParts = [];
  if (params.skip !== undefined) queryParts.push(`skip=${params.skip}`);
  if (params.limit !== undefined) queryParts.push(`limit=${params.limit}`);
  if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  if (params.user_id) queryParts.push(`user_id=${params.user_id}`);
  if (params.action) queryParts.push(`action=${encodeURIComponent(params.action)}`);
  if (params.start_date) queryParts.push(`start_date=${params.start_date}`);
  if (params.end_date) queryParts.push(`end_date=${params.end_date}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  const response = await fetch(`${API_BASE}/audit-logs${queryString}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch audit logs");
  }
  return response.json();
}
