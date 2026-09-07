import { useState, useEffect, useCallback, useRef } from 'react'
import { getTrendingEvents, createTrendingEvent, updateTrendingEvent, toggleTrendingEvent, deleteTrendingEvent } from '../../api/trendingEvents'
import { getCategories } from '../../api/categories'
import { getPresignedUrl } from '../../api/upload'
import { ApiError, uploadToPresignedUrl } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'

const EMPTY_FORM = { title: '', description: '', image: '', category: '', city: '', date: '', location: '' }

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Chandigarh',
  'Indore', 'Nagpur', 'Bhopal',
]

/* ── Icons ── */
const IconPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconEdit = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IconTrash = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/></svg>
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconUpload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400'

const fmtDateTime = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/* ── Add/Edit Modal ── */
function AddEditModal({ editing, categories, onClose, onSave }) {
  const [form, setForm] = useState(editing ? {
    title: editing.title,
    description: editing.description || '',
    image: editing.image || '',
    category: editing.category?._id || '',
    city: editing.city || '',
    date: editing.date ? new Date(editing.date).toISOString().slice(0, 16) : '',
    location: editing.location || '',
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const { presignedUrl, fileUrl } = await getPresignedUrl(file.name, file.type, 'trending-events')
      await uploadToPresignedUrl(presignedUrl, file)
      set('image', fileUrl)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload image.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.image) {
      setError('Upload a poster image.')
      return
    }
    setSaving(true)
    try {
      await onSave({ ...form, date: new Date(form.date).toISOString() })
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save trending event.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-800">{editing ? 'Edit Trending Event' : 'Add Trending Event'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><IconX /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Title</label>
            <input
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="e.g. Wedding Season Special"
              value={form.title} onChange={e => set('title', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Description <span className="normal-case font-normal text-slate-400">(optional)</span></label>
            <textarea
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20 resize-none"
              placeholder="What is this event about?"
              value={form.description} onChange={e => set('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Category</label>
              <select
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
                value={form.category} onChange={e => set('category', e.target.value)}
              >
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}{c.isTrending ? '' : ' (not trending-enabled)'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">City</label>
              <input
                required
                list="trending-event-cities"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="e.g. Agra"
                value={form.city} onChange={e => set('city', e.target.value)}
              />
              <datalist id="trending-event-cities">
                {CITIES.map(city => <option key={city} value={city} />)}
              </datalist>
              <p className="text-[11px] text-slate-400 mt-1">Any city — matched case-insensitively against the viewer's auto-detected location.</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Date &amp; Time</label>
            <input
              required
              type="datetime-local"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
              value={form.date} onChange={e => set('date', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Location</label>
            <input
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="e.g. 199 Oakway Lane, CA 91303"
              value={form.location} onChange={e => set('location', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Poster Image</label>
            <div className="flex gap-2">
              <input
                className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="https://..."
                value={form.image} onChange={e => set('image', e.target.value)}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="shrink-0 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold disabled:opacity-60"
              >
                <IconUpload /> {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
            {form.image && (
              <img src={form.image} alt="" className="w-full h-32 object-cover rounded-xl mt-2 border border-slate-100" />
            )}
          </div>

          {error && (
            <p className="text-sm text-danger font-semibold">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-200">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-brand/90 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function TrendingEventsPage() {
  const [events, setEvents] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadEvents = useCallback(() => {
    setLoading(true)
    setError('')
    getTrendingEvents({ limit: 100 })
      .then(data => setEvents(data.items || []))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load trending events.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { (async () => { await loadEvents() })() }, [loadEvents])
  useEffect(() => { getCategories().then(data => setCategories(data.categories || [])).catch(() => {}) }, [])

  const handleAdd = () => { setEditingEvent(null); setShowModal(true) }
  const handleEdit = event => { setEditingEvent(event); setShowModal(true) }

  const handleToggle = async (id) => {
    const prev = events
    setEvents(es => es.map(e => e._id === id ? { ...e, isActive: !e.isActive } : e))
    try {
      await toggleTrendingEvent(id)
    } catch (err) {
      setEvents(prev)
      setError(err instanceof ApiError ? err.message : 'Could not update trending event.')
    }
  }

  const handleSave = async (form) => {
    const payload = {
      title: form.title,
      description: form.description || undefined,
      image: form.image,
      category: form.category,
      city: form.city,
      date: form.date,
      location: form.location,
    }
    if (editingEvent) {
      await updateTrendingEvent(editingEvent._id, payload)
    } else {
      await createTrendingEvent(payload)
    }
    loadEvents()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTrendingEvent(deleteTarget._id)
      setDeleteTarget(null)
      loadEvents()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete trending event.')
    } finally {
      setDeleting(false)
    }
  }

  const total = events.length
  const active = events.filter(e => e.isActive).length
  const inactive = events.filter(e => !e.isActive).length

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Trending Events</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage the city-wise trending events shown on the user dashboard</p>
        </div>
        <button onClick={handleAdd} className="bg-brand text-white rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2 hover:bg-brand/90">
          <IconPlus /> Add Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {label:'Total Events', value:total, cls:'text-brand'},
          {label:'Active', value:active, cls:'text-success'},
          {label:'Inactive', value:inactive, cls:'text-slate-500'},
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{s.label}</p>
            <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-danger/8 text-danger rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>
      )}

      {/* Grid of event cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 text-sm">Loading trending events...</div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 text-sm">No trending events yet — add the first one.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(event => (
            <div key={event._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative">
                <img src={event.image || FALLBACK_IMG} alt={event.title} className="w-full h-36 object-cover" />
                <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold ${event.isActive ? 'bg-success/90 text-white' : 'bg-slate-500/90 text-white'}`}>
                  {event.isActive ? 'Active' : 'Inactive'}
                </span>
                {!event.category?.isTrending && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-warning/90 text-white">
                    Category not trending
                  </span>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-black text-slate-800 text-base mb-1">{event.title}</h3>
                {event.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{event.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {event.category?.name && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-info/8 text-info">{event.category.name}</span>
                  )}
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand/8 text-brand">{event.city}</span>
                </div>
                <p className="text-xs text-slate-500">{fmtDateTime(event.date)}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{event.location}</p>
              </div>
              <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <button onClick={() => handleEdit(event)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl px-3 py-2 text-xs font-bold hover:bg-slate-200 flex items-center justify-center gap-1.5">
                  <IconEdit /> Edit
                </button>
                <button onClick={() => handleToggle(event._id)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${event.isActive ? 'bg-warning/10 text-warning hover:bg-warning/20' : 'bg-success/10 text-success hover:bg-success/20'}`}>
                  {event.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => setDeleteTarget(event)} className="bg-danger/8 text-danger rounded-xl px-3 py-2 text-xs font-bold hover:bg-danger/15 flex items-center justify-center" title="Delete">
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddEditModal
          editing={editingEvent}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this trending event?"
          message={`"${deleteTarget.title}" will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete Event"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
