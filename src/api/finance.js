import { api } from './client'

/* ── Auth ── */
export const financeLogin = (username, password) =>
  api.post('/finance/auth/login', { username, password })

/* ── View (read-only, works for FINANCE_ADMIN/FINANCE_STAFF/SUPER_ADMIN) ── */
export const getFinanceDashboard = () => api.get('/finance/dashboard')
export const getVendorPayments = (params) => api.get('/finance/vendor-payments', params)
export const getWalletTransactions = (params) => api.get('/finance/transactions', params)
export const getLeadRecharges = (params) => api.get('/finance/lead-recharges', params)
export const exportFinanceReport = (params) => api.get('/finance/reports/export', params)

/* ── Recharge Management: pricing (read for all Finance roles, edit needs WRITE — FINANCE_ADMIN/FINANCE_STAFF/SUPER_ADMIN all qualify by default) ── */
export const getPricing = () => api.get('/finance/pricing')
/** key: 'businessRegistrationFee' | 'adManagerFee' — value is in PAISE (matches how these are stored). */
export const updateFee = (key, value) => api.post('/finance/pricing/fee', { key, value })
/** price is in plain RUPEES (subscription plans aren't stored in paise). */
export const updateSubscriptionPlanPrice = (planId, price) =>
  api.post(`/finance/pricing/subscription-plan/${planId}`, { price })

/** Soft delete — the record is preserved (isActive: false), just hidden from the list. Needs FULL access on financeRecharge (FINANCE_ADMIN/SUPER_ADMIN by default). */
export const deleteTransaction = (id) => api.delete(`/finance/transactions/${id}`)

/* ── Commissions (view via /admin, edit/delete = SUPER_ADMIN only) ── */
export const getCommissions = (params) => api.get('/admin/commissions', params)
export const updateCommission = (id, status) => api.post(`/admin/commission/${id}/update`, { status })
export const deleteCommission = (id) => api.post(`/admin/commission/${id}/delete`)

/* ── Settlements (view + create/mark-transferred/delete = SUPER_ADMIN only) ── */
export const getSettlements = (params) => api.get('/admin/settlements', params)
export const createSettlement = (businessId) => api.post('/admin/settlement/create', { businessId })
export const markSettlementTransferred = (id, razorpayPayoutId) =>
  api.post(`/admin/settlement/${id}/mark-transferred`, razorpayPayoutId ? { razorpayPayoutId } : {})
export const deleteSettlement = (id) => api.post(`/admin/settlement/${id}/delete`)

/* ── Vendor payments edit (SUPER_ADMIN only) ── */
export const setRegistrationPayment = (businessId, isPaid) =>
  api.post(`/admin/business/${businessId}/registration-payment`, { isPaid })

/* ── Wallet credit (SUPER_ADMIN only) — the ledger-safe way to adjust a vendor's balance ── */
export const creditCoinsToVendor = (businessId, coins, reason) =>
  api.post('/admin/vendor/credit-coins', { businessId, coins, reason })
