import { useState, useEffect, useCallback } from 'react'
import {
  getFinanceDashboard, getVendorPayments, getWalletTransactions, getLeadRecharges,
  getCommissions, updateCommission, deleteCommission,
  getSettlements, createSettlement, markSettlementTransferred, deleteSettlement,
  setRegistrationPayment, creditCoinsToVendor,
} from '../../api/finance'
import { getBusinesses } from '../../api/business'
import { ApiError } from '../../api/client'

const TABS = ['Dashboard', 'Vendor Payments', 'Commissions', 'Settlements', 'Wallet Transactions', 'Lead Recharges']

const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const STATUS_STYLES = {
  PENDING: 'bg-warning/10 text-warning', SETTLED: 'bg-success/10 text-success', ON_HOLD: 'bg-slate-100 text-slate-500',
  QUEUED: 'bg-info/10 text-info', PROCESSING: 'bg-warning/10 text-warning', TRANSFERRED: 'bg-success/10 text-success', FAILED: 'bg-danger/10 text-danger',
}

/* ── Icons ── */
const IconTrash = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" /></svg>

/* ── Pagination footer ── */
function PageFooter({ label, count, total, page, hasNextPage, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
      <span>Showing {count} of {total} {label}</span>
      <div className="flex items-center gap-2">
        <button onClick={onPrev} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Prev</button>
        <span className="font-semibold text-slate-500">Page {page}</span>
        <button onClick={onNext} disabled={!hasNextPage} className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Next</button>
      </div>
    </div>
  )
}

/* ── Dashboard Tab ── */
function DashboardTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [businesses, setBusinesses] = useState([])
  const [credit, setCredit] = useState({ businessId: '', coins: '', reason: '' })
  const [crediting, setCrediting] = useState(false)
  const [creditMsg, setCreditMsg] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    getFinanceDashboard()
      .then(setStats)
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load finance dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { (async () => { await load() })() }, [load])
  useEffect(() => { getBusinesses({ limit: 200 }).then(data => setBusinesses(data.items || [])).catch(() => {}) }, [])

  const handleCredit = async () => {
    if (!credit.businessId || !credit.coins) return
    setCrediting(true)
    setCreditMsg('')
    try {
      await creditCoinsToVendor(credit.businessId, Number(credit.coins), credit.reason || undefined)
      setCreditMsg('Coins credited successfully.')
      setCredit({ businessId: '', coins: '', reason: '' })
    } catch (err) {
      setCreditMsg(err instanceof ApiError ? err.message : 'Could not credit coins.')
    } finally {
      setCrediting(false)
    }
  }

  if (loading) return <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 text-sm">Loading…</div>
  if (error) return <div className="bg-danger/8 text-danger rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>

  const cards = [
    { label: 'Total Revenue', value: stats.totalRevenue, cls: 'text-brand' },
    { label: 'Total Commission', value: stats.totalCommission, cls: 'text-info' },
    { label: 'Total Settled', value: stats.totalSettled, cls: 'text-success' },
    { label: 'Pending Settlement', value: stats.pendingSettlement, cls: 'text-warning' },
    { label: 'Registration Fee Revenue', value: stats.registrationFeeRevenue, cls: 'text-brand' },
    { label: 'AdManager/Premium Fee Revenue', value: stats.premiumFeeRevenue, cls: 'text-brand' },
    { label: 'Coin Revenue', value: stats.coinRevenue, cls: 'text-info' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{c.label}</p>
            <p className={`text-2xl font-black ${c.cls}`}>{fmtMoney(c.value)}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 -mt-2">
        Registration/AdManager fee revenue is an estimate (paid-vendor count × the current fee amount) since the fee actually paid isn't stored per-business — it will drift if the fee amount was changed after some vendors already paid.
      </p>

      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-black text-slate-800 text-sm mb-0.5">Credit Coins to Vendor</h3>
        <p className="text-xs text-slate-400 mb-4">Manually add coins to a vendor's wallet — creates a new ledger entry, doesn't touch existing transactions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={credit.businessId} onChange={e => setCredit(c => ({ ...c, businessId: e.target.value }))}>
            <option value="">Select vendor…</option>
            {businesses.map(b => <option key={b._id} value={b._id}>{b.username}</option>)}
          </select>
          <input type="number" min="1" placeholder="Coins" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={credit.coins} onChange={e => setCredit(c => ({ ...c, coins: e.target.value }))} />
          <input placeholder="Reason (optional)" className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={credit.reason} onChange={e => setCredit(c => ({ ...c, reason: e.target.value }))} />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleCredit} disabled={crediting || !credit.businessId || !credit.coins} className="bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-brand/90 disabled:opacity-40">
            {crediting ? 'Crediting…' : 'Credit Now'}
          </button>
          {creditMsg && <p className="text-xs font-semibold text-slate-500">{creditMsg}</p>}
        </div>
      </div>
    </div>
  )
}

