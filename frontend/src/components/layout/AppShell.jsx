import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { HOME_PATH, ROLE_LABEL } from '../../lib/constants'
import Avatar from '../ui/Avatar'
import Icon from '../ui/Icon'
import Logo from '../ui/Logo'
import { useToast } from '../ui/Toast'

const NAV = {
  customer: [
    { to: '/app', label: 'Dashboard', icon: 'home', end: true },
    { to: '/app/bookings/new', label: 'Buat Pesanan', icon: 'plus' },
    { to: '/app/history', label: 'Riwayat', icon: 'history' },
    { to: '/app/profile', label: 'Profil', icon: 'user' },
  ],
  driver: [
    { to: '/driver', label: 'Dashboard', icon: 'home', end: true },
    { to: '/driver/history', label: 'Riwayat', icon: 'history' },
    { to: '/driver/profile', label: 'Profil', icon: 'user' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: 'home', end: true },
    { to: '/admin/profile', label: 'Profil', icon: 'user' },
  ],
}

export default function AppShell() {
  const { user, logout } = useAuth()
  const { socketConnected, unreadNotificationCount } = useData()
  const { push } = useToast()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const items = NAV[user.role] ?? []
  const homePath = HOME_PATH[user.role] ?? '/'

  const title = useMemo(() => {
    const match = items.find((item) =>
      item.end ? pathname === item.to : pathname.startsWith(item.to),
    )
    if (match) return match.label
    if (pathname.endsWith('/notifications')) return 'Notifikasi'
    if (pathname === '/app/bookings/new') return 'Buat pesanan'
    if (pathname.endsWith('/edit')) return 'Ubah pesanan'
    if (pathname.endsWith('/payment')) return 'Pembayaran'
    if (pathname.startsWith('/driver/orders/')) return 'Detail pesanan'
    if (pathname.includes('/bookings/')) return 'Detail perjalanan'
    if (pathname.endsWith('/profile')) return 'Profil'
    return 'Dashboard'
  }, [items, pathname])

  const handleLogout = async () => {
    try {
      await logout()
      push({ title: 'Berhasil keluar', message: 'Sesi kamu sudah diakhiri.' })
    } catch {
      push({
        variant: 'error',
        title: 'Gagal keluar',
        message: 'Sesi mungkin sudah berakhir. Silakan masuk kembali.',
      })
    }
    navigate('/login')
  }

  return (
    <div className={['shell', menuOpen ? 'shell--menu-open' : ''].filter(Boolean).join(' ')}>
      <aside className="sidebar" id="app-sidebar" aria-label="Navigasi utama">
        <div className="sidebar__head">
          <Logo variant="light" to={homePath} size="sm" />
        </div>

        <div className="sidebar__user">
          <Avatar name={user.name} size="sm" />
          <div className="sidebar__user-text">
            <p className="sidebar__user-name">{user.name}</p>
            <p className="sidebar__user-role">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>

        <nav className="sidebar__nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                ['sidebar__link', isActive ? 'is-active' : ''].filter(Boolean).join(' ')
              }
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__foot">
          <button type="button" className="sidebar__logout" onClick={handleLogout}>
            <Icon name="logout" size={17} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="shell__overlay"
          aria-label="Tutup menu navigasi"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="shell__body">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn topbar__menu"
            onClick={() => setMenuOpen((previous) => !previous)}
            aria-controls="app-sidebar"
            aria-expanded={menuOpen}
            aria-label="Buka menu navigasi"
          >
            <Icon name="menu" size={20} />
          </button>

          <div className="topbar__title-wrap">
            <p className="topbar__eyebrow">Ruang {ROLE_LABEL[user.role]}</p>
            <h2 className="topbar__title">{title}</h2>
          </div>

          <div className="topbar__actions">
            <Link
              to={`${homePath}/notifications`}
              className="icon-btn topbar__notifications"
              aria-label={`Notifikasi${
                unreadNotificationCount > 0
                  ? `, ${unreadNotificationCount} belum dibaca`
                  : ''
              }`}
            >
              <Icon name="bell" size={19} />
              {unreadNotificationCount > 0 ? (
                <span className="topbar__notification-badge">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              ) : null}
            </Link>
            <span
              className={[
                'topbar__chip',
                socketConnected ? 'topbar__chip--live' : 'topbar__chip--offline',
              ].join(' ')}
              title={
                socketConnected
                  ? 'Pembaruan pesanan diterima secara realtime'
                  : 'Menyambungkan kanal realtime'
              }
            >
              <span className="topbar__chip-dot" aria-hidden="true" />
              {socketConnected ? 'Realtime aktif' : 'Menyambung...'}
            </span>
            <Link to={`${homePath}/profile`} className="topbar__profile">
              <Avatar name={user.name} size="sm" />
              <span className="topbar__profile-name">{user.name.split(' ')[0]}</span>
            </Link>
          </div>
        </header>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
