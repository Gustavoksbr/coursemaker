import { createContext, useContext, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useWebSocket } from '@/context/WebSocketContext'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationKeys,
  unreadCount,
} from '@/api/notifications'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const { subscribe } = useWebSocket()
  const queryClient = useQueryClient()

  const { data: page, isPending } = useQuery({
    queryKey: notificationKeys.list,
    queryFn: () => listNotifications(0, 20),
    enabled: isAuthenticated,
  })

  const { data: unread } = useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: unreadCount,
    enabled: isAuthenticated,
  })

  // Live push: merges every incoming notification straight into the react-query caches so the
  // bell updates with no refetch. The connection itself is owned by WebSocketProvider.
  useEffect(() => {
    if (!isAuthenticated) return undefined

    return subscribe('/user/queue/notifications', (notification) => {
      queryClient.setQueryData(notificationKeys.list, (current) => {
        if (!current) return current
        return { ...current, items: [notification, ...current.items] }
      })
      queryClient.setQueryData(notificationKeys.unreadCount, (current) => ({
        count: (current?.count ?? 0) + 1,
      }))
    })
  }, [isAuthenticated, subscribe, queryClient])

  const { mutate: markRead } = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onMutate: (id) => {
      queryClient.setQueryData(notificationKeys.list, (current) => {
        if (!current) return current
        let wasUnread = false
        const items = current.items.map((item) => {
          if (item.id !== id) return item
          wasUnread = !item.read
          return { ...item, read: true }
        })
        if (wasUnread) {
          queryClient.setQueryData(notificationKeys.unreadCount, (count) => ({
            count: Math.max(0, (count?.count ?? 1) - 1),
          }))
        }
        return { ...current, items }
      })
    },
  })

  const { mutate: markAllRead } = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: () => {
      queryClient.setQueryData(notificationKeys.list, (current) => {
        if (!current) return current
        return { ...current, items: current.items.map((item) => ({ ...item, read: true })) }
      })
      queryClient.setQueryData(notificationKeys.unreadCount, { count: 0 })
    },
  })

  const value = useMemo(
    () => ({
      notifications: page?.items ?? [],
      loading: isPending,
      unreadCount: unread?.count ?? 0,
      markRead,
      markAllRead,
    }),
    [page, isPending, unread, markRead, markAllRead],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications precisa estar dentro de <NotificationProvider>')
  }
  return context
}