/* ── Vendor Payments Tab ── */
function VendorPaymentsTab() {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1 })
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    getVendorPayments({ page, limit: 20, registrationStatus: status })
      .then(data => { setItems(data.items || []); setPagination(data.pagination) })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load vendor payments.'))
      .finally(() => setLoading(false))
  }, [page, status])

  useEffect(() => { (async () => { await load() })() }, [load])

  const handleToggle = async (businessId, current) => {
    const prev = items
    setItems(list => list.map(i => i.business._id === businessId ? { ...i, registrationFeePaid: !current } : i))
    try {
      await setRegistrationPayment(businessId, !current)
    } catch (err) {
      setItems(prev)
      setError(err instanceof ApiError ? err.message : 'Could not update payment status.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Registration Statuses</option>
          <option value="PAID">Paid</option>
          <option value="UNPAID">Unpaid</option>
        </select>
      </div>

      {error && <div className="bg-danger/8 text-danger rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr>
                {['Vendor', 'Registration Fee', 'AdManager Fee', 'Registered', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">No vendors found</td></tr>
              ) : items.map(v => (
                <tr key={v.business._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800">{v.business.username}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${v.registrationFeePaid ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {v.registrationFeePaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${v.adManagerFeePaid ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'}`}>
                      {v.adManagerFeePaid ? 'Paid' : 'Not Purchased'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(v.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(v.business._id, v.registrationFeePaid)} className="text-xs font-bold text-brand hover:underline">
                      Mark {v.registrationFeePaid ? 'Unpaid' : 'Paid'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PageFooter label="vendors" count={items.length} total={pagination.total} page={pagination.page} hasNextPage={pagination.hasNextPage} onPrev={() => setPage(p => Math.max(1, p - 1))} onNext={() => setPage(p => p + 1)} />
      </div>
    </div>
  )
}

/* ── Commissions Tab ── */
function CommissionsTab() {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1 })
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    getCommissions({ page, limit: 20, status })
      .then(data => { setItems(data.items || []); setPagination(data.pagination) })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load commissions.'))
      .finally(() => setLoading(false))
  }, [page, status])

  useEffect(() => { (async () => { await load() })() }, [load])

  const handleStatusChange = async (id, newStatus) => {
    const prev = items
    setItems(list => list.map(c => c._id === id ? { ...c, status: newStatus } : c))
    try {
      await updateCommission(id, newStatus)
    } catch (err) {
      setItems(prev)
      setError(err instanceof ApiError ? err.message : 'Could not update commission.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this commission record? Only possible while PENDING.')) return
    const prev = items
    setItems(list => list.filter(c => c._id !== id))
    try {
      await deleteCommission(id)
    } catch (err) {
      setItems(prev)
      setError(err instanceof ApiError ? err.message : 'Could not delete commission.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SETTLED">Settled</option>
          <option value="ON_HOLD">On Hold</option>
        </select>
      </div>

      {error && <div className="bg-danger/8 text-danger rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr>
                {['Business', 'Booking Amount', 'Rate', 'Commission', 'Vendor Revenue', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">No commissions found</td></tr>
              ) : items.map(c => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{c.business?.username}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtMoney(c.bookingAmount)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{c.commissionRate}%</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtMoney(c.commissionAmount)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtMoney(c.vendorRevenue)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      onChange={e => handleStatusChange(c._id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-bold border-none outline-none cursor-pointer ${STATUS_STYLES[c.status]}`}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="SETTLED">Settled</option>
                      <option value="ON_HOLD">On Hold</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {c.status === 'PENDING' && (
                      <button onClick={() => handleDelete(c._id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-danger/8 text-danger hover:bg-danger/15" title="Delete">
                        <IconTrash />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PageFooter label="commissions" count={items.length} total={pagination.total} page={pagination.page} hasNextPage={pagination.hasNextPage} onPrev={() => setPage(p => Math.max(1, p - 1))} onNext={() => setPage(p => p + 1)} />
      </div>
    </div>
  )
}

/* ── Settlements Tab ── */
function SettlementsTab() {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1 })
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [businesses, setBusinesses] = useState([])
  const [newBusinessId, setNewBusinessId] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    getSettlements({ page, limit: 20, status })
      .then(data => { setItems(data.items || []); setPagination(data.pagination) })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load settlements.'))
      .finally(() => setLoading(false))
  }, [page, status])

  useEffect(() => { (async () => { await load() })() }, [load])
  useEffect(() => { getBusinesses({ limit: 200 }).then(data => setBusinesses(data.items || [])).catch(() => {}) }, [])

  const handleCreate = async () => {
    if (!newBusinessId) return
    setCreating(true)
    setError('')
    try {
      await createSettlement(newBusinessId)
      setNewBusinessId('')
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create settlement — vendor may have no pending commissions.')
    } finally {
      setCreating(false)
    }
  }

  const handleMarkTransferred = async (id) => {
    const payoutId = window.prompt('Razorpay payout ID (optional):') || undefined
    try {
      await markSettlementTransferred(id, payoutId)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not mark as transferred.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this settlement? Its commissions will revert to PENDING so they can be re-bundled.')) return
    try {
      await deleteSettlement(id)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete settlement.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap items-center gap-3">
        <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          <option value="QUEUED">Queued</option>
          <option value="PROCESSING">Processing</option>
          <option value="TRANSFERRED">Transferred</option>
          <option value="FAILED">Failed</option>
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={newBusinessId} onChange={e => setNewBusinessId(e.target.value)}>
            <option value="">Select vendor to bundle pending commissions…</option>
            {businesses.map(b => <option key={b._id} value={b._id}>{b.username}</option>)}
          </select>
          <button onClick={handleCreate} disabled={creating || !newBusinessId} className="bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-brand/90 disabled:opacity-40 whitespace-nowrap">
            {creating ? 'Creating…' : 'Create Settlement'}
          </button>
        </div>
      </div>

      {error && <div className="bg-danger/8 text-danger rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr>
                {['Business', 'Total Amount', 'Status', 'Commissions', 'Payout ID', 'Processed', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">No settlements found</td></tr>
              ) : items.map(s => (
                <tr key={s._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{s.business?.username}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtMoney(s.totalAmount)}</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[s.status]}`}>{s.status}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap">{s.commissions?.length || 0}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{s.razorpayPayoutId || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(s.processedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {['QUEUED', 'PROCESSING'].includes(s.status) && (
                        <button onClick={() => handleMarkTransferred(s._id)} className="text-xs font-bold text-success hover:underline whitespace-nowrap">Mark Transferred</button>
                      )}
                      {s.status !== 'TRANSFERRED' && (
                        <button onClick={() => handleDelete(s._id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-danger/8 text-danger hover:bg-danger/15 shrink-0" title="Delete">
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PageFooter label="settlements" count={items.length} total={pagination.total} page={pagination.page} hasNextPage={pagination.hasNextPage} onPrev={() => setPage(p => Math.max(1, p - 1))} onNext={() => setPage(p => p + 1)} />
      </div>
    </div>
  )
}

/* ── Wallet Transactions Tab ── */
function TransactionsTab() {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1 })
  const [page, setPage] = useState(1)
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    getWalletTransactions({ page, limit: 20, type })
      .then(data => { setItems(data.items || []); setPagination(data.pagination) })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load transactions.'))
      .finally(() => setLoading(false))
  }, [page, type])

  useEffect(() => { (async () => { await load() })() }, [load])

  return (
    <div className="space-y-4">
      <div className="bg-info/8 text-info rounded-xl px-4 py-3 text-xs font-semibold">
        This is a ledger — view only. Editing or deleting a past transaction here would desync it from the vendor's actual wallet balance. To adjust a balance, use "Credit Coins to Vendor" on the Dashboard tab, which adds a new, auditable entry instead.
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={type} onChange={e => { setType(e.target.value); setPage(1) }}>
          <option value="">All Types</option>
          <option value="CREDIT_PURCHASE">Credit Purchase</option>
          <option value="CREDIT_REFERRAL">Credit Referral</option>
          <option value="DEBIT_BOOST">Debit Boost</option>
          <option value="DEBIT_LEAD_UNLOCK">Debit Lead Unlock</option>
        </select>
      </div>

      {error && <div className="bg-danger/8 text-danger rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr>
                {['Business', 'Type', 'Coins', 'Amount Paid', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">No transactions found</td></tr>
              ) : items.map(t => (
                <tr key={t._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{t.business?.username}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><span className="px-2.5 py-1 rounded-full text-xs font-bold bg-info/8 text-info">{t.type}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap">{t.coins}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{t.amountPaid ? fmtMoney(t.amountPaid) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PageFooter label="transactions" count={items.length} total={pagination.total} page={pagination.page} hasNextPage={pagination.hasNextPage} onPrev={() => setPage(p => Math.max(1, p - 1))} onNext={() => setPage(p => p + 1)} />
      </div>
    </div>
  )
}

/* ── Lead Recharges Tab ── */
function LeadRechargesTab() {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    getLeadRecharges({ page, limit: 20 })
      .then(data => { setItems(data.items || []); setPagination(data.pagination) })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load lead recharges.'))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => { (async () => { await load() })() }, [load])

  return (
    <div className="space-y-4">
      {error && <div className="bg-danger/8 text-danger rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr>
                {['Business', 'Coins Spent', 'Leads Unlocked', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400 text-sm">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400 text-sm">No lead recharges found</td></tr>
              ) : items.map(t => (
                <tr key={t._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{t.business?.username}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{t.coins}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{t.meta?.leadsUnlocked ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PageFooter label="recharges" count={items.length} total={pagination.total} page={pagination.page} hasNextPage={pagination.hasNextPage} onPrev={() => setPage(p => Math.max(1, p - 1))} onNext={() => setPage(p => p + 1)} />
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('Dashboard')

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">Finance</h1>
        <p className="text-sm text-slate-500 mt-0.5">Registration fees, commissions, settlements, and wallet activity across the platform</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === tab ? 'bg-brand text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-brand/40'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Dashboard' && <DashboardTab />}
      {activeTab === 'Vendor Payments' && <VendorPaymentsTab />}
      {activeTab === 'Commissions' && <CommissionsTab />}
      {activeTab === 'Settlements' && <SettlementsTab />}
      {activeTab === 'Wallet Transactions' && <TransactionsTab />}
      {activeTab === 'Lead Recharges' && <LeadRechargesTab />}
    </div>
  )
}
