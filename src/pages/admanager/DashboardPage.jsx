import { useState, useEffect, useCallback } from 'react'
import { getAdManagerDashboard } from '../../api/admanager'
import { ApiError } from '../../api/client'

export default function AdManagerDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getAdManagerDashboard())
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

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">AdManager Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Overview of your promoted ads and ad wallet</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Ads', value: data.totalAds, cls: 'text-brand' },
          { label: 'Active Ads', value: data.activeAds, cls: 'text-success' },
          { label: 'Paused Ads', value: data.pausedAds, cls: 'text-warning' },
          { label: 'Available Coins', value: data.availableCoins, cls: 'text-info' },
          { label: 'Referral Coins', value: data.referralCoins, cls: 'text-info' },
          { label: 'Total Impressions', value: data.totalImpressions, cls: 'text-brand' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{s.label}</p>
            <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
