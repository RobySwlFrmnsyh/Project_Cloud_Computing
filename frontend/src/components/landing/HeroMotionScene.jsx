export default function HeroMotionScene() {
  return (
    <div className="hero-scene" aria-hidden="true">
      <svg viewBox="0 0 560 300" role="presentation" focusable="false">
        <defs>
          <linearGradient id="hero-scene-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2f8ff" />
            <stop offset="100%" stopColor="#dfeeff" />
          </linearGradient>
          <linearGradient id="hero-scene-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#18375b" />
            <stop offset="100%" stopColor="#0d2442" />
          </linearGradient>
          <linearGradient id="hero-scene-car" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e4f8a" />
          </linearGradient>
          <linearGradient id="hero-scene-building" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9dcf3" />
            <stop offset="100%" stopColor="#aec8e7" />
          </linearGradient>
        </defs>

        <rect width="560" height="300" fill="url(#hero-scene-sky)" />
        <circle cx="468" cy="54" r="72" fill="#ffffff" opacity="0.28" />
        <circle cx="468" cy="54" r="48" fill="#ffffff" opacity="0.62" />

        <g opacity="0.72">
          <rect x="24" y="108" width="52" height="92" rx="5" fill="url(#hero-scene-building)" />
          <rect x="84" y="82" width="68" height="118" rx="6" fill="#b9d1ec" />
          <rect x="160" y="120" width="44" height="80" rx="4" fill="#c5d9f1" />
          <rect x="212" y="94" width="58" height="106" rx="6" fill="url(#hero-scene-building)" />
          <rect x="278" y="68" width="74" height="132" rx="7" fill="#b4cde9" />
          <rect x="360" y="112" width="48" height="88" rx="5" fill="#c9dcf3" />
          <rect x="416" y="88" width="62" height="112" rx="6" fill="#b9d1ec" />
          <rect x="486" y="124" width="50" height="76" rx="5" fill="#c5d9f1" />

          <g fill="#eef7ff" opacity="0.9">
            <rect x="36" y="122" width="9" height="12" rx="2" />
            <rect x="52" y="122" width="9" height="12" rx="2" />
            <rect x="36" y="144" width="9" height="12" rx="2" />
            <rect x="52" y="144" width="9" height="12" rx="2" />
            <rect x="36" y="166" width="9" height="12" rx="2" />
            <rect x="52" y="166" width="9" height="12" rx="2" />
            <rect x="98" y="98" width="11" height="14" rx="2" />
            <rect x="118" y="98" width="11" height="14" rx="2" />
            <rect x="98" y="124" width="11" height="14" rx="2" />
            <rect x="118" y="124" width="11" height="14" rx="2" />
            <rect x="98" y="150" width="11" height="14" rx="2" />
            <rect x="118" y="150" width="11" height="14" rx="2" />
            <rect x="228" y="110" width="10" height="13" rx="2" />
            <rect x="246" y="110" width="10" height="13" rx="2" />
            <rect x="228" y="136" width="10" height="13" rx="2" />
            <rect x="246" y="136" width="10" height="13" rx="2" />
            <rect x="296" y="86" width="12" height="15" rx="2" />
            <rect x="318" y="86" width="12" height="15" rx="2" />
            <rect x="296" y="114" width="12" height="15" rx="2" />
            <rect x="318" y="114" width="12" height="15" rx="2" />
            <rect x="296" y="142" width="12" height="15" rx="2" />
            <rect x="318" y="142" width="12" height="15" rx="2" />
            <rect x="432" y="104" width="10" height="13" rx="2" />
            <rect x="450" y="104" width="10" height="13" rx="2" />
            <rect x="432" y="130" width="10" height="13" rx="2" />
            <rect x="450" y="130" width="10" height="13" rx="2" />
          </g>
        </g>

        <g>
          <rect x="14" y="174" width="5" height="26" rx="2.5" fill="#6f88a8" />
          <circle cx="16.5" cy="170" r="12" fill="#8fb8a1" />
          <rect x="530" y="168" width="5" height="32" rx="2.5" fill="#6f88a8" />
          <circle cx="532.5" cy="164" r="14" fill="#8fb8a1" />
        </g>

        <rect x="0" y="188" width="560" height="14" fill="#d8e7f7" />
        <rect x="0" y="200" width="560" height="100" fill="url(#hero-scene-road)" />
        <path d="M0 214H560" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="2" />
        <path
          className="hero-scene__dashes"
          d="M0 252H560"
          stroke="#f6c453"
          strokeWidth="4"
          strokeDasharray="22 20"
          strokeLinecap="round"
        />

        <g transform="translate(0 152)">
          <g className="hero-scene__person">
            <g className="hero-scene__person-bob">
              <ellipse cx="18" cy="55" rx="15" ry="3" fill="#08172e" opacity="0.18" />
              <circle cx="18" cy="7" r="7" fill="#f1b184" />
              <path d="M11 5c0-5 3-8 8-8 4 0 7 3 7 7 0 2-1 3-2 4H12c-1-1-1-2-1-3Z" fill="#2d3f57" />
              <path d="M18 15c-7 0-12 5-12 12v10h24V27c0-7-5-12-12-12Z" fill="#e76f51" />
              <path d="M7 26 2 36" stroke="#e76f51" strokeWidth="5" strokeLinecap="round" />
              <path d="M29 26 34 35" stroke="#e76f51" strokeWidth="5" strokeLinecap="round" />
              <path d="M13 37v9" stroke="#28466b" strokeWidth="6" strokeLinecap="round" />
              <path d="M23 37v9" stroke="#28466b" strokeWidth="6" strokeLinecap="round" />
              <path d="M13 46 8 49" stroke="#28466b" strokeWidth="5" strokeLinecap="round" />
              <path d="M23 46 28 49" stroke="#28466b" strokeWidth="5" strokeLinecap="round" />
            </g>
          </g>
        </g>

        <g transform="translate(0 184)">
          <g className="hero-scene__moto">
            <g className="hero-scene__moto-bob">
              <ellipse cx="48" cy="60" rx="42" ry="5" fill="#08172e" opacity="0.2" />
              <circle cx="16" cy="44" r="15" fill="#0b1f3a" stroke="#dce9f8" strokeWidth="3.5" />
              <circle cx="78" cy="44" r="15" fill="#0b1f3a" stroke="#dce9f8" strokeWidth="3.5" />
              <path
                d="M16 44 34 24h20l20 20"
                fill="none"
                stroke="#f7b32b"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M34 24h20l8 11H29Z"
                fill="#f7b32b"
                stroke="#d89a14"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M8 28 2 28" stroke="#fff3c4" strokeWidth="5" strokeLinecap="round" />
              <path
                d="M43 24c-8 0-13 5-13 11v8h17l4-19h-8Z"
                fill="#264a74"
              />
              <circle cx="49" cy="6" r="7" fill="#f1b184" />
              <path
                d="M42 4c0-5 3-8 8-8 4 0 7 3 7 7l-1 3H43c-1-1-1-2-1-2Z"
                fill="#2d3f57"
              />
              <path d="M44 19 35 29" stroke="#264a74" strokeWidth="5" strokeLinecap="round" />
              <path d="M34 29h13" stroke="#f1b184" strokeWidth="4" strokeLinecap="round" />
              <path d="M33 43 27 50" stroke="#264a74" strokeWidth="6" strokeLinecap="round" />
            </g>
          </g>
        </g>

        <g transform="translate(0 168)">
          <g className="hero-scene__car">
            <g className="hero-scene__car-bob">
              <ellipse cx="74" cy="94" rx="70" ry="6" fill="#08172e" opacity="0.2" />
              <path
                d="M8 64 26 28C30 19 38 15 48 15h48c10 0 18 4 24 13l19 36 15 4c8 2 13 8 13 17v10H4V85c0-9 4-16 4-21Z"
                fill="url(#hero-scene-car)"
              />
              <path
                d="M42 24h20v22H25L42 24Z"
                fill="#d9ebff"
              />
              <path d="M70 24h24c6 0 10 3 13 8l10 14H70V24Z" fill="#c6e0ff" />
              <rect x="35" y="49" width="17" height="4" rx="2" fill="#0b1f3a" opacity="0.55" />
              <rect x="108" y="49" width="17" height="4" rx="2" fill="#0b1f3a" opacity="0.55" />
              <rect x="30" y="56" width="10" height="18" rx="4" fill="#153a63" />
              <rect x="111" y="56" width="10" height="18" rx="4" fill="#153a63" />
              <circle cx="36" cy="88" r="15" fill="#0b1f3a" stroke="#dce9f8" strokeWidth="3.5" />
              <g transform="translate(36 88)">
                <g className="hero-scene__wheel">
                  <circle r="6" fill="#dce9f8" />
                  <path d="M0-5V5M-5 0H5" stroke="#5c789c" strokeWidth="1.6" />
                </g>
              </g>
              <circle cx="118" cy="88" r="15" fill="#0b1f3a" stroke="#dce9f8" strokeWidth="3.5" />
              <g transform="translate(118 88)">
                <g className="hero-scene__wheel">
                  <circle r="6" fill="#dce9f8" />
                  <path d="M0-5V5M-5 0H5" stroke="#5c789c" strokeWidth="1.6" />
                </g>
              </g>
              <path d="M139 58h12" stroke="#ffe7a8" strokeWidth="5" strokeLinecap="round" />
              <path d="M8 62H2" stroke="#ffb4a4" strokeWidth="5" strokeLinecap="round" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
