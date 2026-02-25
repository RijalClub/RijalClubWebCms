const rawBase = import.meta.env.VITE_API_BASE_URL || '/api'
const API_BASE = rawBase.replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function apiRequest(path, options = {}) {
  const requestPath = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const isFormData = options.body instanceof FormData

  const response = await fetch(requestPath, {
    method: options.method || 'GET',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
    body:
      options.body === undefined
        ? undefined
        : isFormData
          ? options.body
          : JSON.stringify(options.body),
    credentials: 'include',
  })

  if (response.status === 204) {
    return null
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(payload?.error || 'Request failed.', response.status, payload?.details)
  }

  return payload
}

export const api = {
  login: (body) => apiRequest('/auth/login', { method: 'POST', body }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  me: () => apiRequest('/auth/me'),

  listFiles: () => apiRequest('/admin/files'),
  getRawContent: (file) => apiRequest(`/admin/content/${encodeURIComponent(file)}`),
  saveRawContent: (file, body) =>
    apiRequest(`/admin/content/${encodeURIComponent(file)}`, {
      method: 'PUT',
      body,
    }),
  getVisualContent: (file) => apiRequest(`/admin/visual/${encodeURIComponent(file)}`),
  saveVisualContent: (file, body) =>
    apiRequest(`/admin/visual/${encodeURIComponent(file)}`, {
      method: 'PUT',
      body,
    }),

  listUsers: () => apiRequest('/admin/users'),
  createUser: (body) => apiRequest('/admin/users', { method: 'POST', body }),
  updateUser: (id, body) => apiRequest(`/admin/users/${id}`, { method: 'PATCH', body }),
  updatePassword: (id, password) =>
    apiRequest(`/admin/users/${id}/password`, {
      method: 'PATCH',
      body: { password },
    }),

  listMediaFolders: () => apiRequest('/admin/media/folders'),
  listMediaFiles: () => apiRequest('/admin/media/files'),
  uploadMedia: (formData) =>
    apiRequest('/admin/media/upload', {
      method: 'POST',
      body: formData,
    }),
}
