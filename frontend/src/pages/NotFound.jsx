import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'

export default function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found__card">
        <span className="not-found__code">404</span>
        <h1>Halaman tidak ditemukan</h1>
        <p>
          Alamat yang kamu buka tidak tersedia. Kembali ke beranda atau masuk dengan akun demo.
        </p>
        <div className="not-found__actions">
          <Button to="/" icon="arrow-left">
            Kembali ke beranda
          </Button>
          <Button to="/login" variant="outline">
            Masuk akun
          </Button>
        </div>
        <p className="not-found__hint">
          <Icon name="info" size={14} />
          Butuh bantuan? Lihat <Link to="/">panduan singkat di beranda</Link>.
        </p>
      </div>
    </div>
  )
}
