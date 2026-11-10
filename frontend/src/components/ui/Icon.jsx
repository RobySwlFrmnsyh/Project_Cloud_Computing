const ICONS = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4.5V10H9" />
      <path d="M12 8v4.5l3 1.8" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20.5c.6-3.6 3.7-6 7.5-6s6.9 2.4 7.5 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M2.8 20c.5-3.3 3.1-5.5 6.2-5.5s5.7 2.2 6.2 5.5" />
      <path d="M16 5.7a3 3 0 0 1 0 5.6" />
      <path d="M17.5 14.8c2.1.5 3.6 2.4 3.9 5.2" />
    </>
  ),
  wallet: (
    <>
      <rect x="3.5" y="7" width="17" height="12.5" rx="2.5" />
      <path d="M3.5 8V5.8A1.8 1.8 0 0 1 5.3 4H17" />
      <path d="M15.5 13.2h2.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 20 6v5.8c0 4.6-3.4 8-8 9.2-4.6-1.2-8-4.6-8-9.2V6z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </>
  ),
  check: <path d="m20 6.5-11 11-5-5" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m6.5 7 .8 13h9.4l.8-13" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  logout: (
    <>
      <path d="M15 12H4" />
      <path d="m8.5 8-4 4 4 4" />
      <path d="M13.5 4H20v16h-6.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  'chevron-down': <path d="m5 9 7 7 7-7" />,
  'arrow-right': (
    <>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M20 12H5" />
      <path d="m11 6-6 6 6 6" />
    </>
  ),
  bell: (
    <>
      <path d="M18 16.5V11a6 6 0 1 0-12 0v5.5L4 19h16z" />
      <path d="M9.5 21a2.6 2.6 0 0 0 5 0" />
    </>
  ),
  phone: (
    <path d="M6.8 3.5h3l1.4 3.7-2 1.4a11.5 11.5 0 0 0 6.2 6.2l1.4-2 3.7 1.4v3a2.4 2.4 0 0 1-2.6 2.4C10.9 18.8 5.2 13.1 4.4 6.1A2.4 2.4 0 0 1 6.8 3.5Z" />
  ),
  star: <path d="m12 3.5 2.6 5.4 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9z" />,
  'credit-card': (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
      <path d="M6 15h3" />
    </>
  ),
  qr: (
    <>
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2" />
      <path d="M14 14h3v3h-3z" />
      <path d="M18.5 20.5h2M20.5 14v2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10.5h18" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.2" />
      <path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4H6.5A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="m4 4 16 16" />
      <path d="M9.9 5.9A9.9 9.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8" />
      <path d="M6.6 7.6A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1 0 1.9-.2 2.7-.5" />
      <path d="M10.2 10.2a2.6 2.6 0 0 0 3.6 3.6" />
    </>
  ),
  refresh: (
    <>
      <path d="M3.5 12a8.5 8.5 0 0 1 14.6-6L21 9" />
      <path d="M21 3.5V9h-5.5" />
      <path d="M20.5 12a8.5 8.5 0 0 1-14.6 6L3 15" />
      <path d="M3 20.5V15h5.5" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M20 10.3c0 5.6-8 11.2-8 11.2S4 15.9 4 10.3a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10.3" r="2.8" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19h8a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7h8" />
    </>
  ),
  car: (
    <>
      <path d="M4.5 16.5v-3l1.8-4.6a2 2 0 0 1 1.9-1.3h7.6a2 2 0 0 1 1.9 1.3l1.8 4.6v3" />
      <path d="M3.5 16.5h17" />
      <path d="M5.5 16.5v2h2.5v-2M16 16.5v2h2.5v-2" />
      <circle cx="7.8" cy="13.4" r="0.9" />
      <circle cx="16.2" cy="13.4" r="0.9" />
    </>
  ),
  bike: (
    <>
      <circle cx="5.5" cy="17.5" r="3" />
      <circle cx="18.5" cy="17.5" r="3" />
      <path d="M8.5 17.5 12 8h3l3.5 9.5" />
      <path d="M9 8h5" />
      <path d="m12 8 1.5 9.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  navigation: <path d="m3 11 19-9-9 19-2-8-8-2Z" />,
  alert: (
    <>
      <path d="M12 3.5 21.5 20H2.5z" />
      <path d="M12 9.5v4.5M12 17.3h.01" />
    </>
  ),
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8h.01" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z" />
      <path d="M9.5 8.5h5M9.5 12.5h5" />
    </>
  ),
}

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.8, ...rest }) {
  const paths = ICONS[name]

  if (!paths) return null

  return (
    <svg
      className={['icon', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths}
    </svg>
  )
}
