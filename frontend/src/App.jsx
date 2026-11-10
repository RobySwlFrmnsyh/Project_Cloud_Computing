import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import RequireRole from './components/layout/RequireRole'
import PageLoader from './components/ui/PageLoader'
import { useAuth } from './context/AuthContext'
import ChangeTemporaryPassword from './pages/ChangeTemporaryPassword'
import Landing from './pages/Landing'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Register from './pages/Register'
import AdminDashboard from './pages/admin/AdminDashboard'
import BookingHistory from './pages/customer/BookingHistory'
import CreateBooking from './pages/customer/CreateBooking'
import CustomerDashboard from './pages/customer/CustomerDashboard'
import Payment from './pages/customer/Payment'
import TripDetail from './pages/customer/TripDetail'
import DriverDashboard from './pages/driver/DriverDashboard'
import DriverHistory from './pages/driver/DriverHistory'
import DriverOrderDetail from './pages/driver/DriverOrderDetail'
import Notifications from './pages/shared/Notifications'
import Profile from './pages/shared/Profile'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default function App() {
  const { loading, bootError } = useAuth()

  if (loading) {
    return <PageLoader full label="Menghubungkan ke server..." />
  }

  return (
    <>
      <ScrollToTop />
      {bootError ? (
        <div className="boot-alert" role="alert">
          <strong>Server belum terhubung.</strong> {bootError}
        </div>
      ) : null}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/change-password" element={<ChangeTemporaryPassword />} />

        <Route
          path="/app"
          element={
            <RequireRole role="customer">
              <AppShell />
            </RequireRole>
          }
        >
          <Route index element={<CustomerDashboard />} />
          <Route path="bookings/new" element={<CreateBooking />} />
          <Route path="bookings/:bookingId/edit" element={<CreateBooking />} />
          <Route path="bookings/:bookingId" element={<TripDetail />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="bookings/:bookingId/payment" element={<Payment />} />
          <Route path="history" element={<BookingHistory />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route
          path="/driver"
          element={
            <RequireRole role="driver">
              <AppShell />
            </RequireRole>
          }
        >
          <Route index element={<DriverDashboard />} />
          <Route path="history" element={<DriverHistory />} />
          <Route path="orders/:bookingId" element={<DriverOrderDetail />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <AppShell />
            </RequireRole>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
