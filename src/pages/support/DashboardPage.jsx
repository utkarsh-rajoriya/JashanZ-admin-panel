import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupportDashboard } from '../../api/support'
import { ApiError } from '../../api/client'

const STATUS_CLS = {
  OPEN: 'bg-info/10 text-info',
  IN_PROGRESS: 'bg-warning/10 text-warning',
  RESOLVED: 'bg-success/10 text-success',
  ESCALATED: 'bg-danger/10 text-danger',
}
const TYPE_LABELS = {
  BOOKING_ISSUE: 'Booking Issue',
  PAYMENT_ISSUE: 'Payment Issue',
  AD_COMPLAINT: 'Ad Complaint',
  GENERAL: 'General',
  ACCOUNT: 'Account',
}

export default function SupportDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getSupportDashboard())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { (async () => { await fetchDashboard() })() }, [fetchDashboard])

  if (loading) return <p className="text-sm text-slate-400 text-center py-24">Loading...</p>
  if (error) return <p className="text-sm text-danger font-semibold text-center py-24">{error}</p>
  if (!data) return null

  const { total, byStatus, recentTickets } = data

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">Support Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Live overview of customer and vendor support tickets</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Tickets', value: total, cls: 'text-brand' },
          { label: 'Open', value: byStatus.OPEN, cls: 'text-info' },
          { label: 'In Progress', value: byStatus.IN_PROGRESS, cls: 'text-warning' },
          { label: 'Resolved', value: byStatus.RESOLVED, cls: 'text-success' },
          { label: 'Escalated', value: byStatus.ESCALATED, cls: 'text-danger' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{s.label}</p>
            <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Recent Tickets</p>
          <button onClick={() => navigate('/support/tickets')} className="text-xs font-bold text-brand hover:underline">View All</button>
        </div>
        {recentTickets.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">No tickets raised yet</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTickets.map(t => (
              <div key={t._id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-bold text-xs text-slate-800 truncate">{t.subject}</p>
                  <p className="text-[11px] text-slate-400">{TYPE_LABELS[t.type] ?? t.type} &middot; {t.raisedBy?.name || t.raisedBy?.username || t.raisedByModel} &middot; {new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_CLS[t.status]}`}>{t.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
