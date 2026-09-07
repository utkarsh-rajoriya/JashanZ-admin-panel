import { useState, useEffect, useCallback } from 'react'
import { getBusinesses, verifyBusiness, deleteBusiness, getBusinessBookings, getCategories } from '../../api/business'
import { getPlatformAnalytics } from '../../api/analytics'
import { ApiError } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'

const STATUSES_LIST = ['PENDING', 'VERIFIED', 'REJECTED']
const STATUS_LABEL = { PENDING: 'Pending', VERIFIED: 'Approved', REJECTED: 'Rejected' }
const STATUS_STYLES = {
  PENDING:  'bg-warning/10 text-warning',
  VERIFIED: 'bg-success/10 text-success',
  REJECTED: 'bg-danger/10 text-danger',
}

const BOOKING_STATUS_STYLES = {
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
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconXSmall = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>

/* ── Business Detail Modal ── */
function BusinessDetailModal({ biz, onClose, onVerify }) {
  const [tab, setTab] = useState('Overview')
  const tabs = ['Overview', 'Documents', 'Bank Details', 'Bookings']
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const profile = biz.profile || {}

  useEffect(() => {
    if (tab !== 'Bookings') return
    (async () => {
      setBookingsLoading(true)
      try {
        const data = await getBusinessBookings(biz._id, { limit: 20 })
        setBookings(data.items || [])
      } catch {
        setBookings([])
      } finally {
        setBookingsLoading(false)
      }
    })()
  }, [tab, biz._id])

  const handleVerify = async (status) => {
    setActionLoading(true)
    try {
      await onVerify(biz._id, status)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {biz.profileImg
              ? <img src={biz.profileImg} alt={biz.username} className="w-10 h-10 rounded-xl object-cover" />
              : <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">{biz.username?.[0]?.toUpperCase()}</div>}
            <div>
              <h3 className="font-black text-slate-800 text-base">{profile.name || biz.username}</h3>
              <p className="text-xs text-slate-400">{biz.username} &middot; {biz.category?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[biz.status]}`}>{STATUS_LABEL[biz.status]}</span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><IconX /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors ${tab===t ? 'border-brand text-brand' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{t}</button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto flex-1 p-6">
          {tab === 'Overview' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Username', biz.username],
                ['Email', biz.email || '—'],
                ['Mobile', `${biz.countryCode || ''} ${biz.phoneNumber || ''}`],
                ['Category', biz.category?.name || '—'],
                ['Area', profile.area || '—'],
                ['Address', profile.address || '—'],
                ['Rating', profile.averageRating ? `${profile.averageRating} (${profile.totalReviews} reviews)` : 'No reviews yet'],
                ['Total Bookings', biz.bookingsCount],
                ['Revenue', fmtMoney(biz.revenue)],
                ['Registration Paid', biz.isPaid ? 'Yes' : 'No'],
                ['Registered On', fmtDate(biz.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">{k}</p>
                  <p className="text-sm font-bold text-slate-800">{v || '—'}</p>
                </div>
              ))}
              {profile.description && (
                <div className="col-span-2 bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-slate-700">{profile.description}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'Documents' && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">GST Number</p>
                <p className="text-sm font-bold text-slate-800">{profile.gstNumber || 'Not provided'}</p>
              </div>
              {[['GST Certificate', profile.gstCertificate], ['PAN Card', profile.panCard]].map(([label, url]) => (
                <div key={label} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-info/8 rounded-xl flex items-center justify-center text-info">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{label}</p>
                      <p className="text-xs text-slate-400">{url ? 'Uploaded' : 'Not uploaded'}</p>
                    </div>
                  </div>
                  {url && <a href={url} target="_blank" rel="noreferrer" className="bg-info/8 text-info text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-info/15">View</a>}
                </div>
              ))}
              {profile.otherVerificationMethod && (
                <p className="text-xs text-slate-400">Verification via shop visit / online data collection selected instead of GST/PAN.</p>
              )}
            </div>
          )}

          {tab === 'Bank Details' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Account Holder', biz.holderName],
                ['Account Number', biz.accountNumber ? `••••${String(biz.accountNumber).slice(-4)}` : '—'],
                ['Bank', biz.bankName],
                ['IFSC Code', biz.bankIfsc],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">{k}</p>
                  <p className="text-sm font-bold text-slate-800">{v || '—'}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'Bookings' && (
            <div className="overflow-x-auto">
              {bookingsLoading ? (
                <p className="text-sm text-slate-400 py-8 text-center">Loading bookings...</p>
              ) : bookings.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">No bookings yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide pb-3">Customer</th>
                      <th className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide pb-3">Service</th>
                      <th className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide pb-3">Date</th>
                      <th className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide pb-3">Amount</th>
                      <th className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map(b => (
                      <tr key={b._id} className="hover:bg-slate-50">
                        <td className="py-2.5 font-semibold text-slate-700">{b.user?.name || b.bookerBusiness?.username || '—'}</td>
                        <td className="py-2.5 text-slate-500">{b.service?.name || '—'}</td>
                        <td className="py-2.5 text-slate-500">{fmtDate(b.bookingDate)}</td>
                        <td className="py-2.5 font-bold text-slate-800">{fmtMoney(b.totalAmount)}</td>
                        <td className="py-2.5"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${BOOKING_STATUS_STYLES[b.status] || 'bg-slate-100 text-slate-500'}`}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2 text-sm font-bold hover:bg-slate-200">Close</button>
          <div className="flex gap-2">
            <button
              onClick={() => handleVerify('VERIFIED')}
              disabled={actionLoading || biz.status === 'VERIFIED'}
              className="bg-success/10 text-success rounded-xl px-4 py-2 text-sm font-bold hover:bg-success/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Approve
            </button>
            <button
              onClick={() => handleVerify('REJECTED')}
              disabled={actionLoading || biz.status === 'REJECTED'}
              className="bg-danger/10 text-danger rounded-xl px-4 py-2 text-sm font-bold hover:bg-danger/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function BusinessesPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categories, setCategories] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, hasNextPage: false })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [viewBiz, setViewBiz] = useState(null)
  const [deleteBiz, setDeleteBiz] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  const loadStats = useCallback(() => {
    getPlatformAnalytics().then(setStats).catch(() => {})
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  const loadBusinesses = useCallback(() => {
    setLoading(true)
    setError('')
    getBusinesses({ page, limit: 10, search: debouncedSearch, category: catFilter, status: statusFilter })
      .then(data => {
        setBusinesses(data.items || [])
        setPagination(data.pagination)
      })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load businesses.'))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, catFilter, statusFilter])

  useEffect(() => { (async () => { await loadBusinesses() })() }, [loadBusinesses])

  const handleVerify = async (businessId, status) => {
    await verifyBusiness(businessId, status)
    loadBusinesses()
    loadStats()
    setViewBiz(v => v && v._id === businessId ? { ...v, status } : v)
  }

  const handleDelete = async () => {
    if (!deleteBiz) return
    setDeleting(true)
    try {
      await deleteBusiness(deleteBiz._id)
      setDeleteBiz(null)
      setViewBiz(v => v && v._id === deleteBiz._id ? null : v)
      loadBusinesses()
      loadStats()
    } catch {
      // no-op — dialog stays open so the admin can retry
    } finally {
      setDeleting(false)
    }
  }

  const total = stats?.totalBusinesses ?? 0
  const pending = stats?.pendingBusinesses ?? 0
  const approved = stats?.verifiedBusinesses ?? 0
  const rejected = stats?.rejectedBusinesses ?? 0

  return (
    <div className="space-y-5 pb-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-black text-slate-800">Business Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage all registered businesses on the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {label:'Total Businesses', value:total, color:'info'},
          {label:'Pending Approval', value:pending, color:'warning'},
          {label:'Approved', value:approved, color:'success'},
          {label:'Rejected', value:rejected, color:'danger'},
        ].map(s => {
          const clr = {info:'bg-info/8 text-info',warning:'bg-warning/8 text-warning',success:'bg-success/8 text-success',danger:'bg-danger/8 text-danger'}
          return (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100">
              <div className={`w-9 h-9 rounded-xl ${clr[s.color]} flex items-center justify-center mb-3 text-lg font-black`}>
                {s.value > 99 ? '🏢' : s.value}
              </div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-2xl font-black text-slate-800">{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <input
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20 flex-1 min-w-[180px]"
          placeholder="Search by username or phone..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          {STATUSES_LIST.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
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
                {['Business','Category','Area','Status','Bookings','Registered','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">Loading businesses...</td></tr>
              ) : businesses.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">No businesses match your filters</td></tr>
              ) : businesses.map(biz => (
                <tr key={biz._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {biz.profileImg
                        ? <img src={biz.profileImg} alt={biz.username} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        : <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-black shrink-0">{biz.username?.[0]?.toUpperCase()}</div>}
                      <div>
                        <p className="font-bold text-slate-800 text-xs leading-tight">{biz.profile?.name || biz.username}</p>
                        <p className="text-[11px] text-slate-400">{biz.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 font-semibold">{biz.category?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{biz.profile?.area || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[biz.status]}`}>{STATUS_LABEL[biz.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-800">{biz.bookingsCount}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(biz.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewBiz(biz)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-info/8 text-info hover:bg-info/15 transition-colors" title="View"><IconEye /></button>
                      <button onClick={() => handleVerify(biz._id, 'VERIFIED')} disabled={biz.status==='VERIFIED'} className="w-7 h-7 flex items-center justify-center rounded-lg bg-success/8 text-success hover:bg-success/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Approve"><IconCheck /></button>
                      <button onClick={() => handleVerify(biz._id, 'REJECTED')} disabled={biz.status==='REJECTED'} className="w-7 h-7 flex items-center justify-center rounded-lg bg-danger/8 text-danger hover:bg-danger/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Reject"><IconXSmall /></button>
                      <button onClick={() => setDeleteBiz(biz)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-danger/8 text-danger hover:bg-danger/15 transition-colors" title="Delete"><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          <span>Showing {businesses.length} of {pagination.total} businesses</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Prev</button>
            <span className="font-semibold text-slate-500">Page {pagination.page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNextPage} className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>

      {viewBiz && <BusinessDetailModal biz={viewBiz} onClose={() => setViewBiz(null)} onVerify={handleVerify} />}

      {deleteBiz && (
        <ConfirmDialog
          title="Delete this business?"
          message={`${deleteBiz.profile?.name || deleteBiz.username}'s account will be permanently and irreversibly deleted — this cannot be undone. Their past bookings and reviews stay in the system, but will show this business as removed.`}
          confirmLabel="Delete Business"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteBiz(null)}
        />
      )}
    </div>
  )
}
