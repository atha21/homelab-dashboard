import { useState, useEffect, useRef, useCallback } from 'react'

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/metrics`
const REST_URL = '/api/status/all'
const RECONNECT_DELAY_MS = 3000

/**
 * useMetrics — subscribes to the backend WebSocket stream.
 *
 * Returns:
 *   metrics      — latest merged data object (null while loading)
 *   isConnected  — true while WebSocket is OPEN
 *   error        — string description of the last connection error, or null
 *   clock        — live Date object that ticks every second
 */
export function useMetrics() {
  const [metrics, setMetrics] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const [clock, setClock] = useState(() => new Date())

  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const alive = useRef(true)

  // Live clock — ticks every second
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Seed initial data from REST so the UI isn't empty while WS handshake completes
  const seedFromRest = useCallback(async () => {
    try {
      const res = await fetch(REST_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(`Initial fetch failed: ${err.message}`)
    }
  }, [])

  const connect = useCallback(() => {
    if (!alive.current) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (!alive.current) { ws.close(); return }
      setIsConnected(true)
      setError(null)
    }

    ws.onmessage = (event) => {
      try {
        const incoming = JSON.parse(event.data)
        // Merge incoming data into previous state so disks/ports are preserved
        // when the realtime snapshot omits them (they're now included, but merge is safer)
        setMetrics(prev => ({ ...prev, ...incoming }))
      } catch {
        // malformed frame — skip silently
      }
    }

    ws.onerror = () => {
      setError('WebSocket connection error')
    }

    ws.onclose = () => {
      setIsConnected(false)
      if (!alive.current) return
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
    }
  }, [])

  useEffect(() => {
    alive.current = true
    seedFromRest()
    connect()

    return () => {
      alive.current = false
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [seedFromRest, connect])

  return { metrics, isConnected, error, clock }
}
