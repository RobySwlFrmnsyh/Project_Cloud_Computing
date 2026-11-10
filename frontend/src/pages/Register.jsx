import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { VEHICLES } from '../lib/constants'
import Button from '../components/ui/Button'
import { SelectField, TextField } from '../components/ui/Field'
import Icon from '../components/ui/Icon'
import AuthVehicleArt from '../components/ui/AuthVehicleArt'
import Logo from '../components/ui/Logo'
import { useToast } from '../components/ui/Toast'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[0-9+\s-]{9,16}$/

const initialForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirm: '',
  vehicleType: 'motor',
  plate: '',
}

export default function Register() {
  const { register } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()

  const [role, setRole] = useState('customer')
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [pendingDriver, setPendingDriver] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const updateField = (field) => (event) => {
    const value = field === 'plate' ? event.target.value.toUpperCase() : event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setFormError('')
  }

  const selectRole = (nextRole) => {
    setRole(nextRole)
    setErrors({})
    setFormError('')
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.name.trim()) {
      nextErrors.name = 'Nama lengkap wajib diisi.'
    } else if (form.name.trim().length < 3) {
      nextErrors.name = 'Nama minimal 3 karakter.'
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email wajib diisi.'
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      nextErrors.email = 'Format email belum benar.'
    }

    if (!form.phone.trim()) {
      nextErrors.phone = 'Nomor telepon wajib diisi.'
    } else if (!PHONE_PATTERN.test(form.phone.trim())) {
      nextErrors.phone = 'Nomor telepon tidak valid (9–16 digit).'
    }

    if (!form.password) {
      nextErrors.password = 'Kata sandi wajib diisi.'
    } else if (form.password.length < 8) {
      nextErrors.password = 'Kata sandi minimal 8 karakter.'
    }

    if (form.confirm !== form.password) {
      nextErrors.confirm = 'Konfirmasi kata sandi tidak sama.'
    }

    if (role === 'driver') {
      if (!form.plate.trim()) {
        nextErrors.plate = 'Nomor kendaraan wajib diisi.'
      } else if (form.plate.trim().length < 4) {
        nextErrors.plate = 'Nomor kendaraan terlalu pendek.'
      }
    }

    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setFormError('')

    try {
      const created = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role,
        vehicleType: form.vehicleType,
        plate: form.plate,
      })

      if (created.role === 'driver') {
        setPendingDriver(created)
        push({
          title: 'Pendaftaran driver terkirim',
          message: 'Akun menunggu verifikasi admin sebelum bisa masuk.',
          variant: 'info',
        })
        return
      }

      push({
        title: 'Akun berhasil dibuat',
        message: 'Silakan masuk kembali dengan akun yang baru didaftarkan.',
        variant: 'info',
      })
      navigate('/login', {
        replace: true,
        state: { registeredEmail: created.email },
      })
    } catch (error) {
      setFormError(error.message)
      if (error.errors) {
        setErrors((previous) => ({ ...previous, ...error.errors }))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (pendingDriver) {
    return (
      <div className="auth">
        <aside className="auth__panel">
          <Logo variant="light" />
          <div className="auth__panel-body">
            <span className="pill pill--dark">Alur verifikasi</span>
            <h1>
              Satu langkah lagi untuk <span className="text-accent">mulai</span>.
            </h1>
            <p>
              Akun driver diverifikasi admin agar hanya pengemudi yang valid dapat menerima
              pesanan.
            </p>
          </div>
        </aside>

        <main className="auth__main">
          <div className="auth__card auth__card--center">
            <span className="pending-icon" aria-hidden="true">
              <Icon name="clock" size={28} />
            </span>
            <h2>Pendaftaran driver terkirim</h2>
            <p className="auth__sub">
              Akun <strong>{pendingDriver.name}</strong> ({pendingDriver.email}) menunggu
              verifikasi admin. Setelah disetujui, kamu dapat masuk dan mengaktifkan status
              online.
            </p>

            <div className="notice notice--info">
              <Icon name="info" size={18} />
              <p>
                Proses verifikasi biasanya dilakukan dalam waktu singkat. Kamu akan dapat masuk
                setelah akun dinyatakan aktif.
              </p>
            </div>

            <div className="auth__pending-actions">
              <Button to="/login" variant="outline" block>
                Ke halaman login
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="auth">
      <aside className="auth__panel">
        <Logo variant="light" />
        <div className="auth__panel-body">
          <span className="pill pill--dark">Daftar akun</span>
          <h1>
            Pilih peran, isi data, lalu <span className="text-accent">jalan</span>.
          </h1>
          <p>
            Customer dapat langsung memesan perjalanan. Driver perlu verifikasi admin sebelum
            menerima pesanan.
          </p>
          <AuthVehicleArt />
        </div>
      </aside>

      <main className="auth__main">
        <div className="auth__card auth__card--wide">
          <div className="auth__head">
            <p className="auth__eyebrow">Buat akun baru</p>
            <h2>Bergabung dengan Anter Jemput Teman</h2>
            <p className="auth__sub">Pilih peran akun terlebih dahulu, lalu lengkapi datanya.</p>
          </div>

          <div className="role-switch" role="group" aria-label="Pilih peran akun">
            <button
              type="button"
              className={['role-option', role === 'customer' ? 'is-active' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => selectRole('customer')}
              aria-pressed={role === 'customer'}
            >
              <span className="role-option__icon" aria-hidden="true">
                <Icon name="user" size={18} />
              </span>
              <span className="role-option__text">
                <strong>Customer</strong>
                <small>Pesan perjalanan</small>
              </span>
            </button>
            <button
              type="button"
              className={['role-option', role === 'driver' ? 'is-active' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => selectRole('driver')}
              aria-pressed={role === 'driver'}
            >
              <span className="role-option__icon" aria-hidden="true">
                <Icon name="bike" size={18} />
              </span>
              <span className="role-option__text">
                <strong>Driver</strong>
                <small>Terima pesanan</small>
              </span>
            </button>
          </div>

          {formError ? (
            <div className="alert alert--danger" role="alert">
              <Icon name="alert" size={18} />
              <span>{formError}</span>
            </div>
          ) : null}

          <form className="auth__form" onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <TextField
                id="register-name"
                label="Nama lengkap"
                placeholder="Nama sesuai identitas"
                autoComplete="name"
                value={form.name}
                onChange={updateField('name')}
                error={errors.name}
                required
              />
              <TextField
                id="register-phone"
                label="Nomor telepon"
                placeholder="08xxxxxxxxxx"
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={updateField('phone')}
                error={errors.phone}
                required
              />
            </div>

            <TextField
              id="register-email"
              label="Email"
              type="email"
              placeholder="nama@email.com"
              autoComplete="email"
              icon="mail"
              value={form.email}
              onChange={updateField('email')}
              error={errors.email}
              required
            />

            {role === 'driver' ? (
              <div className="form-row">
                <SelectField
                  id="register-vehicle"
                  label="Jenis kendaraan"
                  value={form.vehicleType}
                  onChange={updateField('vehicleType')}
                  hint="Dapat diubah setelah verifikasi."
                >
                  {VEHICLES.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.label}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  id="register-plate"
                  label="Nomor kendaraan"
                  placeholder="B 1234 XYZ"
                  value={form.plate}
                  onChange={updateField('plate')}
                  error={errors.plate}
                  required
                />
              </div>
            ) : null}

            <div className="form-row">
              <TextField
                id="register-password"
                label="Kata sandi"
                type="password"
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                icon="lock"
                value={form.password}
                onChange={updateField('password')}
                error={errors.password}
                hint="Gunakan kombinasi huruf dan angka."
                required
              />
              <TextField
                id="register-confirm"
                label="Konfirmasi kata sandi"
                type="password"
                placeholder="Ulangi kata sandi"
                autoComplete="new-password"
                icon="lock"
                value={form.confirm}
                onChange={updateField('confirm')}
                error={errors.confirm}
                required
              />
            </div>

            {role === 'driver' ? (
              <div className="notice notice--info">
                <Icon name="shield" size={18} />
                <p>
                  Akun driver berstatus <strong>menunggu verifikasi</strong> setelah mendaftar.
                  Admin perlu menyetujui sebelum driver dapat masuk.
                </p>
              </div>
            ) : null}

            <Button type="submit" size="lg" block disabled={submitting}>
              {submitting
                ? 'Mendaftarkan...'
                : role === 'driver'
                  ? 'Daftar sebagai driver'
                  : 'Daftar sebagai customer'}
            </Button>
          </form>

          <p className="auth__switch">
            Sudah punya akun? <Link to="/login">Masuk di sini</Link>
          </p>
          <p className="auth__back">
            <Link to="/">
              <Icon name="arrow-left" size={15} />
              Kembali ke beranda
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
