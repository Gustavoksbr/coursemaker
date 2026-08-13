import { createContext, useContext, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useWebSocket } from '@/context/WebSocketContext'
import { messageKeys, messagesUnreadCount } from '@/api/messages'

const MessagingContext = createContext(null)

/** Patches a message in place inside a cached thread page, if that thread happens to be cached. */
function patchThreadMessage(queryClient, nickname, message) {
  queryClient.setQueryData(messageKeys.thread(nickname), (current) => {
    if (!current) return current
    const items = current.items.map((item) => (item.id === message.id ? message : item))
    return { ...current, items }
  })
}

export function MessagingProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const { subscribe } = useWebSocket()
  const queryClient = useQueryClient()

  const { data: unread } = useQuery({
    queryKey: messageKeys.unreadCount,
    queryFn: messagesUnreadCount,
    enabled: isAuthenticated,
  })

  // Live push: a message event always comes from the OTHER party (only the recipient is pushed
  // to - the sender's own tab already updated from its HTTP response), so `message.sender` is
  // always the conversation partner from this viewer's point of view.
  useEffect(() => {
    if (!isAuthenticated) return undefined

    return subscribe('/user/queue/messages', ({ type, message }) => {
      const nickname = message.sender.nickname

      if (type === 'NEW_MESSAGE') {
        queryClient.setQueryData(messageKeys.thread(nickname), (current) => {
          if (!current) return current
          return { ...current, items: [message, ...current.items] }
        })
        queryClient.setQueryData(messageKeys.unreadCount, (current) => ({
          count: (current?.count ?? 0) + 1,
        }))
        // The conversation list needs a new row (first message ever) or a bumped/reordered one;
        // both are simplest handled by refetching rather than hand-patching the summary shape.
        queryClient.invalidateQueries({ queryKey: messageKeys.conversations })
      } else {
        patchThreadMessage(queryClient, nickname, message)
        queryClient.invalidateQueries({ queryKey: messageKeys.conversations })
      }
    })
  }, [isAuthenticated, subscribe, queryClient])

  const value = useMemo(() => ({ unreadCount: unread?.count ?? 0 }), [unread])

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
}

export function useMessaging() {
  const context = useContext(MessagingContext)
  if (!context) {
    throw new Error('useMessaging precisa estar dentro de <MessagingProvider>')
  }
  return context
}
