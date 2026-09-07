import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMyPermissions } from '../api/permissions'

const LEVEL_RANK = { NONE: 0, READ: 1, WRITE: 2, FULL: 3 }

const PermissionsContext = createContext(null)

/**
 * Fetches the current portal session's effective page permissions once per
 * token (re-fetches on login/logout) and shares them between that portal's
 * sidebar and its per-page route guards, instead of every consumer hitting
 * `/admin/permissions/mine` independently.
 */
export function PermissionsProvider({ authToken, children }) {
  const [state, setState] = useState({ permissions: {}, role: null, loading: true })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!authToken) {
        setState({ permissions: {}, role: null, loading: false })
        return
      }
      setState((s) => ({ ...s, loading: true }))
      try {
        const data = await getMyPermissions()
        if (cancelled) return
        setState({ permissions: data.permissions ?? {}, role: data.role ?? null, loading: false })
      } catch {
        if (!cancelled) setState({ permissions: {}, role: null, loading: false })
      }
    })()
    return () => { cancelled = true }
  }, [authToken])

  const can = useCallback((pageId, level = 'READ') => {
    const current = state.permissions[pageId] ?? 'NONE'
    return LEVEL_RANK[current] >= LEVEL_RANK[level]
  }, [state.permissions])

  return (
    <PermissionsContext.Provider value={{ ...state, can }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext)
  if (!ctx) throw new Error('usePermissions must be used within PermissionsProvider')
  return ctx
}
