import { useState, useEffect, useCallback } from 'react'
import { listStaff, createStaff, updateStaff, toggleStaff, deleteStaff, getStaffPermissions, updateStaffPermissions } from '../api/staff'
import { ApiError } from '../api/client'

const IconPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconEdit = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IconSliders = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
const IconBan = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
const IconTrash = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

const LEVELS = [
  { value: 'NONE', label: 'None', cls: 'text-slate-400 bg-slate-50 border-slate-200' },
  { value: 'READ', label: 'View', cls: 'text-info bg-info/8 border-info/25' },
  { value: 'WRITE', label: 'Edit', cls: 'text-warning bg-warning/8 border-warning/25' },
  { value: 'FULL', label: 'Full', cls: 'text-success bg-success/8 border-success/25' },
]
const LEVEL_ACTIVE_CLS = {
  NONE: 'text-slate-600 bg-slate-200 border-slate-300',
  READ: 'text-white bg-info border-info',
  WRITE: 'text-white bg-warning border-warning',
  FULL: 'text-white bg-success border-success',
}
const PORTAL_LABELS = { ADMIN: 'Admin Portal', SUPPORT: 'Support Portal', FINANCE: 'Finance Portal' }

/** Add User Modal — name + username + password only. Role is fixed per portal (not chosen); fine-grained access is set afterwards via "Manage". */
function AddUserModal({ entityLabel, createRole, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', username: '', password: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createStaff({ ...form, role: createRole })
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-800">Add {entityLabel}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><IconX /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Name</label>
            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" placeholder="e.g. Priya Sharma" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Username</label>
            <input required minLength={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" placeholder="e.g. priya_support" value={form.username} onChange={e => set('username', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Password</label>
            <input required minLength={8} type="password" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" placeholder="Min. 8 characters" value={form.password} onChange={e => set('password', e.target.value)} />
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">Page access can be set afterwards from the <strong>Manage</strong> action on this user's row.</p>

          {error && <p className="text-sm text-danger font-semibold">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-200">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-brand/90 disabled:opacity-50">{saving ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** Edit User Modal — name + username always, password only if the admin wants to change it. */
function EditUserModal({ user, entityLabel, onClose, onUpdated }) {
  const [form, setForm] = useState({ name: user.name ?? '', username: user.username, password: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = { name: form.name, username: form.username }
      if (form.password) payload.password = form.password
      await updateStaff(user._id, payload)
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-800">Edit {entityLabel}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><IconX /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Name</label>
            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Username</label>
            <input required minLength={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={form.username} onChange={e => set('username', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">New Password</label>
            <input minLength={8} type="password" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" placeholder="Leave blank to keep current password" value={form.password} onChange={e => set('password', e.target.value)} />
          </div>

          {error && <p className="text-sm text-danger font-semibold">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-200">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-brand/90 disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** Manage Permissions Modal — per-page NONE/View/Edit/Full toggles for one specific user, across all 3 portals. */
function ManagePermissionsModal({ user, onClose, onSaved }) {
  const [pages, setPages] = useState([])
  const [levels, setLevels] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await getStaffPermissions(user._id)
        if (cancelled) return
        setPages(data.pages)
        setLevels(data.permissions ?? {})
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load permissions.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user._id])

  const setLevel = (pageId, level) => setLevels(l => ({ ...l, [pageId]: level }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await updateStaffPermissions(user._id, levels)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save permissions.')
    } finally {
      setSaving(false)
    }
  }

  const groups = pages.reduce((acc, p) => {
    (acc[p.portal] ??= []).push(p)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-black text-slate-800">Manage Access — {user.name || user.username}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Toggle exactly which pages this person can see, and whether they can only view or also edit</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><IconX /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-12">Loading...</p>
          ) : (
            Object.entries(groups).map(([portal, portalPages]) => (
              <div key={portal}>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">{PORTAL_LABELS[portal] ?? portal}</p>
                <div className="space-y-1.5">
                  {portalPages.map(page => {
                    const current = levels[page.id] ?? 'NONE'
                    return (
                      <div key={page.id} className="flex items-center justify-between gap-4 px-3 py-2 rounded-xl bg-slate-50/60">
                        <span className="text-sm font-semibold text-slate-700">{page.label}</span>
                        <div className="flex gap-1 shrink-0">
                          {LEVELS.map(lvl => (
                            <button
                              key={lvl.value}
                              type="button"
                              onClick={() => setLevel(page.id, lvl.value)}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors ${current === lvl.value ? LEVEL_ACTIVE_CLS[lvl.value] : lvl.cls}`}
                            >
                              {lvl.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          {error && <p className="text-sm text-danger font-semibold mb-3">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-slate-200">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving || loading} className="flex-1 bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-brand/90 disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Shared list/create/manage/toggle/delete UI for staff accounts scoped to a
 * portal's role-set. Support Users and Finance Users pages are thin wrappers
 * around this with different `roles`/`createRole`. There is no role picker —
 * every user created here gets `createRole`; per-user page access is set
 * afterwards via the "Manage" action.
 */
export default function StaffUsersPage({ title, subtitle, roles, createRole, entityLabel }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [managingUser, setManagingUser] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listStaff(roles.map(r => r.value))
      setUsers(data.staff)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [roles])

  useEffect(() => { (async () => { await fetchUsers() })() }, [fetchUsers])

  const handleToggle = async id => {
    setBusyId(id)
    try {
      await toggleStaff(id)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update status.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async user => {
    if (!window.confirm(`Delete ${user.name || user.username}? This cannot be undone.`)) return
    setBusyId(user._id)
    try {
      await deleteStaff(user._id)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete user.')
    } finally {
      setBusyId(null)
    }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || u.username.toLowerCase().includes(q) || (u.name ?? '').toLowerCase().includes(q)
  })
  const total = users.length
  const active = users.filter(u => u.isActive).length
  const inactive = total - active
  const roleMeta = Object.fromEntries(roles.map(r => [r.value, r]))

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: `Total ${entityLabel}s`, value: total, cls: 'text-brand' },
          { label: 'Active', value: active, cls: 'text-success' },
          { label: 'Inactive', value: inactive, cls: 'text-slate-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{s.label}</p>
            <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <input
          className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20 flex-1"
          placeholder="Search by name or username..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <button onClick={() => setShowAddModal(true)} className="bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 hover:bg-brand/90 whitespace-nowrap">
          <IconPlus /> Add {entityLabel}
        </button>
      </div>

      {error && <p className="text-sm text-danger font-semibold">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr>
                {['Name', 'Username', 'Role', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No {entityLabel.toLowerCase()}s found</td></tr>
              ) : filtered.map(u => {
                const meta = roleMeta[u.role]
                return (
                  <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-xs text-slate-800">{u.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{u.username}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${meta?.badgeClass ?? 'bg-slate-100 text-slate-500'}`}>{meta?.label ?? u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.isActive ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingUser(u)} disabled={busyId===u._id} className="w-7 h-7 flex items-center justify-center rounded-lg bg-info/8 text-info hover:bg-info/15 disabled:opacity-50" title="Edit"><IconEdit /></button>
                        <button onClick={() => setManagingUser(u)} disabled={busyId===u._id} className="w-7 h-7 flex items-center justify-center rounded-lg bg-brand/8 text-brand hover:bg-brand/15 disabled:opacity-50" title="Manage access"><IconSliders /></button>
                        <button onClick={() => handleToggle(u._id)} disabled={busyId===u._id} className="w-7 h-7 flex items-center justify-center rounded-lg bg-warning/8 text-warning hover:bg-warning/15 disabled:opacity-50" title={u.isActive ? 'Deactivate' : 'Activate'}><IconBan /></button>
                        <button onClick={() => handleDelete(u)} disabled={busyId===u._id} className="w-7 h-7 flex items-center justify-center rounded-lg bg-danger/8 text-danger hover:bg-danger/15 disabled:opacity-50" title="Delete"><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          Showing {filtered.length} of {total} {entityLabel.toLowerCase()}s
        </div>
      </div>

      {showAddModal && <AddUserModal entityLabel={entityLabel} createRole={createRole} onClose={() => setShowAddModal(false)} onCreated={fetchUsers} />}
      {editingUser && <EditUserModal user={editingUser} entityLabel={entityLabel} onClose={() => setEditingUser(null)} onUpdated={fetchUsers} />}
      {managingUser && <ManagePermissionsModal user={managingUser} onClose={() => setManagingUser(null)} onSaved={fetchUsers} />}
    </div>
  )
}
