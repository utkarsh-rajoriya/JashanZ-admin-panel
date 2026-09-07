import { useState, useEffect, useCallback } from 'react'
import { getCategories, createCategory, updateCategory, toggleCategory, deleteCategory } from '../../api/categories'
import { ApiError } from '../../api/client'
import ConfirmDialog from '../../components/ConfirmDialog'

const SERVICE_TYPES = ['SLOT_BASED', 'PACKAGE', 'TICKET', 'PER_HOUR', 'PER_DAY', 'FIXED_PRICE', 'APPOINTMENT']
const SERVICE_TYPE_LABEL = {
  SLOT_BASED: 'Slot Based',
  PACKAGE: 'Package Based',
  TICKET: 'Ticket Based',
  PER_HOUR: 'Per Hour Based',
  PER_DAY: 'Per Day Based',
  FIXED_PRICE: 'Fixed Price Based',
  APPOINTMENT: 'Appointment Based',
}

const EMPTY_FORM = { name: '', serviceType: SERVICE_TYPES[0], image: '', isTrending: false }

/* ── Icons ── */
const IconPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconEdit = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconTrash = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>

/* ── Add/Edit Modal ── */
function AddEditModal({ editing, onClose, onSave }) {
  const [form, setForm] = useState(editing ? {
    name: editing.name,
    serviceType: editing.serviceType,
    image: editing.image || '',
    isTrending: !!editing.isTrending,
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save category.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-800">{editing ? 'Edit Category' : 'Add Category'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><IconX /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Category Name</label>
            <input
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="e.g. DJ, Photographer..."
              value={form.name} onChange={e => set('name', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Service / Booking Type</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
              value={form.serviceType} onChange={e => set('serviceType', e.target.value)}
            >
              {SERVICE_TYPES.map(t => <option key={t} value={t}>{SERVICE_TYPE_LABEL[t]}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Image URL <span className="normal-case font-normal text-slate-400">(optional)</span></label>
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="https://..."
              value={form.image} onChange={e => set('image', e.target.value)}
            />
          </div>

          <label className="flex items-center justify-between gap-4 bg-slate-50 rounded-xl px-4 py-3 cursor-pointer">
            <div>
              <p className="text-sm font-bold text-slate-800">Show in Trending</p>
              <p className="text-xs text-slate-400 mt-0.5">Lets Trending Events created under this category appear on the user dashboard</p>
            </div>
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand/30 accent-brand shrink-0"
              checked={form.isTrending} onChange={e => set('isTrending', e.target.checked)}
            />
          </label>

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
export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [deleteCat, setDeleteCat] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadCategories = useCallback(() => {
    setLoading(true)
    setError('')
    getCategories()
      .then(data => setCategories(data.categories || []))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load categories.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { (async () => { await loadCategories() })() }, [loadCategories])

  const handleAdd = () => { setEditingCat(null); setShowModal(true) }
  const handleEdit = cat => { setEditingCat(cat); setShowModal(true) }

  const handleToggle = async (id) => {
    const prev = categories
    setCategories(cats => cats.map(c => c._id === id ? { ...c, isActive: !c.isActive } : c))
    try {
      await toggleCategory(id)
    } catch (err) {
      setCategories(prev)
      setError(err instanceof ApiError ? err.message : 'Could not update category.')
    }
  }

  const handleSave = async (form) => {
    if (editingCat) {
      await updateCategory(editingCat._id, form)
    } else {
      await createCategory(form)
    }
    loadCategories()
  }

  const handleDelete = async () => {
    if (!deleteCat) return
    setDeleting(true)
    try {
      await deleteCategory(deleteCat._id)
      setDeleteCat(null)
      loadCategories()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete category.')
    } finally {
      setDeleting(false)
    }
  }

  const total = categories.length
  const active = categories.filter(c => c.isActive).length
  const inactive = categories.filter(c => !c.isActive).length

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Service Categories</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage all service categories and their booking types</p>
        </div>
        <button onClick={handleAdd} className="bg-brand text-white rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2 hover:bg-brand/90">
          <IconPlus /> Add Category
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {label:'Total Categories', value:total, cls:'text-brand'},
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

      {/* Grid of category cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 text-sm">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 text-sm">No categories yet — add the first one.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <span className="w-12 h-12 rounded-xl bg-brand/8 text-brand flex items-center justify-center font-black text-lg">
                      {cat.name?.[0]?.toUpperCase()}
                    </span>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cat.isActive ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'}`}>
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 className="font-black text-slate-800 text-base mb-2">{cat.name}</h3>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-info/8 text-info">{SERVICE_TYPE_LABEL[cat.serviceType] || cat.serviceType}</span>
                  {cat.isTrending && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-warning/10 text-warning">Trending</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <span><strong className="text-slate-800">{cat.businessCount || 0}</strong> businesses</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <button onClick={() => handleEdit(cat)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl px-3 py-2 text-xs font-bold hover:bg-slate-200 flex items-center justify-center gap-1.5">
                  <IconEdit /> Edit
                </button>
                <button onClick={() => handleToggle(cat._id)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${cat.isActive ? 'bg-warning/10 text-warning hover:bg-warning/20' : 'bg-success/10 text-success hover:bg-success/20'}`}>
                  {cat.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => setDeleteCat(cat)} className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-danger/8 text-danger hover:bg-danger/15 transition-colors" title="Delete">
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddEditModal
          editing={editingCat}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {deleteCat && (
        <ConfirmDialog
          title="Delete this category?"
          message={`"${deleteCat.name}" will be permanently and irreversibly deleted — this cannot be undone. It can no longer be picked when a business registers; businesses already using it keep working.`}
          confirmLabel="Delete Category"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteCat(null)}
        />
      )}
    </div>
  )
}
