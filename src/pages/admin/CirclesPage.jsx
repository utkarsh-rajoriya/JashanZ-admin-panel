import { useState, useEffect, useCallback, useRef } from 'react'
import { getCircles, createCircle, updateCircle, toggleCircle, deleteCircle } from '../../api/circles'
import { getCategories } from '../../api/categories'
import { getPresignedUrl } from '../../api/upload'
import { ApiError, uploadToPresignedUrl } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'

const EMPTY_FORM = { name: '', description: '', category: '', city: [], coverImage: '' }

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
const IconChevron = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
const IconUpload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400'

/* ── Multi-select city dropdown ── */
function CityMultiSelect({ selected, onToggle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const summary = selected.length === 0
    ? 'Select cities…'
    : selected.length <= 2
      ? selected.join(', ')
      : `${selected.length} cities selected`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-left outline-none focus:ring-2 focus:ring-brand/20"
      >
        <span className={selected.length === 0 ? 'text-slate-400' : 'text-slate-800 font-semibold'}>{summary}</span>
        <span className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}><IconChevron /></span>
      </button>

      {open && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto p-2">
          {CITIES.map(city => {
            const checked = selected.includes(city)
            return (
              <label
                key={city}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(city)}
                  className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand/30 accent-brand"
                />
                {city}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Add/Edit Modal ── */
function AddEditModal({ editing, categories, onClose, onSave }) {
  const [form, setForm] = useState(editing ? {
    name: editing.name,
    description: editing.description || '',
    category: editing.category?._id || '',
    city: Array.isArray(editing.city) ? editing.city : (editing.city ? [editing.city] : []),
    coverImage: editing.coverImage || '',
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleCity = (city) => {
    setForm(f => ({
      ...f,
      city: f.city.includes(city) ? f.city.filter(c => c !== city) : [...f.city, city],
    }))
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const { presignedUrl, fileUrl } = await getPresignedUrl(file.name, file.type, 'circles')
      await uploadToPresignedUrl(presignedUrl, file)
      set('coverImage', fileUrl)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload image.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.city.length === 0) {
      setError('Select at least one city.')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save circle.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-800">{editing ? 'Edit Event Circle' : 'Add Event Circle'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><IconX /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Circle Name</label>
            <input
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="e.g. Mumbai Party Scene"
              value={form.name} onChange={e => set('name', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Description</label>
            <textarea
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20 resize-none"
              placeholder="What is this circle about?"
              value={form.description} onChange={e => set('description', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Category <span className="normal-case font-normal text-slate-400">(optional)</span></label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
              value={form.category} onChange={e => set('category', e.target.value)}
            >
              <option value="">No category</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Cities <span className="normal-case font-normal text-slate-400">(select at least 1)</span>
            </label>
            <CityMultiSelect selected={form.city} onToggle={toggleCity} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Poster / Cover Image <span className="normal-case font-normal text-slate-400">(optional)</span></label>
            <div className="flex gap-2">
              <input
                className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="https://..."
                value={form.coverImage} onChange={e => set('coverImage', e.target.value)}
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
            {form.coverImage && (
              <img src={form.coverImage} alt="" className="w-full h-32 object-cover rounded-xl mt-2 border border-slate-100" />
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
export default function CirclesPage() {
  const [circles, setCircles] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCircle, setEditingCircle] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadCircles = useCallback(() => {
    setLoading(true)
    setError('')
    getCircles({ limit: 100 })
      .then(data => setCircles(data.items || []))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load event circles.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { (async () => { await loadCircles() })() }, [loadCircles])
  useEffect(() => { getCategories().then(data => setCategories(data.categories || [])).catch(() => {}) }, [])

  const handleAdd = () => { setEditingCircle(null); setShowModal(true) }
  const handleEdit = circle => { setEditingCircle(circle); setShowModal(true) }

  const handleToggle = async (id) => {
    const prev = circles
    setCircles(cs => cs.map(c => c._id === id ? { ...c, isActive: !c.isActive } : c))
    try {
      await toggleCircle(id)
    } catch (err) {
      setCircles(prev)
      setError(err instanceof ApiError ? err.message : 'Could not update circle.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCircle(deleteTarget._id)
      setDeleteTarget(null)
      loadCircles()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete circle.')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async (form) => {
    const payload = {
      name: form.name,
      description: form.description || undefined,
      category: form.category || undefined,
      city: form.city,
      coverImage: form.coverImage || undefined,
    }
    if (editingCircle) {
      await updateCircle(editingCircle._id, payload)
    } else {
      await createCircle(payload)
    }
    loadCircles()
  }

  const total = circles.length
  const active = circles.filter(c => c.isActive).length
  const inactive = circles.filter(c => !c.isActive).length
  const totalMembers = circles.reduce((sum, c) => sum + (c.membersCount || 0), 0)

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Event Circles</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create and manage event circles shown to users on the website and app</p>
        </div>
        <button onClick={handleAdd} className="bg-brand text-white rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2 hover:bg-brand/90">
          <IconPlus /> Add Circle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {label:'Total Circles', value:total, cls:'text-brand'},
          {label:'Active', value:active, cls:'text-success'},
          {label:'Inactive', value:inactive, cls:'text-slate-500'},
          {label:'Total Members', value:totalMembers, cls:'text-info'},
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

      {/* Grid of circle cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 text-sm">Loading event circles...</div>
      ) : circles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 text-sm">No event circles yet — add the first one.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {circles.map(circle => (
            <div key={circle._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative">
                <img src={circle.coverImage || FALLBACK_IMG} alt={circle.name} className="w-full h-36 object-cover" />
                <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold ${circle.isActive ? 'bg-success/90 text-white' : 'bg-slate-500/90 text-white'}`}>
                  {circle.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-black text-slate-800 text-base mb-1">{circle.name}</h3>
                {circle.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{circle.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {circle.category?.name && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-info/8 text-info">{circle.category.name}</span>
                  )}
                  {(circle.city || []).map(city => (
                    <span key={city} className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand/8 text-brand">{city}</span>
                  ))}
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{circle.membersCount || 0} members</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <button onClick={() => handleEdit(circle)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl px-3 py-2 text-xs font-bold hover:bg-slate-200 flex items-center justify-center gap-1.5">
                  <IconEdit /> Edit
                </button>
                <button onClick={() => handleToggle(circle._id)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${circle.isActive ? 'bg-warning/10 text-warning hover:bg-warning/20' : 'bg-success/10 text-success hover:bg-success/20'}`}>
                  {circle.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => setDeleteTarget(circle)} className="bg-danger/8 text-danger rounded-xl px-3 py-2 text-xs font-bold hover:bg-danger/15 flex items-center justify-center" title="Delete">
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddEditModal
          editing={editingCircle}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this event circle?"
          message={`"${deleteTarget.name}" and all its ${deleteTarget.membersCount || 0} member records will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete Circle"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
