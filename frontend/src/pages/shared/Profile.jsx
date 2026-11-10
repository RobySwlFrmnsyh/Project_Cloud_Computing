import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../../components/ui/Avatar'
import { AvailabilityBadge, Badge, VerificationBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { TextField } from '../../components/ui/Field'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import Switch from '../../components/ui/Switch'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { DRIVER_VERIFICATION, ROLE_LABEL, VEHICLE_LABEL } from '../../lib/constants'
import { formatCurrency, formatDate } from '../../lib/format'

const PHONE_PATTERN = /^[0-9+\s-]{9,16}$/

const PASSWORD_FIELD_MAP = {
  currentPassword: 'current',
  newPassword: 'next',
}

const PROFILE_FIELD_MAP = {
  name: 'name',
  phone: 'phone',
}

export default function Profile() {
  const { user, updateProfile, changePassword, logout } = useAuth()
  const { bookings, setAvailability } = useData()
  const { push } = useToast()
  const navigate = useNavigate()

  const [profileForm, setProfileForm] = useState({ name: user.name, phone: user.phone })
  const [profileErrors, setProfileErrors] = useState({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingAvailability, setSavingAvailability] = useState(false)

  const vehicle = user.vehicle
  const isAdmin = user.role === 'admin'

  const myBookings = bookings.filter((booking) => {
    if (user.role === 'driver') return booking.driver_id === user.id
    if (user.role === 'customer') return booking.customer_id === user.id
    return true
  })
  const paidTotal = myBookings
    .filter((booking) => booking.payment_status === 'paid')
    .reduce((total, booking) => total + booking.estimated_fare, 0)

  const handleProfileSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!profileForm.name.trim()) nextErrors.name = 'Nama wajib diisi.'
    else if (profileForm.name.trim().length < 3) nextErrors.name = 'Nama minimal 3 karakter.'
    if (!profileForm.phone.trim()) nextErrors.phone = 'Nomor telepon wajib diisi.'
    else if (!PHONE_PATTERN.test(profileForm.phone.trim())) {
      nextErrors.phone = 'Nomor telepon tidak valid.'
    }

    setProfileErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSavingProfile(true)
    try {
      await updateProfile({
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
      })
      push({
        title: 'Profil diperbarui',
        message: 'Perubahan tersimpan di database.',
      })
    } catch (error) {
      if (error.errors) {
        const mapped = {}
        for (const [field, message] of Object.entries(error.errors)) {
          mapped[PROFILE_FIELD_MAP[field] ?? field] = message
        }
        setProfileErrors(mapped)
      }
      push({ variant: 'error', title: 'Gagal menyimpan profil', message: error.message })
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!passwordForm.current) {
      nextErrors.current = 'Kata sandi saat ini wajib diisi.'
    }
    if (!passwordForm.next) {
      nextErrors.next = 'Kata sandi baru wajib diisi.'
    } else if (passwordForm.next.length < 8) {
      nextErrors.next = 'Kata sandi minimal 8 karakter.'
    } else if (passwordForm.next === passwordForm.current) {
      nextErrors.next = 'Kata sandi baru harus berbeda dari kata sandi saat ini.'
    }
    if (passwordForm.confirm !== passwordForm.next) {
      nextErrors.confirm = 'Konfirmasi kata sandi tidak sama.'
    }

    setPasswordErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSavingPassword(true)
    try {
      await changePassword(passwordForm.current, passwordForm.next)
      setPasswordForm({ current: '', next: '', confirm: '' })
      push({
        title: 'Kata sandi diperbarui',
        message: 'Gunakan kata sandi baru saat masuk berikutnya.',
      })
    } catch (error) {
      if (error.errors) {
        const mapped = {}
        for (const [field, message] of Object.entries(error.errors)) {
          mapped[PASSWORD_FIELD_MAP[field] ?? field] = message
        }
        setPasswordErrors(mapped)
      }
      push({ variant: 'error', title: 'Gagal memperbarui kata sandi', message: error.message })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleAvailability = async (checked) => {
    if (!vehicle) return

    setSavingAvailability(true)
    try {
      await setAvailability(checked ? 'online' : 'offline')
      push({
        title: checked ? 'Status online aktif' : 'Status offline aktif',
        message: checked
          ? 'Pesanan baru akan muncul pada dashboard driver.'
          : 'Kamu tidak menerima pesanan baru sampai online kembali.',
        variant: 'info',
      })
    } catch (error) {
      push({ variant: 'error', title: 'Gagal mengubah status', message: error.message })
    } finally {
      setSavingAvailability(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      push({ title: 'Berhasil keluar' })
    } catch {
      push({
        variant: 'error',
        title: 'Gagal keluar',
        message: 'Sesi mungkin sudah berakhir.',
      })
    }
    navigate('/login')
  }

  const verification = vehicle ? DRIVER_VERIFICATION[vehicle.verification_status] : null

  return (
    <>
      <PageHeader
        eyebrow="Profil"
        title="Profil pengguna"
        description="Kelola data akun, keamanan, dan ketersediaan driver."
      />

      <Card className="profile-head">
        <Avatar name={user.name} size="xl" />
        <div className="profile-head__main">
          <div className="profile-head__name-row">
            <h2>{user.name}</h2>
            <Badge tone="neutral">{ROLE_LABEL[user.role]}</Badge>
            {vehicle ? (
              <VerificationBadge status={vehicle.verification_status ?? 'pending'} />
            ) : null}
          </div>
          <p className="profile-head__meta">
            <Icon name="mail" size={15} />
            {user.email}
            <span className="profile-head__sep" aria-hidden="true">
              ·
            </span>
            <Icon name="phone" size={15} />
            {user.phone}
          </p>
          <p className="profile-head__meta">
            <Icon name="calendar" size={15} />
            Bergabung {formatDate(user.created_at)}
          </p>
        </div>
        <div className="profile-head__stats">
          <div>
            <span>Pesanan</span>
            <strong>{myBookings.length}</strong>
          </div>
          <div>
            <span>{user.role === 'driver' ? 'Pendapatan lunas' : 'Total lunas'}</span>
            <strong>{formatCurrency(paidTotal)}</strong>
          </div>
        </div>
      </Card>

      <div className="profile-grid">
        <div className="profile-main">
          <Card>
            <CardHeader
              title="Data akun"
              subtitle="Perbarui nama dan nomor telepon akunmu."
            />
            <form className="form-stack" onSubmit={handleProfileSubmit} noValidate>
              <TextField
                id="profile-name"
                label="Nama lengkap"
                value={profileForm.name}
                onChange={(event) => {
                  setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                  setProfileErrors((prev) => ({ ...prev, name: undefined }))
                }}
                error={profileErrors.name}
                disabled={savingProfile}
                required
              />
              <div className="form-row">
                <TextField
                  id="profile-phone"
                  label="Nomor telepon"
                  value={profileForm.phone}
                  onChange={(event) => {
                    setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
                    setProfileErrors((prev) => ({ ...prev, phone: undefined }))
                  }}
                  error={profileErrors.phone}
                  inputMode="tel"
                  disabled={savingProfile}
                  required
                />
                <TextField
                  id="profile-email"
                  label="Email"
                  value={user.email}
                  readOnly
                  disabled
                  hint="Email tidak dapat diubah dari halaman ini."
                />
              </div>
              <div className="form-actions">
                <Button type="submit" icon="check" disabled={savingProfile}>
                  {savingProfile ? 'Menyimpan...' : 'Simpan perubahan'}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader
              title="Keamanan akun"
              subtitle="Kata sandi di-hash dengan bcrypt dan tidak pernah dikirim balik ke browser."
            />
            <form className="form-stack" onSubmit={handlePasswordSubmit} noValidate>
              <TextField
                id="current-password"
                label="Kata sandi saat ini"
                type="password"
                value={passwordForm.current}
                onChange={(event) => {
                  setPasswordForm((prev) => ({ ...prev, current: event.target.value }))
                  setPasswordErrors((prev) => ({ ...prev, current: undefined }))
                }}
                error={passwordErrors.current}
                autoComplete="current-password"
                disabled={savingPassword}
                required
              />
              <div className="form-row">
                <TextField
                  id="new-password"
                  label="Kata sandi baru"
                  type="password"
                  value={passwordForm.next}
                  onChange={(event) => {
                    setPasswordForm((prev) => ({ ...prev, next: event.target.value }))
                    setPasswordErrors((prev) => ({ ...prev, next: undefined }))
                  }}
                  error={passwordErrors.next}
                  autoComplete="new-password"
                  hint="Minimal 8 karakter."
                  disabled={savingPassword}
                  required
                />
                <TextField
                  id="confirm-password"
                  label="Konfirmasi kata sandi"
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(event) => {
                    setPasswordForm((prev) => ({ ...prev, confirm: event.target.value }))
                    setPasswordErrors((prev) => ({ ...prev, confirm: undefined }))
                  }}
                  error={passwordErrors.confirm}
                  autoComplete="new-password"
                  disabled={savingPassword}
                  required
                />
              </div>
              <div className="form-actions">
                <Button type="submit" variant="outline" icon="lock" disabled={savingPassword}>
                  {savingPassword ? 'Menyimpan...' : 'Perbarui kata sandi'}
                </Button>
              </div>
            </form>
          </Card>

          {vehicle ? (
            <Card>
              <CardHeader
                title="Kendaraan dan ketersediaan"
                subtitle="Perubahan kendaraan memerlukan verifikasi admin."
              />
              <dl className="summary-list">
                <div className="summary-row">
                  <dt>Jenis kendaraan</dt>
                  <dd>{VEHICLE_LABEL[vehicle.type] ?? vehicle.type}</dd>
                </div>
                <div className="summary-row">
                  <dt>Nomor kendaraan</dt>
                  <dd>{vehicle.plate}</dd>
                </div>
                <div className="summary-row">
                  <dt>Verifikasi</dt>
                  <dd>
                    <VerificationBadge status={vehicle.verification_status ?? 'pending'} />
                  </dd>
                </div>
                <div className="summary-row">
                  <dt>Ketersediaan</dt>
                  <dd>
                    <AvailabilityBadge status={vehicle.availability_status} />
                  </dd>
                </div>
              </dl>
              {verification ? <p className="card__text">{verification.description}</p> : null}
              <Switch
                checked={vehicle.availability_status === 'online'}
                onChange={handleAvailability}
                label="Status online"
                description={
                  savingAvailability
                    ? 'Menyimpan...'
                    : 'Aktifkan agar pesanan baru bisa diterima.'
                }
                disabled={vehicle.verification_status !== 'approved' || savingAvailability}
              />
            </Card>
          ) : null}
        </div>

        <aside className="profile-side">
          <Card className="card--tint">
            <CardHeader title="Data dan keamanan" />
            <p className="card__text">
              Profil, pesanan, dan pembayaran tersimpan dengan aman serta hanya dapat diakses
              sesuai peranmu.
            </p>
            <ul className="check-list">
              <li>
                <Icon name="check" size={14} />
                Validasi ganda: browser dan server
              </li>
              <li>
                <Icon name="check" size={14} />
                Otorisasi per peran di setiap endpoint
              </li>
              <li>
                <Icon name="check" size={14} />
                Data bertahan setelah server restart
              </li>
            </ul>
          </Card>

          <Card>
            <CardHeader title="Sesi dan akun" />
            <p className="card__text">
              {isAdmin
                ? 'Reset dan hapus data akun customer atau driver dilakukan per akun melalui Dashboard admin → tab Pengguna.'
                : 'Hubungi admin jika data akunmu perlu direset atau akunmu dihapus.'}
            </p>
            <div className="form-stack">
              <Button variant="danger" icon="logout" block onClick={handleLogout}>
                Keluar dari akun
              </Button>
            </div>
          </Card>
        </aside>
      </div>

    </>
  )
}
