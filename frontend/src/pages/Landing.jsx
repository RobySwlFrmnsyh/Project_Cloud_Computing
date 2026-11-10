import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import Logo from '../components/ui/Logo'
import HeroMotionScene from '../components/landing/HeroMotionScene'

const FEATURES = [
  {
    icon: 'zap',
    title: 'Pemesanan singkat',
    text: 'Tentukan titik jemput, tujuan, dan jadwal, lalu lihat estimasi tarif sebelum mengonfirmasi pesanan.',
  },
  {
    icon: 'route',
    title: 'Alur terintegrasi',
    text: 'Pemesanan, perjalanan, pembayaran, dan riwayat tersusun dalam satu alur yang mudah dipahami.',
  },
  {
    icon: 'clock',
    title: 'Status real-time',
    text: 'Pantau perkembangan perjalanan melalui status yang diperbarui secara langsung dan transparan.',
  },
  {
    icon: 'wallet',
    title: 'Pembayaran fleksibel',
    text: 'Pilih metode pembayaran yang tersedia dan tinjau status transaksi kapan saja.',
  },
  {
    icon: 'shield',
    title: 'Akun terlindungi',
    text: 'Sesi masuk yang aman dan data akun yang terjaga membuat setiap aktivitas lebih tenang.',
  },
]

const STEPS = [
  {
    number: '01',
    title: 'Buat akun',
    text: 'Daftar dan lengkapi profil dalam beberapa langkah sederhana.',
  },
  {
    number: '02',
    title: 'Pesan perjalanan',
    text: 'Tentukan titik jemput, tujuan, dan jadwal sesuai kebutuhan.',
  },
  {
    number: '03',
    title: 'Pantau dan selesaikan',
    text: 'Ikuti status perjalanan, selesaikan pembayaran, lalu tinjau riwayat.',
  },
]

const HIGHLIGHTS = [
  'Pemesanan dan penjadwalan perjalanan',
  'Pemantauan status secara real-time',
  'Pembayaran dan riwayat transaksi',
  'Pengelolaan profil dan keamanan akun',
  'Notifikasi aktivitas penting',
  'Tampilan responsif di berbagai perangkat',
  'Data tersimpan dan dapat diakses kembali',
]

function HeroPreview() {
  return (
    <div className="hero-card hero-card--scene">
      <HeroMotionScene />
    </div>
  )
}

export default function Landing() {
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero__glow hero__glow--one" aria-hidden="true" />
        <div className="hero__glow hero__glow--two" aria-hidden="true" />

        <header className="site-header container">
          <Logo />
          <nav className="site-nav" aria-label="Navigasi beranda">
            <a href="#fitur">Fitur</a>
            <a href="#cara-kerja">Cara kerja</a>
            <a href="#keunggulan">Keunggulan</a>
          </nav>
          <div className="site-header__actions">
            <Button to="/login" variant="ghost-light" size="sm">
              Masuk
            </Button>
            <Button to="/register" variant="accent" size="sm">
              Daftar
            </Button>
          </div>
        </header>

        <div className="hero__inner container">
          <div className="hero__copy">
            <span className="hero__badge">
              <span className="hero__badge-dot" aria-hidden="true" />
              Perjalanan terpantau · Responsif di semua perangkat
            </span>
            <h1>
              Antar jemput teman, <span className="text-accent">tanpa ribet</span>.
            </h1>
            <p className="hero__lead">
              Pesan perjalanan, pantau status penjemputan, dan kelola pembayaran dalam satu
              aplikasi web yang ringkas dan mudah digunakan.
            </p>
            <div className="hero__actions">
              <Button to="/register" variant="accent" size="lg" trailingIcon="arrow-right">
                Mulai sekarang
              </Button>
              <Button to="/login" variant="ghost-light" size="lg">
                Masuk
              </Button>
            </div>
            <ul className="hero__points">
              <li>
                <Icon name="check" size={15} />
                Pemesanan cepat
              </li>
              <li>
                <Icon name="check" size={15} />
                Status real-time
              </li>
              <li>
                <Icon name="check" size={15} />
                Pembayaran terintegrasi
              </li>
            </ul>
          </div>

          <div className="hero__media">
            <HeroPreview />
          </div>
        </div>
      </section>

      <section className="section" id="fitur">
        <div className="container">
          <header className="section-head">
            <span className="section-head__eyebrow">Fitur aplikasi</span>
            <h2>Semua kebutuhan alur perjalanan dalam satu tampilan</h2>
            <p>
              Dari pemesanan hingga pembayaran, setiap kebutuhan perjalanan tersedia dalam satu
              alur yang jelas dan mudah digunakan.
            </p>
          </header>

          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <span className="feature-card__icon" aria-hidden="true">
                  <Icon name={feature.icon} size={20} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--soft" id="cara-kerja">
        <div className="container">
          <header className="section-head section-head--center">
            <span className="section-head__eyebrow">Cara kerja</span>
            <h2>Tiga langkah untuk memulai perjalanan</h2>
          </header>

          <ol className="step-grid">
            {STEPS.map((step) => (
              <li className="step-card" key={step.number}>
                <span className="step-card__number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" id="keunggulan">
        <div className="container scope">
          <div className="scope__text">
            <span className="section-head__eyebrow">Keunggulan</span>
            <h2>Dirancang untuk kebutuhan perjalanan sehari-hari</h2>
            <p>
              Antarmuka yang ringkas, status yang jelas, dan data yang tersimpan rapi membantu
              setiap perjalanan terasa lebih teratur dari awal hingga selesai.
            </p>
            <Button to="/register" icon="arrow-right">
              Buat akun
            </Button>
          </div>
          <ul className="scope__list">
            {HIGHLIGHTS.map((highlight) => (
              <li key={highlight}>
                <Icon name="check" size={16} />
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-band__inner">
          <div>
            <h2>Siap memulai perjalanan?</h2>
            <p>Buat akun dan kelola perjalananmu dalam satu aplikasi yang praktis.</p>
          </div>
          <div className="cta-band__actions">
            <Button to="/register" variant="accent" size="lg">
              Daftar akun
            </Button>
            <Button to="/login" variant="ghost-light" size="lg">
              Masuk
            </Button>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <div>
            <Logo />
            <p className="site-footer__tagline">
              Aplikasi antar-jemput untuk memesan perjalanan, memantau status, dan mengelola
              pembayaran dengan mudah.
            </p>
          </div>
          <div className="site-footer__links">
            <div>
              <p className="site-footer__title">Navigasi</p>
              <a href="#fitur">Fitur</a>
              <a href="#cara-kerja">Cara kerja</a>
              <a href="#keunggulan">Keunggulan</a>
            </div>
            <div>
              <p className="site-footer__title">Akun</p>
              <Link to="/login">Masuk</Link>
              <Link to="/register">Daftar</Link>
            </div>
          </div>
        </div>
        <div className="container site-footer__bottom">
          <span>© {new Date().getFullYear()} Anter Jemput Teman</span>
        </div>
      </footer>
    </div>
  )
}
