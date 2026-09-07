import { api } from './client'

// token is only required on the first login after a token is issued (fresh
// purchase or renewal) — omit it once login has already succeeded once.
export const admanagerLogin = (username, password, token) =>
  api.post('/admanager/login', { username, password, ...(token ? { token } : {}) })

export const getAdManagerDashboard = () => api.get('/admanager/dashboard')

export const listAdManagerAccess = (params) => api.get('/admin/admanager-access', params)

export const approveAdManagerAccess = (accessId) =>
  api.post(`/admin/admanager-access/${accessId}/approve`)

export const rejectAdManagerAccess = (accessId, rejectionReason) =>
  api.post(`/admin/admanager-access/${accessId}/reject`, { rejectionReason })

export const revokeAdManagerAccess = (accessId) =>
  api.post(`/admin/admanager-access/${accessId}/revoke`)
