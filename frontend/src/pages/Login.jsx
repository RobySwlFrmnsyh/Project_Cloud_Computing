import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { HOME_PATH } from '../lib/constants'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import AuthVehicleArt from '../components/ui/AuthVehicleArt'
import Logo from '../components/ui/Logo'
import { useToast } from '../components/ui/Toast'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { login } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const registeredEmail = location.state?.registeredEmail ?? ''

  const [form, setForm] = useState({ email: registeredEmail, password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = location.state?.from

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setFormError('')
  }

  const performLogin = async (email, password) => {
    setFormError('')
    setErrors({})
    setSubmitting(true)

    try {
      const user = await login(email, password)
      push({
        title: `Halo, ${user.name.split(' ')[0]}!`,
        message: user.must_change_password
          ? 'Ganti kata sandi sementara sebelum melanjutkan.'
          : 'Kamu berhasil masuk.',
      })

      if (user.must_change_password) {
        navigate('/change-password', { replace: true })
        return
      }

      const fallback = HOME_PATH[user.role] ?? '/'
      const destination =
        redirectTo && redirectTo.startsWith(fallback) ? redirectTo : fallback
      navigate(destination, { replace: true })
    } catch (error) {
      setFormError(error.message)
      if (error.errors) {
        setErrors(error.errors)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!form.email.trim()) {
      nextErrors.email = 'Email wajib diisi.'
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      nextErrors.email = 'Format email belum benar.'
    }
    if (!form.password) {
      nextErrors.password = 'Kata sandi wajib diisi.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    performLogin(form.email.trim(), form.password)
  }

  return (
    <div className="auth">
      <aside className="auth__panel">
        <Logo variant="light" />
        <div className="auth__panel-body">
          <span className="auth__live">
            <span className="auth__live-dot" aria-hidden="true" />
            Status perjalanan realtime
          </span>
          <h1>
            Antar jemput yang lebih <span className="text-accent">tertata</span>.
          </h1>
          <p>
            Satu aplikasi web untuk memesan perjalanan, memantau status, dan mengelola
            pembayaran dalam satu alur yang tertata.
          </p>
          <AuthVehicleArt />
        </div>
      </aside>

      <main className="auth__main">
        <div className="auth__card">
          <div className="auth__head">
            <p className="auth__eyebrow">Masuk akun</p>
            <h2>Selamat datang kembali</h2>
            <p className="auth__sub">
              Masuk untuk melanjutkan ke akunmu.
            </p>
          </div>

          {registeredEmail ? (
            <div className="notice notice--info" role="status">
              <Icon name="check" size={18} />
              <p>
                Akun <strong>{registeredEmail}</strong> berhasil dibuat. Silakan masuk
                menggunakan kata sandi yang baru didaftarkan.
              </p>
            </div>
          ) : null}

          {formError ? (
            <div className="alert alert--danger" role="alert">
              <Icon name="alert" size={18} />
              <span>{formError}</span>
            </div>
          ) : null}

          <form className="auth__form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="login-email">
                Email
              </label>
              <div className="input-wrap">
                <Icon name="mail" size={18} className="input-wrap__icon" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  className={['input', 'input--with-icon', errors.email ? 'input--error' : '']
                    .filter(Boolean)
                    .join(' ')}
                  placeholder="nama@email.com"
                  value={form.email}
                  onChange={updateField('email')}
                  aria-invalid={Boolean(errors.email)}
                  disabled={submitting}
                />
              </div>
              {errors.email ? (
                <p className="field__error" role="alert">
                  <Icon name="alert" size={14} />
                  {errors.email}
                </p>
              ) : null}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="login-password">
                Kata sandi
              </label>
              <div className="input-wrap">
                <Icon name="lock" size={18} className="input-wrap__icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={[
                    'input',
                    'input--with-icon',
                    'input--with-action',
                    errors.password ? 'input--error' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  placeholder="Masukkan kata sandi"
                  value={form.password}
                  onChange={updateField('password')}
                  aria-invalid={Boolean(errors.password)}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="input__action"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                </button>
              </div>
              {errors.password ? (
                <p className="field__error" role="alert">
                  <Icon name="alert" size={14} />
                  {errors.password}
                </p>
              ) : null}
            </div>

            <Button type="submit" size="lg" block disabled={submitting}>
              {submitting ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>

          <p className="auth__switch">
            Belum punya akun? <Link to="/register">Daftar sekarang</Link>
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
