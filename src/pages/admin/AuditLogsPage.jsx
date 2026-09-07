import { useState, useEffect, useCallback } from 'react'
import { getAuditLogs } from '../../api/auditLogs'
import { ApiError } from '../../api/client'

const MODULES = [
  'Businesses', 'Creators', 'Categories', 'Event Circles', 'Commission', 'Settlements',
  'Wallet', 'Ads', 'Banners', 'Team', 'Config', 'Customers', 'Content Moderation',
]
const ROLE_GROUPS = ['Admin', 'Support', 'Finance']

const ROLE_STYLES = {
  Admin: 'bg-brand/8 text-brand',
  Support: 'bg-success/8 text-success',
  Finance: 'bg-warning/8 text-warning',
}

const fmtDateTime = (d) => {
  if (!d) return { date: '—', time: '' }
  const dt = new Date(d)
  return {
    date: dt.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' }),
    time: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
  }
}

const csvEscape = (v) => {
  const s = v === undefined || v === null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/* ── Icons ── */
const IconDownload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
const IconArrow = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>

/* ── Main Page ── */
export default function AuditLogsPage() {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState({ total: 0, adminCount: 0, supportCount: 0, financeCount: 0 })
  const [pagination, setPagination] = useState({ total: 0, page: 1 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    getAuditLogs({ page, limit: 20, module: moduleFilter, roleGroup: roleFilter, search: debouncedSearch, date: dateFilter })
      .then(data => {
        setItems(data.items || [])
        setStats(data.stats || { total: 0, adminCount: 0, supportCount: 0, financeCount: 0 })
        setPagination(data.pagination)
      })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Could not load audit logs.'))
      .finally(() => setLoading(false))
  }, [page, moduleFilter, roleFilter, debouncedSearch, dateFilter])

  useEffect(() => { (async () => { await load() })() }, [load])

  const clearFilters = () => {
    setSearch('')
    setModuleFilter('')
    setRoleFilter('')
    setDateFilter('')
    setPage(1)
  }
  const hasFilters = search || moduleFilter || roleFilter || dateFilter

  const handleExport = async () => {
    setExporting(true)
    setError('')
    try {
      const data = await getAuditLogs({ page: 1, limit: 1000, module: moduleFilter, roleGroup: roleFilter, search: debouncedSearch, date: dateFilter })
      const rows = data.items || []
      const header = ['Log ID', 'User', 'Role', 'Module', 'Action', 'Target', 'Old Value', 'New Value', 'IP Address', 'Date & Time']
      const lines = [header.map(csvEscape).join(',')]
      for (const log of rows) {
        lines.push([
          log._id, log.actorUsername, log.actorRole, log.module, log.action,
          log.targetLabel || '', log.oldValue ?? '', log.newValue ?? '', log.ipAddress || '',
          new Date(log.createdAt).toISOString(),
        ].map(csvEscape).join(','))
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not export logs.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Full trail of all admin actions across the platform</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="bg-brand text-white rounded-xl px-4 py-2 text-sm font-bold flex items-center gap-2 hover:bg-brand/90 disabled:opacity-50">
          <IconDownload /> {exporting ? 'Exporting…' : 'Export Logs'}
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Log Entries', value: stats.total, cls: 'text-brand' },
          { label: 'Admin Actions', value: stats.adminCount, cls: 'text-brand' },
          { label: 'Support Actions', value: stats.supportCount, cls: 'text-success' },
          { label: 'Finance Actions', value: stats.financeCount, cls: 'text-warning' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{s.label}</p>
            <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <input
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20 flex-1 min-w-[200px]"
          placeholder="Search by action, user, or target..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(1) }}>
          <option value="">All Modules</option>
          {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}>
          <option value="">All Roles</option>
          {ROLE_GROUPS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input
          type="date"
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand/20"
          value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1) }}
        />
        {hasFilters && (
          <button onClick={clearFilters} className="bg-slate-100 text-slate-600 rounded-xl px-3 py-2.5 text-xs font-bold hover:bg-slate-200">
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="bg-danger/8 text-danger rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr>
                {['Log ID', 'User', 'Module', 'Action', 'Target', 'Change', 'IP Address', 'Date & Time'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">No audit logs match your filters</td></tr>
              ) : items.map(log => {
                const { date, time } = fmtDateTime(log.createdAt)
                return (
                  <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[11px] text-slate-400">{log._id.slice(-8).toUpperCase()}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-xs font-bold text-slate-800 leading-tight">{log.actorUsername}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${ROLE_STYLES[log.roleGroup] || 'bg-slate-100 text-slate-500'}`}>{log.roleGroup}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap bg-info/8 text-info">{log.module}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-slate-700 whitespace-nowrap">{log.action}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-xs text-slate-600 max-w-[140px] truncate" title={log.targetLabel}>{log.targetLabel || '—'}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      {(log.oldValue !== undefined || log.newValue !== undefined) ? (
                        <div className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                          <span className="text-slate-400 font-mono">{log.oldValue ?? '—'}</span>
                          <span className="text-slate-300"><IconArrow /></span>
                          <span className="font-bold text-slate-700 font-mono">{log.newValue ?? '—'}</span>
                        </div>
                      ) : <span className="text-[11px] text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[11px] text-slate-500">{log.ipAddress || '—'}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">{date}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{time}</p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
          <span>Showing {items.length} of {pagination.total} log entries</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Prev</button>
            <span className="font-semibold text-slate-500">Page {pagination.page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNextPage} className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
