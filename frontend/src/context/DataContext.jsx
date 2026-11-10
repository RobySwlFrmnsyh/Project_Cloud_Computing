import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { io } from 'socket.io-client'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { user, refreshUser } = useAuth()
  const [bookings, setBookings] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const [driverLocations, setDriverLocations] = useState({})
  const [notifications, setNotifications] = useState([])
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [notificationsPagination, setNotificationsPagination] = useState(null)
  const socketRef = useRef(null)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!user || user.must_change_password) {
        setBookings([])
        setUsers([])
        setNotifications([])
        setUnreadNotificationCount(0)
        setNotificationsPagination(null)
        setLoading(false)
        return
      }

      if (!silent) setLoading(true)
      setError('')

      try {
        const [bookingsData, usersData, notificationsData] = await Promise.all([
          api.get('/bookings'),
          user.role === 'admin' ? api.get('/users') : Promise.resolve({ users: [] }),
          api.get('/notifications?limit=20'),
        ])

        setBookings(bookingsData.bookings)
        setUsers(usersData.users)
        setNotifications(notificationsData.notifications)
        setUnreadNotificationCount(notificationsData.unread)
        setNotificationsPagination(notificationsData.pagination)

        const persistedLocations = {}
        for (const booking of bookingsData.bookings) {
          if (booking.driver_location) {
            persistedLocations[booking.id] = {
              booking_id: booking.id,
              ...booking.driver_location,
            }
          }
        }
        setDriverLocations((previous) => ({ ...previous, ...persistedLocations }))
      } catch (loadError) {
        if (loadError.status !== 401) {
          setError(loadError.message)
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [user],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!user || user.must_change_password) return undefined

    const handleFocus = () => load({ silent: true })
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user, load])

  const storeBooking = useCallback((booking) => {
    if (!booking?.id) return

    setBookings((previous) => {
      const index = previous.findIndex((item) => item.id === booking.id)
      if (index === -1) return [booking, ...previous]
      const next = [...previous]
      next[index] = booking
      return next
    })

    if (booking.driver_location) {
      setDriverLocations((previous) => ({
        ...previous,
        [booking.id]: {
          booking_id: booking.id,
          ...booking.driver_location,
        },
      }))
    }
  }, [])

  useEffect(() => {
    if (!user || user.must_change_password) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setSocketConnected(false)
      setDriverLocations({})
      setNotifications([])
      setUnreadNotificationCount(0)
      return undefined
    }

    const socket = io({
      path: '/api/socket.io',
      withCredentials: true,
      reconnectionDelayMax: 5000,
    })
    socketRef.current = socket

    const handleConnect = () => {
      setSocketConnected(true)
      load({ silent: true })
    }
    const handleDisconnect = () => setSocketConnected(false)
    const handleBooking = (booking) => {
      if (booking?.id) storeBooking(booking)
    }
    const handleUnavailable = ({ code } = {}) => {
      setBookings((previous) => previous.filter((booking) => booking.id !== code))
    }
    const handleDeleted = ({ code } = {}) => {
      setBookings((previous) => previous.filter((booking) => booking.id !== code))
    }
    const handleLocation = (location) => {
      if (!location?.booking_id) return
      setDriverLocations((previous) => ({
        ...previous,
        [location.booking_id]: location,
      }))
    }
    const handleNotification = (notification) => {
      if (!notification?.id) return
      setNotifications((previous) => [
        notification,
        ...previous.filter((item) => item.id !== notification.id),
      ].slice(0, 50))
      if (!notification.read_at) {
        setUnreadNotificationCount((previous) => previous + 1)
      }
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('booking:updated', handleBooking)
    socket.on('booking:available', handleBooking)
    socket.on('booking:unavailable', handleUnavailable)
    socket.on('booking:deleted', handleDeleted)
    socket.on('driver:location', handleLocation)
    socket.on('notification:new', handleNotification)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('booking:updated', handleBooking)
      socket.off('booking:available', handleBooking)
      socket.off('booking:unavailable', handleUnavailable)
      socket.off('booking:deleted', handleDeleted)
      socket.off('driver:location', handleLocation)
      socket.off('notification:new', handleNotification)
      socket.disconnect()
      if (socketRef.current === socket) socketRef.current = null
    }
  }, [user, load, storeBooking])

  const createBooking = useCallback(
    async (payload) => {
      const data = await api.post('/bookings', payload)
      storeBooking(data.booking)
      return data.booking
    },
    [storeBooking],
  )

  const updateBooking = useCallback(
    async (code, payload) => {
      const data = await api.put(`/bookings/${code}`, payload)
      storeBooking(data.booking)
      return data.booking
    },
    [storeBooking],
  )

  const declineBooking = useCallback(async (code) => {
    const data = await api.post(`/bookings/${code}/decline`)
    setBookings((previous) => previous.filter((booking) => booking.id !== code))
    return data
  }, [])

  const rateBooking = useCallback(
    async (code, payload) => {
      const data = await api.post(`/bookings/${code}/rating`, payload)
      storeBooking(data.booking)
      return data.booking
    },
    [storeBooking],
  )

  const refreshNotifications = useCallback(async () => {
    const data = await api.get('/notifications?limit=20')
    setNotifications(data.notifications)
    setUnreadNotificationCount(data.unread)
    setNotificationsPagination(data.pagination)
    return data
  }, [])

  const markNotificationRead = useCallback(async (notificationId) => {
    const data = await api.patch(`/notifications/${notificationId}/read`)
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === notificationId ? data.notification : notification,
      ),
    )
    setUnreadNotificationCount((previous) => Math.max(0, previous - 1))
    return data.notification
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    const data = await api.patch('/notifications/read-all')
    setNotifications((previous) =>
      previous.map((notification) => ({
        ...notification,
        read_at: notification.read_at ?? new Date().toISOString(),
      })),
    )
    setUnreadNotificationCount(0)
    return data
  }, [])

  const createPayment = useCallback(
    async (code, method) => {
      const data = await api.post(`/bookings/${code}/payment`, { method })
      storeBooking(data.booking)
      return data
    },
    [storeBooking],
  )

  const confirmPayment = useCallback(
    async (code) => {
      const data = await api.post(`/bookings/${code}/payment/confirm`, {})
      storeBooking(data.booking)
      return data
    },
    [storeBooking],
  )

  const shareDriverLocation = useCallback((code, lat, lng) => {
    const socket = socketRef.current
    if (!socket?.connected) {
      return Promise.resolve({
        ok: false,
        message: 'Koneksi realtime belum tersedia.',
      })
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({ ok: false, message: 'Server tidak merespons.' })
      }, 4000)

      socket.emit('driver:location', { code, lat, lng }, (ack) => {
        clearTimeout(timer)
        resolve(ack ?? { ok: false, message: 'Lokasi tidak terkirim.' })
      })
    })
  }, [])

  const acceptBooking = useCallback(
    async (code) => {
      const data = await api.post(`/bookings/${code}/accept`)
      storeBooking(data.booking)
      return data.booking
    },
    [storeBooking],
  )

  const updateBookingStatus = useCallback(
    async (code, status) => {
      const data = await api.patch(`/bookings/${code}/status`, { status })
      storeBooking(data.booking)
      return data.booking
    },
    [storeBooking],
  )

  const cancelBooking = useCallback(
    async (code) => {
      const data = await api.post(`/bookings/${code}/cancel`)
      storeBooking(data.booking)
      return data.booking
    },
    [storeBooking],
  )

  const deleteBooking = useCallback(async (code) => {
    const data = await api.delete(`/bookings/${code}`)
    setBookings((previous) => previous.filter((booking) => booking.id !== code))
    return data
  }, [])

  const verifyDriver = useCallback(
    async (userId, status) => {
      await api.patch(`/drivers/${userId}/verification`, { status })
      await load({ silent: true })
      return true
    },
    [load],
  )

  const setAvailability = useCallback(
    async (availability) => {
      const data = await api.patch('/drivers/me/availability', { availability })
      await refreshUser()
      await load({ silent: true })
      return data.user
    },
    [load, refreshUser],
  )

  const resetUserData = useCallback(
    async (userId) => {
      const data = await api.post(`/admin/users/${userId}/reset`)
      await load({ silent: true })
      return data
    },
    [load],
  )

  const resetUserPassword = useCallback(
    async (userId) => {
      const data = await api.post(`/admin/users/${userId}/reset-password`)
      await load({ silent: true })
      return data
    },
    [load],
  )

  const deleteUser = useCallback(
    async (userId) => {
      const data = await api.delete(`/admin/users/${userId}`)
      await load({ silent: true })
      return data
    },
    [load],
  )

  const value = useMemo(
    () => ({
      bookings,
      users,
      loading,
      error,
      socketConnected,
      driverLocations,
      notifications,
      unreadNotificationCount,
      notificationsPagination,
      refresh: load,
      createBooking,
      updateBooking,
      declineBooking,
      rateBooking,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      createPayment,
      confirmPayment,
      shareDriverLocation,
      acceptBooking,
      updateBookingStatus,
      cancelBooking,
      deleteBooking,
      verifyDriver,
      setAvailability,
      resetUserData,
      resetUserPassword,
      deleteUser,
    }),
    [
      bookings,
      users,
      loading,
      error,
      socketConnected,
      driverLocations,
      notifications,
      unreadNotificationCount,
      notificationsPagination,
      load,
      createBooking,
      updateBooking,
      declineBooking,
      rateBooking,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      createPayment,
      confirmPayment,
      shareDriverLocation,
      acceptBooking,
      updateBookingStatus,
      cancelBooking,
      deleteBooking,
      verifyDriver,
      setAvailability,
      resetUserData,
      resetUserPassword,
      deleteUser,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData harus dipakai di dalam DataProvider')
  }
  return context
}
