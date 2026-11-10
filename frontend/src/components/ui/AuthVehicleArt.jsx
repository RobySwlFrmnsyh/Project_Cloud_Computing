import Icon from './Icon'

export default function AuthVehicleArt() {
  return (
    <div className="auth-art" aria-hidden="true">
      <svg viewBox="0 0 520 330" role="presentation">
        <defs>
          <linearGradient id="auth-art-panel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#123864" />
            <stop offset="1" stopColor="#07182e" />
          </linearGradient>
          <linearGradient id="auth-art-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1c33" />
            <stop offset="1" stopColor="#061221" />
          </linearGradient>
          <radialGradient id="auth-art-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#2d7be0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#2d7be0" stopOpacity="0" />
          </radialGradient>
          <filter id="auth-art-shadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#020b17" floodOpacity="0.45" />
          </filter>
        </defs>

        <rect
          x="1"
          y="1"
          width="518"
          height="328"
          rx="28"
          fill="url(#auth-art-panel)"
          stroke="rgba(255,255,255,0.13)"
        />
        <circle cx="402" cy="62" r="150" fill="url(#auth-art-glow)" />
        <circle cx="94" cy="245" r="92" fill="url(#auth-art-glow)" opacity="0.45" />

        <g stroke="rgba(148,187,238,0.15)" strokeWidth="1">
          <path d="M32 66h456M32 120h456M32 174h456" />
          <path d="M92 36v210M198 36v210M304 36v210M410 36v210" />
        </g>

        <path
          className="auth-art__route"
          d="M40 205c64-34 93 18 147-4 54-22 69-80 135-72 55 7 69 50 158 34"
          fill="none"
          stroke="#2f6fb5"
          strokeWidth="3"
          strokeDasharray="2 12"
          strokeLinecap="round"
        />
        <g className="auth-art__pin">
          <path
            d="M419 50c-16 0-29 13-29 29 0 22 29 47 29 47s29-25 29-47c0-16-13-29-29-29Z"
            fill="#ffc94d"
          />
          <circle
            className="auth-art__ping"
            cx="419"
            cy="78"
            r="8"
            fill="#08182e"
            stroke="#ffc94d"
            strokeWidth="4"
          />
        </g>

        <g transform="translate(48 118)">
          <g filter="url(#auth-art-shadow)" className="auth-art__car">
            <path
              d="M15 78 28 36q4-14 20-14h64q16 0 24 13l15 39 19 7q12 4 12 18v5q0 6-7 6H17q-7 0-7-6V91q0-9 5-13Z"
              fill="#5b9cf2"
            />
            <path d="M44 34h23v36H28Z" fill="#cfe6ff" opacity="0.88" />
            <path d="M78 34h30q11 0 16 9l12 27H78Z" fill="#cfe6ff" opacity="0.88" />
            <path d="M10 88h172" stroke="#2c5f9f" strokeWidth="3" strokeLinecap="round" />
            <g transform="translate(84 52)">
              <circle cx="0" cy="0" r="7" fill="#0b2545" opacity="0.85" />
              <path d="M-8 20c0-8 3-13 8-13s8 5 8 13Z" fill="#0b2545" opacity="0.85" />
              <path d="M-7 20h14" stroke="#0b2545" strokeWidth="3" strokeLinecap="round" />
            </g>
            <g className="auth-art__wheel">
              <circle cx="50" cy="110" r="20" fill="#07121f" />
              <circle cx="50" cy="110" r="9" fill="#8fa9c8" />
              <path
                d="M50 94v32M34 110h32"
                stroke="#5c7797"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </g>
            <g className="auth-art__wheel">
              <circle cx="142" cy="110" r="20" fill="#07121f" />
              <circle cx="142" cy="110" r="9" fill="#8fa9c8" />
              <path
                d="M142 94v32M126 110h32"
                stroke="#5c7797"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </g>
          </g>
        </g>

        <g transform="translate(282 116)">
          <g filter="url(#auth-art-shadow)" className="auth-art__bike">
            <g className="auth-art__wheel">
              <circle cx="28" cy="112" r="26" fill="#07121f" stroke="#d9e6f7" strokeWidth="4" />
              <circle cx="28" cy="112" r="10" fill="#7893b4" />
              <path
                d="M28 86v52M2 112h52"
                stroke="#49698f"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </g>
            <g className="auth-art__wheel">
              <circle cx="138" cy="112" r="26" fill="#07121f" stroke="#d9e6f7" strokeWidth="4" />
              <circle cx="138" cy="112" r="10" fill="#7893b4" />
              <path
                d="M138 86v52M112 112h52"
                stroke="#49698f"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </g>
            <path
              d="M34 108 50 53q4-13 20-13h18l4 44 22 5 9 19Z"
              fill="#ffc94d"
              stroke="#ffd876"
              strokeWidth="2"
            />
            <path
              d="M54 52q7-12 23-12h11"
              fill="none"
              stroke="#0d2542"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M93 46 99 21l32-6"
              fill="none"
              stroke="#ffc94d"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M88 101h37" stroke="#0d2542" strokeWidth="8" strokeLinecap="round" />
            <path d="M120 105 132 82" stroke="#d9e6f7" strokeWidth="5" strokeLinecap="round" />
            <circle cx="103" cy="63" r="9" fill="#fff1bb" />
            <circle cx="103" cy="63" r="4" fill="#ffc94d" />
            <path
              d="M60 76h32"
              stroke="#0d2542"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.55"
            />
            <g className="auth-art__rider">
              <circle cx="86" cy="29" r="12" fill="#f5c56a" />
              <path d="M75 29c0-9 5-15 11-15s11 6 11 15Z" fill="#0d2542" />
              <path d="M78 48c5-5 14-5 20 0l-2 28-15 1Z" fill="#2f6fb5" />
              <path d="M79 54 63 74" stroke="#2f6fb5" strokeWidth="7" strokeLinecap="round" />
              <path d="M96 54 108 43" stroke="#2f6fb5" strokeWidth="6" strokeLinecap="round" />
              <path
                d="M88 76 78 96 91 107M91 76l12 22"
                fill="none"
                stroke="#0d2542"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>
        </g>

        <g transform="translate(470 180)">
          <g className="auth-art__walker">
            <circle cx="0" cy="0" r="8" fill="#f1c27d" />
            <path d="M-8 15c0-9 4-14 8-14s8 5 8 14l3 33h-22Z" fill="#2f6fb5" />
            <path
              className="auth-art__wave"
              d="M7 18 19 8"
              stroke="#f1c27d"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M-5 48-12 66M5 48l9 18"
              stroke="#0d2542"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle cx="-13" cy="4" r="2" fill="#ffc94d" opacity="0.8" />
          </g>
        </g>

        <rect x="0" y="248" width="520" height="82" fill="url(#auth-art-road)" />
        <path d="M0 248h520" stroke="rgba(148,187,238,0.2)" strokeWidth="2" />
        <path
          className="auth-art__road-dashes"
          d="M16 290h468"
          stroke="#d7b45a"
          strokeWidth="4"
          strokeDasharray="58 24"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          className="auth-art__road-lane"
          d="M28 312h434"
          stroke="rgba(148,187,238,0.16)"
          strokeWidth="3"
          strokeDasharray="92 44"
          strokeLinecap="round"
        />
      </svg>

      <div className="auth-art__tags">
        <span>
          <Icon name="bike" size={14} />
          Motor
        </span>
        <span>
          <Icon name="car" size={14} />
          Mobil
        </span>
        <span className="auth-art__tag--muted">Antar jemput kapan saja</span>
      </div>
    </div>
  )
}
