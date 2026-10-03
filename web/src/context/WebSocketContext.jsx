import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuth } from '@/context/AuthContext'
import { getToken } from '@/lib/auth-storage'
import { API_URL } from '@/lib/api'

const WebSocketContext = createContext(null)

/**
 * Owns the single STOMP-over-SockJS connection to the backend and hands out subscriptions by
 * destination. Domain contexts (notifications, messages, ...) call `subscribe` instead of each
 * opening their own connection - one socket carries every `/user/queue/*` destination.
 */
export function WebSocketProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const clientRef = useRef(null)
  // destination -> Set<callback>, the subscriptions consumers have asked for so far.
  const listenersRef = useRef(new Map())
  // destination -> the live STOMP subscription currently registered with the broker.
  const activeRef = useRef(new Map())

  const dispatch = (destination, message) => {
    const payload = JSON.parse(message.body)
    listenersRef.current.get(destination)?.forEach((callback) => callback(payload))
  }

  const activateDestination = (client, destination) => {
    if (activeRef.current.has(destination)) return
    activeRef.current.set(destination, client.subscribe(destination, (message) => dispatch(destination, message)))
  }

  useEffect(() => {
    if (!isAuthenticated) {
      activeRef.current.forEach((subscription) => subscription.unsubscribe())
      activeRef.current.clear()
      clientRef.current?.deactivate()
      clientRef.current = null
      return undefined
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_URL}/ws`),
      connectHeaders: { Authorization: `Bearer ${getToken()}` },
      reconnectDelay: 5000,
      onConnect: () => {
        // A reconnect drops every broker-side subscription, so every previously-requested
        // destination needs to be re-registered here, not just on the very first connect.
        activeRef.current.clear()
        listenersRef.current.forEach((_callbacks, destination) => activateDestination(client, destination))
      },
    })
    client.activate()
    clientRef.current = client

    return () => {
      activeRef.current.clear()
      client.deactivate()
    }
  }, [isAuthenticated])

  const subscribe = (destination, callback) => {
    let callbacks = listenersRef.current.get(destination)
    if (!callbacks) {
      callbacks = new Set()
      listenersRef.current.set(destination, callbacks)
    }
    callbacks.add(callback)

    if (clientRef.current?.connected) {
      activateDestination(clientRef.current, destination)
    }

    return () => {
      callbacks.delete(callback)
      // The broker subscription is left in place even if this was the last listener: a route
      // change unmounting and remounting the same consumer should not pay for a resubscribe.
    }
  }

  const value = useMemo(() => ({ subscribe }), [])

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket precisa estar dentro de <WebSocketProvider>')
  }
  return context
}
