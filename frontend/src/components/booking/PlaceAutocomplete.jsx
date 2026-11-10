import { useEffect, useId, useRef, useState } from 'react'
import Icon from '../ui/Icon'
import {
  hasCoordinates,
  resolvePlace,
  reverseGeocode,
  searchPlaces,
} from '../../lib/geocode'

export default function PlaceAutocomplete({
  label,
  icon = 'map-pin',
  value,
  onSelect,
  onClear,
  onActivate,
  active = false,
  placeholder,
  error,
  near,
}) {
  const [query, setQuery] = useState(value ? value.label || value.address : '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const abortRef = useRef(null)
  const mountedRef = useRef(true)
  const selectTokenRef = useRef(0)
  const inputId = useId()
  const listId = useId()
  const selectedLabel = value ? value.label || value.address : ''
  const normalizedQuery = query.trim()

  useEffect(() => {
    if (!open) setQuery(selectedLabel)
  }, [open, selectedLabel])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
      setResults([])
      setLoading(false)
      setMessage('')
      setMessageIsError(false)
      setHighlighted(-1)
      return undefined
    }

    if (normalizedQuery.length < 2 || normalizedQuery === selectedLabel) {
      abortRef.current?.abort()
      setResults([])
      setLoading(false)
      setHighlighted(-1)
      setMessage(
        normalizedQuery.length > 0 && normalizedQuery.length < 2
          ? 'Ketik minimal 2 karakter.'
          : '',
      )
      setMessageIsError(false)
      return undefined
    }

    const controller = new AbortController()
    abortRef.current = controller
    const timer = setTimeout(async () => {
      setLoading(true)
      setMessage('')
      setMessageIsError(false)

      try {
        const found = await searchPlaces(normalizedQuery, {
          limit: 8,
          signal: controller.signal,
          near,
        })
        if (controller.signal.aborted) return
        setResults(found)
        setHighlighted(found.length > 0 ? 0 : -1)
        if (found.length === 0) {
          setMessage('Alamat tidak ditemukan. Coba nama jalan, dusun, desa, atau tempat lain.')
          setMessageIsError(true)
        }
      } catch (searchError) {
        if (searchError.name === 'AbortError') return
        setResults([])
        setHighlighted(-1)
        setMessage('Pencarian alamat gagal. Periksa koneksi lalu coba lagi.')
        setMessageIsError(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 450)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [normalizedQuery, open, selectedLabel, near])

  const applyResult = (result) => {
    setQuery(result.label || result.address)
    setOpen(false)
    setResults([])
    setMessage('')
    setMessageIsError(false)
    setHighlighted(-1)
    onSelect?.(result)
  }

  const selectResult = async (result) => {
    if (!result) return
    onActivate?.()

    if (hasCoordinates(result)) {
      applyResult(result)
      return
    }

    const token = ++selectTokenRef.current
    setSelecting(true)
    setMessage('Mengambil titik alamat...')
    setMessageIsError(false)

    try {
      const resolved = await resolvePlace(result)
      if (!mountedRef.current || token !== selectTokenRef.current) return
      if (!hasCoordinates(resolved)) {
        throw new Error('Titik alamat tidak ditemukan.')
      }
      applyResult(resolved)
    } catch {
      if (!mountedRef.current || token !== selectTokenRef.current) return
      setMessage('Detail alamat gagal diambil. Coba pilih hasil lain atau ulangi pencarian.')
      setMessageIsError(true)
    } finally {
      if (mountedRef.current && token === selectTokenRef.current) {
        setSelecting(false)
      }
    }
  }

  const handleUseLocation = () => {
    selectTokenRef.current += 1
    setSelecting(false)
    setOpen(true)
    onActivate?.()

    if (!navigator.geolocation) {
      setMessage('Perangkat ini tidak mendukung pencarian lokasi saat ini.')
      setMessageIsError(true)
      return
    }

    setLocating(true)
    setMessage('')
    setMessageIsError(false)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const point = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        }

        let result = {
          ...point,
          address: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
          label: 'Lokasi saya',
        }

        try {
          const resolved = await reverseGeocode(point.lat, point.lng)
          result = { ...result, ...resolved }
        } catch {
          // Koordinat tetap dipakai bila layanan alamat sedang tidak tersedia.
        }

        if (!mountedRef.current) return
        setLocating(false)
        selectResult(result)
      },
      (locationError) => {
        if (!mountedRef.current) return
        setLocating(false)
        setMessage(
          locationError.code === 1
            ? 'Izin lokasi ditolak. Aktifkan izin lokasi di browser untuk memakai fitur ini.'
            : 'Lokasi saat ini tidak dapat diambil. Coba lagi atau pilih alamat manual.',
        )
        setMessageIsError(true)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      selectTokenRef.current += 1
      setSelecting(false)
      setOpen(false)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setHighlighted((current) => Math.min(current + 1, results.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((current) => Math.max(current - 1, 0))
      return
    }

    if (event.key === 'Enter' && open) {
      const result = results[highlighted] ?? results[0]
      if (result) {
        event.preventDefault()
        selectResult(result)
      }
    }
  }

  const handleClear = () => {
    selectTokenRef.current += 1
    setSelecting(false)
    setQuery('')
    setResults([])
    setMessage('')
    setMessageIsError(false)
    setHighlighted(-1)
    setOpen(true)
    onActivate?.()
    onClear?.()
  }

  return (
    <div
      className={[
        'place-autocomplete',
        active ? 'is-active' : '',
        error ? 'is-invalid' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <label className="place-autocomplete__caption" htmlFor={inputId}>
        {label}
      </label>

      <div className="place-autocomplete__control">
        <Icon name={icon} size={16} />
        <input
          id={inputId}
          type="text"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            open && highlighted >= 0 ? `${listId}-${highlighted}` : undefined
          }
          onChange={(event) => {
            selectTokenRef.current += 1
            setSelecting(false)
            setQuery(event.target.value)
            setOpen(true)
            onActivate?.()
          }}
          onFocus={() => {
            setOpen(true)
            onActivate?.()
          }}
          onBlur={() => {
            selectTokenRef.current += 1
            setSelecting(false)
            setOpen(false)
          }}
          onKeyDown={handleKeyDown}
        />

        <span className="place-autocomplete__actions">
          {value && !open ? <Icon name="check" size={15} /> : null}
          {value && onClear ? (
            <button
              type="button"
              className="place-autocomplete__icon-btn"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleClear}
              aria-label="Hapus alamat"
              title="Hapus alamat"
            >
              <Icon name="x" size={14} />
            </button>
          ) : null}
          <button
            type="button"
            className={[
              'place-autocomplete__icon-btn',
              locating ? 'is-locating' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleUseLocation}
            disabled={locating}
            aria-label="Gunakan lokasi saya"
            title="Gunakan lokasi saya"
          >
            <Icon name="navigation" size={14} />
          </button>
        </span>
      </div>

      {value && !open && value.label !== value.address ? (
        <p className="place-autocomplete__address">{value.address}</p>
      ) : null}

      {error ? (
        <p className="field__error" role="alert">
          <Icon name="alert" size={14} />
          {error}
        </p>
      ) : null}

      {open ? (
        <div className="place-autocomplete__dropdown">
          <button
            type="button"
            className="place-autocomplete__location"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleUseLocation}
            disabled={locating}
          >
            <Icon name="navigation" size={15} />
            <span>
              <strong>{locating ? 'Mengambil lokasi...' : 'Gunakan lokasi saya'}</strong>
              <small>Isi titik dari GPS perangkat</small>
            </span>
          </button>

          {loading ? <p className="place-autocomplete__message">Mencari alamat...</p> : null}
          {!loading && message ? (
            <p
              className={[
                'place-autocomplete__message',
                messageIsError ? 'place-autocomplete__message--error' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {message}
            </p>
          ) : null}

          {!loading && !message && normalizedQuery.length < 2 ? (
            <p className="place-autocomplete__message">
              Cari nama jalan, dusun, desa, atau tempat. Kamu juga bisa menekan ikon
              navigasi untuk memakai lokasi saat ini.
            </p>
          ) : null}

          {results.length > 0 ? (
            <ul className="place-search__results place-autocomplete__results" id={listId}>
              {results.map((result, index) => (
                <li key={`${result.label}-${result.lat}-${result.lng}-${index}`}>
                  <button
                    type="button"
                    id={`${listId}-${index}`}
                    className={index === highlighted ? 'is-highlighted' : ''}
                    aria-selected={index === highlighted}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => selectResult(result)}
                    disabled={selecting}
                  >
                    <Icon name="map-pin" size={15} />
                    <span>
                      <strong>{result.label}</strong>
                      <small>{result.address}</small>
                    </span>
                    {result.kind ? (
                      <span className="place-autocomplete__kind">{result.kind}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
