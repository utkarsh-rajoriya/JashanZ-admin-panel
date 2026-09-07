import { useState, useEffect, useCallback } from 'react'
import { listTickets, getTicketDetails, addTicketNote, resolveTicket, escalateTicket } from '../../api/support'
import { ApiError } from '../../api/client'

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED']

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

const IconCheck = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconAlert = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IconEye = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IconNote = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

function NoteModal({ ticket, onClose, onSaved }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (!text.trim()) return
    setError('')
    setSaving(true)
    try {
      await addTicketNote(ticket._id, text.trim())
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add note.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-800">Add Internal Note</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><IconX /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <textarea
            required
            rows={4}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20 resize-none"
            placeholder="Not visible to the ticket raiser..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          {error && <p className="text-sm text-danger font-semibold">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-200">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-brand/90 disabled:opacity-50">{saving ? 'Saving...' : 'Add Note'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DetailRow({ label, children }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  )
}

function TicketDetailModal({ ticketId, onClose }) {
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await getTicketDetails(ticketId)
        if (!cancelled) setTicket(data.ticket)
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load ticket.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [ticketId])

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="font-black text-slate-800">Ticket Details</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><IconX /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-12">Loading...</p>
          ) : error ? (
            <p className="text-sm text-danger font-semibold text-center py-12">{error}</p>
          ) : (
            <>
              <DetailRow label="Subject">{ticket.subject}</DetailRow>
              <div className="grid grid-cols-2 gap-4">
                <DetailRow label="Type">{TYPE_LABELS[ticket.type] ?? ticket.type}</DetailRow>
                <DetailRow label="Status">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_CLS[ticket.status]}`}>{ticket.status.replace('_', ' ')}</span>
                </DetailRow>
                <DetailRow label="Assigned To">{ticket.assignedTo?.username ?? '—'}</DetailRow>
              </div>
              <DetailRow label="Raised By">
                {ticket.raisedBy?.name || ticket.raisedBy?.username || ticket.raisedByModel}
                {ticket.raisedBy?.phoneNumber && <span className="text-slate-400"> &middot; {ticket.raisedBy.phoneNumber}</span>}
                <span className="text-slate-400"> &middot; {ticket.raisedByModel}</span>
              </DetailRow>
              <DetailRow label="Description">
                <p className="whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
              </DetailRow>
              {ticket.bookingId && (
                <DetailRow label="Linked Booking">
                  {ticket.bookingId.status} &middot; ₹{ticket.bookingId.totalAmount} &middot; {new Date(ticket.bookingId.bookingDate).toLocaleDateString()}
                </DetailRow>
              )}
              {ticket.adId && (
                <DetailRow label="Linked Ad">{ticket.adId.title} &middot; {ticket.adId.status}</DetailRow>
              )}
              <DetailRow label="Raised On">{new Date(ticket.createdAt).toLocaleString()}</DetailRow>
              <DetailRow label={`Internal Notes (${ticket.notes?.length ?? 0})`}>
                {!ticket.notes || ticket.notes.length === 0 ? (
                  <p className="text-slate-400">No notes yet</p>
                ) : (
                  <div className="space-y-2 mt-1">
                    {ticket.notes.map((n, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl px-3 py-2">
                        <p className="text-slate-700">{n.text}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{n.author?.username ?? 'Unknown'} &middot; {new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </DetailRow>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [notingTicket, setNotingTicket] = useState(null)
  const [viewingTicketId, setViewingTicketId] = useState(null)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listTickets(status ? { status } : undefined)
      setTickets(data.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load tickets.')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { (async () => { await fetchTickets() })() }, [fetchTickets])

  const handleResolve = async id => {
    setBusyId(id)
    try {
      await resolveTicket(id)
      await fetchTickets()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resolve ticket.')
    } finally {
      setBusyId(null)
    }
  }

  const handleEscalate = async id => {
    if (!window.confirm('Escalate this ticket and mark it URGENT?')) return
    setBusyId(id)
    try {
      await escalateTicket(id)
      await fetchTickets()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to escalate ticket.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">Ticket Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Customer and vendor support tickets</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setStatus('')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${status==='' ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>All</button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${status===s ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s.replace('_', ' ')}</button>
        ))}
      </div>

      {error && <p className="text-sm text-danger font-semibold">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr>
                {['Subject', 'Raised By', 'Status', 'Assigned To', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">Loading...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No tickets found</td></tr>
              ) : tickets.map(t => (
                <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-xs text-slate-800 leading-tight">{t.subject}</p>
                    <p className="text-[11px] text-slate-400">{TYPE_LABELS[t.type] ?? t.type}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{t.raisedBy?.name || t.raisedBy?.username || t.raisedByModel}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_CLS[t.status]}`}>{t.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.assignedTo?.username ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewingTicketId(t._id)} disabled={busyId===t._id} className="w-7 h-7 flex items-center justify-center rounded-lg bg-brand/8 text-brand hover:bg-brand/15 disabled:opacity-50" title="View details"><IconEye /></button>
                      <button onClick={() => setNotingTicket(t)} disabled={busyId===t._id} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50" title="Add note"><IconNote /></button>
                      {t.status !== 'RESOLVED' && (
                        <button onClick={() => handleResolve(t._id)} disabled={busyId===t._id} className="w-7 h-7 flex items-center justify-center rounded-lg bg-success/8 text-success hover:bg-success/15 disabled:opacity-50" title="Mark resolved"><IconCheck /></button>
                      )}
                      {t.status !== 'ESCALATED' && (
                        <button onClick={() => handleEscalate(t._id)} disabled={busyId===t._id} className="w-7 h-7 flex items-center justify-center rounded-lg bg-danger/8 text-danger hover:bg-danger/15 disabled:opacity-50" title="Escalate"><IconAlert /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          Showing {tickets.length} ticket{tickets.length === 1 ? '' : 's'}
        </div>
      </div>

      {notingTicket && <NoteModal ticket={notingTicket} onClose={() => setNotingTicket(null)} onSaved={fetchTickets} />}
      {viewingTicketId && <TicketDetailModal ticketId={viewingTicketId} onClose={() => setViewingTicketId(null)} />}
    </div>
  )
}
