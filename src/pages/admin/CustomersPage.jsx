import { useState, useEffect, useCallback } from 'react'
import { getUsers, suspendUser, reactivateUser, deleteUser, getUserBookings } from '../../api/users'
import { getPlatformAnalytics } from '../../api/analytics'
import { ApiError } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'

const STATUS_STYLES = {
  Active:    'bg-success/10 text-success',
  Suspended: 'bg-warning/10 text-warning',
}

const BOOKING_STYLES = {
  COMPLETED: 'bg-success/10 text-success',
  PENDING:   'bg-warning/10 text-warning',
  CONFIRMED: 'bg-info/10 text-info',
  CANCELLED: 'bg-danger/10 text-danger',
  PAYMENT_PENDING: 'bg-slate-100 text-slate-500',
}

const fmtMoney = n => `₹${(n || 0).toLocaleString('en-IN')}`
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

/* ── Icons ── */
const IconEye = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IconPause = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
const IconPlay = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>

/* ── Customer Detail Modal ── */
function CustomerDetailModal({ cust, onClose, onToggleStatus }) {
  const [tab, setTab] = useState('Profile')
  const tabs = ['Profile', 'Booking History']
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (tab !== 'Booking History') return
    (async () => {
      setBookingsLoading(true)
      try {
        const data = await getUserBookings(cust._id, { limit: 20 })
        setBookings(data.items || [])
      } catch {
        setBookings([])
      } finally {
        setBookingsLoading(false)
      }
    })()
  }, [tab, cust._id])

  const handleToggle = async () => {
    setActionLoading(true)
    try {
      await onToggleStatus(cust._id, cust.isActive)
    } finally {
      setActionLoading(false)
    }
  }

  const statusLabel = cust.isActive ? 'Active' : 'Suspended'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {cust.profileImg
              ? <img src={cust.profileImg} alt={cust.name} className="w-10 h-10 rounded-xl object-cover" />
              : <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">{(cust.name || cust.username || '?')[0]?.toUpperCase()}</div>}
            <div>
              <h3 className="font-black text-slate-800 text-base">{cust.name || cust.username || 'Unnamed user'}</h3>
              <p className="text-xs text-slate-400">@{cust.username || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[statusLabel]}`}>{statusLabel}</span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><IconX /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${tab===t ? 'border-brand text-brand' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{t}</button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {tab === 'Profile' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Full Name', cust.name || '—'], ['Username', cust.username || '—'],
                ['Phone', cust.phoneNumber || '—'], ['Email', cust.email || '—'],
                ['Profile Complete', cust.isProfileComplete ? 'Yes' : 'No'],
                ['Phone Verified', cust.isVerified ? 'Yes' : 'No'],
                ['Total Bookings', cust.bookingsCount], ['Total Spent', fmtMoney(cust.totalSpent)],
                ['Joined On', fmtDate(cust.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">{k}</p>
                  <p className="text-sm font-bold text-slate-800">{String(v)}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'Booking History' && (
            <div className="overflow-x-auto">
              {bookingsLoading ? (
                <p className="text-sm text-slate-400 py-8 text-center">Loading bookings...</p>
              ) : bookings.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">No bookings yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {['Vendor','Service','Date','Amount','Status'].map(h => (
                        <th key={h} className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide pb-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map(b => (
                      <tr key={b._id} className="hover:bg-slate-50">
                        <td className="py-2.5 text-xs font-semibold text-slate-700">{b.business?.username || '—'}</td>
                        <td className="py-2.5 text-xs text-slate-500">{b.service?.name || '—'}</td>
                        <td className="py-2.5 text-xs text-slate-500">{fmtDate(b.bookingDate)}</td>
                        <td className="py-2.5 text-xs font-bold text-slate-800">{fmtMoney(b.totalAmount)}</td>
                        <td className="py-2.5"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${BOOKING_STYLES[b.status]||'bg-slate-100 text-slate-500'}`}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2 text-sm font-bold hover:bg-slate-200">Close</button>
          <button
            onClick={handleToggle}
            disabled={actionLoading}
            className={`rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 ${cust.isActive ? 'bg-warning/10 text-warning hover:bg-warning/20' : 'bg-success/10 text-success hover:bg-success/20'}`}
          >
            {cust.isActive ? 'Suspend' : 'Reactivate'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [customers, setCustomers] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, hasNextPage: false })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [viewCust, setViewCust] = useState(null)
  const [deleteCust, setDeleteCust] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const loadStats = useCallback(() => {
    getPlatformAnalytics().then(setStats).catch(() => {})
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  const loadCustomers = useCallback(() => {
    setLoading(true)
    setError('')
    getUsers({ page, limit: 10, search: debouncedSearch, status: statusFilter })
      .then(data => {
        setCustomers(data.items || [])
        setPagination(data.pagination)
      })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load customers.'))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => { (async () => { await loadCustomers() })() }, [loadCustomers])

  const handleToggleStatus = async (userId, isCurrentlyActive) => {
    if (isCurrentlyActive) await suspendUser(userId)
    else await reactivateUser(userId)
    loadCustomers()
    loadStats()
    setViewCust(v => v && v._id === userId ? { ...v, isActive: !isCurrentlyActive } : v)
  }

  const handleDelete = async () => {
    if (!deleteCust) return
    setDeleting(true)
    try {
      await deleteUser(deleteCust._id)
      setDeleteCust(null)
      setViewCust(v => v && v._id === deleteCust._id ? null : v)
      loadCustomers()
      loadStats()
    } catch {
      // no-op — dialog stays open so the admin can retry
    } finally {
      setDeleting(false)
    }
  }

  const total = stats?.totalUsers ?? 0
  const active = stats?.activeUsers ?? 0
  const suspended = stats?.suspendedUsers ?? 0

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">Customer Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">View and manage all registered customers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {label:'Total Customers', value:total, color:'info'},
          {label:'Active', value:active, color:'success'},
          {label:'Suspended', value:suspended, color:'warning'},
        ].map(s => {
          const clr = {info:'text-info',warning:'text-warning',success:'text-success'}
          return (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{s.label}</p>
              <p className={`text-2xl font-black ${clr[s.color]}`}>{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <input
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20 flex-1 min-w-45"
          placeholder="Search by name, username or phone..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      {error && (
        <div className="bg-danger/8 text-danger rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr>
                {['Customer','Phone','Bookings','Spent','Status','Joined','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">Loading customers...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">No customers match your filters</td></tr>
              ) : customers.map(cust => (
                <tr key={cust._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-black shrink-0">{(cust.name || cust.username || '?')[0]?.toUpperCase()}</div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 leading-tight">{cust.name || cust.username || 'Unnamed'}</p>
                        <p className="text-[11px] text-slate-400">@{cust.username || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{cust.phoneNumber || '—'}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-800">{cust.bookingsCount}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-800">{fmtMoney(cust.totalSpent)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[cust.isActive ? 'Active' : 'Suspended']}`}>{cust.isActive ? 'Active' : 'Suspended'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(cust.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewCust(cust)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-info/8 text-info hover:bg-info/15" title="View"><IconEye /></button>
                      <button onClick={() => handleToggleStatus(cust._id, cust.isActive)} className={`w-7 h-7 flex items-center justify-center rounded-lg ${cust.isActive ? 'bg-warning/8 text-warning hover:bg-warning/15' : 'bg-success/8 text-success hover:bg-success/15'}`} title={cust.isActive ? 'Suspend' : 'Reactivate'}>
                        {cust.isActive ? <IconPause /> : <IconPlay />}
                      </button>
                      <button onClick={() => setDeleteCust(cust)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-danger/8 text-danger hover:bg-danger/15" title="Delete">
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          <span>Showing {customers.length} of {pagination.total} customers</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Prev</button>
            <span className="font-semibold text-slate-500">Page {pagination.page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNextPage} className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>

      {viewCust && <CustomerDetailModal cust={viewCust} onClose={() => setViewCust(null)} onToggleStatus={handleToggleStatus} />}

      {deleteCust && (
        <ConfirmDialog
          title="Delete this customer?"
          message={`${deleteCust.name || deleteCust.username || 'This customer'}'s account will be permanently and irreversibly deleted — this cannot be undone. Their past bookings and reviews stay in the system, but will show this customer as removed.`}
          confirmLabel="Delete Customer"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteCust(null)}
        />
      )}
    </div>
  )
}
