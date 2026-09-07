import { useState, useEffect, useCallback } from 'react'
import { listAdManagerAccess, approveAdManagerAccess, rejectAdManagerAccess, revokeAdManagerAccess } from '../../api/admanager'
import { ApiError } from '../../api/client'

const STATUS_STYLES = {
  PENDING: 'bg-warning/10 text-warning',
  APPROVED: 'bg-success/10 text-success',
  REJECTED: 'bg-danger/10 text-danger',
}

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const IconEye = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
const IconX = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
const IconBan = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>

function AdManagerAccessDetailModal({ item, onClose }) {
  const rows = [
    ['Business Username', item.business?.username],
    ['Category', item.business?.category?.name],
    ['Phone', item.business?.phoneNumber ? `${item.business?.countryCode || ''} ${item.business.phoneNumber}` : null],
    ['Token', item.token],
    ['Paid', item.isPaid ? 'Yes' : 'No'],
    ['Paid At', fmtDate(item.paidAt)],
    ['Expires At', fmtDate(item.expiresAt)],
    ['Approval Status', item.approvalStatus],
    ['Approved At', fmtDate(item.approvedAt)],
    ['Rejection Reason', item.rejectionReason],
    ['Requested At', fmtDate(item.createdAt)],
  ]

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-800 text-base">AdManager Access Details</h3>
            <p className="text-xs text-slate-400">{item.business?.username}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[item.approvalStatus] || 'bg-slate-100 text-slate-500'}`}>{item.approvalStatus}</span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><IconX /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-6 grid grid-cols-2 gap-4">
          {rows.map(([k, v]) => (
            <div key={k} className={`bg-slate-50 rounded-xl p-3 ${k === 'Token' || k === 'Rejection Reason' ? 'col-span-2' : ''}`}>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">{k}</p>
              <p className={`text-sm font-bold text-slate-800 ${k === 'Token' ? 'font-mono break-all' : ''}`}>{v || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdManagerUsersPage() {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, hasNextPage: false })
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)
  const [viewItem, setViewItem] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    listAdManagerAccess({ page, limit: 20, approvalStatus: statusFilter })
      .then(data => {
        setItems(data.items || [])
        setPagination(data.pagination)
      })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load AdManager users.'))
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  useEffect(() => { (async () => { await load() })() }, [load])

  const handleApprove = async (accessId) => {
    setActionId(accessId)
    try {
      await approveAdManagerAccess(accessId)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not approve this request.')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (accessId) => {
    const reason = window.prompt('Reason for rejecting this AdManager access request:')
    if (!reason || !reason.trim()) return
    setActionId(accessId)
    try {
      await rejectAdManagerAccess(accessId, reason.trim())
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reject this request.')
    } finally {
      setActionId(null)
    }
  }

  const handleRevoke = async (accessId) => {
    if (!window.confirm('Revoke this business\'s AdManager access?')) return
    setActionId(accessId)
    try {
      await revokeAdManagerAccess(accessId)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke this access.')
    } finally {
      setActionId(null)
    }
  }

  const pendingCount = items.filter(i => i.approvalStatus === 'PENDING').length
  const approvedCount = items.filter(i => i.approvalStatus === 'APPROVED').length

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">AdManager Users</h1>
        <p className="text-sm text-slate-500 mt-0.5">Review and approve businesses requesting AdManager Portal access</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: pagination.total, color: 'info' },
          { label: 'Pending', value: pendingCount, color: 'warning' },
          { label: 'Approved', value: approvedCount, color: 'success' },
        ].map(s => {
          const clr = { info: 'text-info', warning: 'text-warning', success: 'text-success' }
          return (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{s.label}</p>
              <p className={`text-2xl font-black ${clr[s.color]}`}>{s.value}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <select
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {error && <div className="bg-danger/8 text-danger rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr>
                {['Business', 'Category', 'Paid', 'Status', 'Expires', 'Requested', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">No AdManager access requests yet</td></tr>
              ) : items.map(item => (
                <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800 text-xs leading-tight">{item.business?.username || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 font-semibold">{item.business?.category?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-800">{item.isPaid ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[item.approvalStatus] || 'bg-slate-100 text-slate-500'}`}>
                      {item.approvalStatus}
                    </span>
                    {item.approvalStatus === 'REJECTED' && item.rejectionReason && (
                      <p className="text-[10px] text-slate-400 mt-1 max-w-40 truncate" title={item.rejectionReason}>{item.rejectionReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(item.expiresAt)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(item.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewItem(item)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-info/8 text-info hover:bg-info/15 transition-colors"
                        title="View"
                      >
                        <IconEye />
                      </button>
                      {item.approvalStatus !== 'APPROVED' && (
                        <button
                          onClick={() => handleApprove(item._id)}
                          disabled={actionId === item._id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-success/8 text-success hover:bg-success/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Approve"
                        >
                          <IconCheck />
                        </button>
                      )}
                      {item.approvalStatus !== 'REJECTED' && (
                        <button
                          onClick={() => handleReject(item._id)}
                          disabled={actionId === item._id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-danger/8 text-danger hover:bg-danger/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Reject"
                        >
                          <IconX />
                        </button>
                      )}
                      {item.approvalStatus === 'APPROVED' && (
                        <button
                          onClick={() => handleRevoke(item._id)}
                          disabled={actionId === item._id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Revoke"
                        >
                          <IconBan />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          <span>Showing {items.length} of {pagination.total} requests</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Prev</button>
            <span className="font-semibold text-slate-500">Page {pagination.page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNextPage} className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>

      {viewItem && <AdManagerAccessDetailModal item={viewItem} onClose={() => setViewItem(null)} />}
    </div>
  )
}
