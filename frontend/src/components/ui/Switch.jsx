export default function Switch({ checked, onChange, label, description, disabled = false }) {
  return (
    <label
      className={['switch', checked ? 'is-on' : '', disabled ? 'is-disabled' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <span className="switch__text">
        <span className="switch__label">{label}</span>
        {description ? <span className="switch__desc">{description}</span> : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
    </label>
  )
}
