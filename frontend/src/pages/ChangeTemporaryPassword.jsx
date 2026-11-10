import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { HOME_PATH } from '../lib/constants'
import Button from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import Icon from '../components/ui/Icon'
import PageLoader from '../components/ui/PageLoader'
import Switch from '../components/ui/Switch'
import { useToast } from '../components/ui/Toast'

const initialForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export default function ChangeTemporaryPassword() {
  const { user, loading, changePassword, logout } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <PageLoader full label="Memeriksa sesi..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.must_change_password) {
    return <Navigate to={HOME_PATH[user.role] ?? '/'} replace />
  }

  const updateField = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }))
    setErrors((previous) => ({ ...previous, [field]: undefined }))
    setFormError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}

    if (!form.currentPassword) {
      nextErrors.currentPassword = 'Sandi sementara wajib diisi.'
    }
    if (!form.newPassword) {
      nextErrors.newPassword = 'Sandi baru wajib diisi.'
    } else if (form.newPassword.length < 8) {
      nextErrors.newPassword = 'Sandi baru minimal 8 karakter.'
    } else if (form.newPassword === form.currentPassword) {
      nextErrors.newPassword = 'Sandi baru harus berbeda dari sandi sementara.'
    }
    if (form.confirmPassword !== form.newPassword) {
      nextErrors.confirmPassword = 'Konfirmasi sandi belum cocok.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      await changePassword(form.currentPassword, form.newPassword)
      push({
        title: 'Sandi berhasil diganti',
        message: 'Kamu sekarang bisa menggunakan seluruh fitur.',
      })
      navigate(HOME_PATH[user.role] ?? '/', { replace: true })
    } catch (error) {
      setFormError(error.message)
      if (error.errors) setErrors(error.errors)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const passwordInput = (id, value, field, autoComplete) => (
    <div className="input-wrap">
      <Icon name="lock" size={18} className="input-wrap__icon" />
      <input
        id={id}
        className={['input', 'input--with-icon', errors[field] ? 'input--error' : '']
          .filter(Boolean)
          .join(' ')}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={updateField(field)}
        autoComplete={autoComplete}
        aria-invalid={Boolean(errors[field])}
        disabled={submitting}
      />
    </div>
  )

  return (
    <div className="auth">
      <main className="auth__main">
        <div className="auth__card">
          <div className="auth__head">
            <p className="auth__eyebrow">Keamanan akun</p>
            <h2>Ganti kata sandi sementara</h2>
            <p className="auth__sub">
              Admin telah membuat sandi sementara untuk akun <strong>{user.email}</strong>.
              Ganti sekarang sebelum melanjutkan.
            </p>
          </div>

          <div className="notice notice--warning" role="status">
            <Icon name="alert" size={18} />
            <p>Sandi sementara hanya berlaku sampai kamu menyimpan sandi baru.</p>
          </div>

          <form className="auth__form" onSubmit={handleSubmit} noValidate>
            {formError ? (
              <div className="alert alert--danger" role="alert">
                <Icon name="alert" size={18} />
                <div className="alert__body">
                  <p>{formError}</p>
                </div>
              </div>
            ) : null}

            <Field
              id="currentPassword"
              label="Sandi sementara"
              required
              error={errors.currentPassword}
            >
              {passwordInput(
                'currentPassword',
                form.currentPassword,
                'currentPassword',
                'current-password',
              )}
            </Field>

            <Field
              id="newPassword"
              label="Sandi baru"
              hint="Minimal 8 karakter dan berbeda dari sandi sementara."
              required
              error={errors.newPassword}
            >
              {passwordInput('newPassword', form.newPassword, 'newPassword', 'new-password')}
            </Field>

            <Field
              id="confirmPassword"
              label="Ulangi sandi baru"
              required
              error={errors.confirmPassword}
            >
              {passwordInput(
                'confirmPassword',
                form.confirmPassword,
                'confirmPassword',
                'new-password',
              )}
            </Field>

            <Switch
              checked={showPassword}
              onChange={setShowPassword}
              label="Tampilkan kata sandi"
              description="Gunakan hanya saat layarmu aman."
            />

            <Button type="submit" size="lg" block disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan sandi baru'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              block
              onClick={handleLogout}
              disabled={submitting}
            >
              Keluar dari akun
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
