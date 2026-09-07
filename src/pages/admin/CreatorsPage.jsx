import { useState, useEffect, useCallback } from 'react'
import { getCreators, verifyCreator, deleteCreator, updateCreatorSocialStats } from '../../api/creators'
import { ApiError } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'

const STATUSES_LIST = ['PENDING', 'VERIFIED', 'REJECTED']
const STATUS_LABEL = { PENDING: 'Pending', VERIFIED: 'Approved', REJECTED: 'Rejected' }
const STATUS_STYLES = {
  PENDING:  'bg-warning/10 text-warning',
  VERIFIED: 'bg-success/10 text-success',
  REJECTED: 'bg-danger/10 text-danger',
}

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
const fmtCount = n => (n || 0).toLocaleString('en-IN')

/* ── Icons ── */
const IconEye = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconXSmall = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>

/* ── Creator Detail Modal ── */
function CreatorDetailModal({ creator, onClose, onVerify, actionError, onStatsSaved }) {
  const [actionLoading, setActionLoading] = useState(false)
  const [statsForm, setStatsForm] = useState({
    instagramFollowers: creator.instagramFollowers ?? 0,
    youtubeSubscribers: creator.youtubeSubscribers ?? 0,
  })
  const [savingStats, setSavingStats] = useState(false)
  const [statsError, setStatsError] = useState('')

  const handleVerify = async (status) => {
    setActionLoading(true)
    try {
      await onVerify(creator._id, status)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveStats = async () => {
    setSavingStats(true)
    setStatsError('')
    const payload = {
      instagramFollowers: Number(statsForm.instagramFollowers) || 0,
      youtubeSubscribers: Number(statsForm.youtubeSubscribers) || 0,
    }
    try {
      await updateCreatorSocialStats(creator._id, payload)
      onStatsSaved(creator._id, payload)
    } catch (err) {
      setStatsError(err instanceof ApiError ? err.message : 'Could not save follower counts.')
    } finally {
      setSavingStats(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {creator.profileImg
              ? <img src={creator.profileImg} alt={creator.username} className="w-10 h-10 rounded-xl object-cover" />
              : <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">{creator.username?.[0]?.toUpperCase()}</div>}
            <div>
              <h3 className="font-black text-slate-800 text-base">{creator.username}</h3>
              <p className="text-xs text-slate-400">Creator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[creator.status]}`}>{STATUS_LABEL[creator.status]}</span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><IconX /></button>
          </div>
        </div>

        <div className="p-6">
          {(creator.instagramUrl || creator.youtubeUrl) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {creator.instagramUrl && (
                <a href={creator.instagramUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand bg-brand/8 hover:bg-brand/15 px-3 py-1.5 rounded-full transition-colors">Open Instagram ↗</a>
              )}
              {creator.youtubeUrl && (
                <a href={creator.youtubeUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand bg-brand/8 hover:bg-brand/15 px-3 py-1.5 rounded-full transition-colors">Open YouTube ↗</a>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Instagram Followers</p>
              <input
                type="number"
                min="0"
                value={statsForm.instagramFollowers}
                onChange={e => setStatsForm(f => ({ ...f, instagramFollowers: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">YouTube Subscribers</p>
              <input
                type="number"
                min="0"
                value={statsForm.youtubeSubscribers}
                onChange={e => setStatsForm(f => ({ ...f, youtubeSubscribers: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Registered On</p>
              <p className="text-sm font-bold text-slate-800">{fmtDate(creator.createdAt)}</p>
            </div>
            {creator.bio && (
              <div className="col-span-2 bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Bio</p>
                <p className="text-sm text-slate-700">{creator.bio}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 mt-3">
            {statsError && <p className="text-xs text-danger font-semibold">{statsError}</p>}
            <button
              onClick={handleSaveStats}
              disabled={savingStats}
              className="ml-auto bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingStats ? 'Saving…' : 'Save Follower Counts'}
            </button>
          </div>

          {actionError && (
            <p className="text-xs text-danger bg-danger/8 rounded-xl p-3 mt-3 font-semibold">{actionError}</p>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2 text-sm font-bold hover:bg-slate-200">Close</button>
          <div className="flex gap-2">
            <button
              onClick={() => handleVerify('VERIFIED')}
              disabled={actionLoading || creator.status === 'VERIFIED'}
              className="bg-success/10 text-success rounded-xl px-4 py-2 text-sm font-bold hover:bg-success/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Approve
            </button>
            <button
              onClick={() => handleVerify('REJECTED')}
              disabled={actionLoading || creator.status === 'REJECTED'}
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
export default function CreatorsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [creators, setCreators] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, hasNextPage: false })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [viewCreator, setViewCreator] = useState(null)
  const [actionError, setActionError] = useState('')
  const [deleteCreatorTarget, setDeleteCreatorTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadStats = useCallback(() => {
    Promise.all([
      getCreators({ limit: 1 }),
      getCreators({ status: 'PENDING', limit: 1 }),
      getCreators({ status: 'VERIFIED', limit: 1 }),
      getCreators({ status: 'REJECTED', limit: 1 }),
    ])
      .then(([all, pending, verified, rejected]) => setStats({
        total: all.pagination.total,
        pending: pending.pagination.total,
        verified: verified.pagination.total,
        rejected: rejected.pagination.total,
      }))
      .catch(() => {})
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  const loadCreators = useCallback(() => {
    setLoading(true)
    setError('')
    getCreators({ page, limit: 10, status: statusFilter })
      .then(data => {
        setCreators(data.items || [])
        setPagination(data.pagination)
      })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load creators.'))
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  useEffect(() => { (async () => { await loadCreators() })() }, [loadCreators])

  const handleVerify = async (creatorId, status) => {
    setActionError('')
    try {
      await verifyCreator(creatorId, status)
      loadCreators()
      loadStats()
      setViewCreator(v => v && v._id === creatorId ? { ...v, status } : v)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update creator status.')
    }
  }

  const handleStatsSaved = (creatorId, updatedFields) => {
    setViewCreator(v => v && v._id === creatorId ? { ...v, ...updatedFields } : v)
    setCreators(prev => prev.map(c => c._id === creatorId ? { ...c, ...updatedFields } : c))
  }

  const handleDelete = async () => {
    if (!deleteCreatorTarget) return
    setDeleting(true)
    try {
      await deleteCreator(deleteCreatorTarget._id)
      setDeleteCreatorTarget(null)
      setViewCreator(v => v && v._id === deleteCreatorTarget._id ? null : v)
      loadCreators()
      loadStats()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not delete creator.')
    } finally {
      setDeleting(false)
    }
  }

  const total = stats?.total ?? 0
  const pending = stats?.pending ?? 0
  const approved = stats?.verified ?? 0
  const rejected = stats?.rejected ?? 0

  return (
    <div className="space-y-5 pb-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-black text-slate-800">Creator Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage all registered content creators on the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {label:'Total Creators', value:total, color:'info'},
          {label:'Pending Approval', value:pending, color:'warning'},
          {label:'Approved', value:approved, color:'success'},
          {label:'Rejected', value:rejected, color:'danger'},
        ].map(s => {
          const clr = {info:'bg-info/8 text-info',warning:'bg-warning/8 text-warning',success:'bg-success/8 text-success',danger:'bg-danger/8 text-danger'}
          return (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100">
              <div className={`w-9 h-9 rounded-xl ${clr[s.color]} flex items-center justify-center mb-3 text-lg font-black`}>
                {s.value > 99 ? '🎬' : s.value}
              </div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-2xl font-black text-slate-800">{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          {STATUSES_LIST.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {error && (
        <div className="bg-danger/8 text-danger rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>
      )}
      {actionError && (
        <div className="bg-danger/8 text-danger rounded-xl px-4 py-3 text-sm font-semibold">{actionError}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr>
                {['Creator','Instagram','YouTube','Status','Registered','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">Loading creators...</td></tr>
              ) : creators.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No creators match your filters</td></tr>
              ) : creators.map(c => (
                <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.profileImg
                        ? <img src={c.profileImg} alt={c.username} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        : <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-black shrink-0">{c.username?.[0]?.toUpperCase()}</div>}
                      <p className="font-bold text-slate-800 text-xs leading-tight">{c.username}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 font-semibold">{fmtCount(c.instagramFollowers)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 font-semibold">{fmtCount(c.youtubeSubscribers)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewCreator(c)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-info/8 text-info hover:bg-info/15 transition-colors" title="View"><IconEye /></button>
                      <button onClick={() => handleVerify(c._id, 'VERIFIED')} disabled={c.status==='VERIFIED'} className="w-7 h-7 flex items-center justify-center rounded-lg bg-success/8 text-success hover:bg-success/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Approve"><IconCheck /></button>
                      <button onClick={() => handleVerify(c._id, 'REJECTED')} disabled={c.status==='REJECTED'} className="w-7 h-7 flex items-center justify-center rounded-lg bg-danger/8 text-danger hover:bg-danger/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Reject"><IconXSmall /></button>
                      <button onClick={() => setDeleteCreatorTarget(c)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-danger/8 text-danger hover:bg-danger/15 transition-colors" title="Delete"><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          <span>Showing {creators.length} of {pagination.total} creators</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Prev</button>
            <span className="font-semibold text-slate-500">Page {pagination.page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNextPage} className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>

      {viewCreator && (
        <CreatorDetailModal
          key={`${viewCreator._id}-${viewCreator.instagramFollowers}-${viewCreator.youtubeSubscribers}`}
          creator={viewCreator}
          onClose={() => { setViewCreator(null); setActionError('') }}
          onVerify={handleVerify}
          actionError={actionError}
          onStatsSaved={handleStatsSaved}
        />
      )}

      {deleteCreatorTarget && (
        <ConfirmDialog
          title="Delete this creator?"
          message={`${deleteCreatorTarget.username}'s account will be permanently and irreversibly deleted — this cannot be undone. Their existing BOOMs, posts, and follower relationships stay in the system, but will show this creator as removed.`}
          confirmLabel="Delete Creator"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteCreatorTarget(null)}
        />
      )}
    </div>
  )
}
