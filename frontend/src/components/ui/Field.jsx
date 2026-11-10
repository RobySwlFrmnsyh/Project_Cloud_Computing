import Icon from './Icon'

export function Field({ id, label, hint, error, required, children, className = '' }) {
  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      {label ? (
        <label className="field__label" htmlFor={id}>
          {label}
          {required ? (
            <span className="field__req" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="field__error" role="alert">
          <Icon name="alert" size={14} />
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint">{hint}</p>
      ) : null}
    </div>
  )
}

export function TextField({ id, label, error, hint, icon, required, className = '', ...props }) {
  return (
    <Field
      id={id}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      {icon ? (
        <div className="input-wrap">
          <Icon name={icon} size={18} className="input-wrap__icon" />
          <input
            id={id}
            className={['input', 'input--with-icon', error ? 'input--error' : '']
              .filter(Boolean)
              .join(' ')}
            aria-invalid={Boolean(error)}
            {...props}
          />
        </div>
      ) : (
        <input
          id={id}
          className={['input', error ? 'input--error' : ''].filter(Boolean).join(' ')}
          aria-invalid={Boolean(error)}
          {...props}
        />
      )}
    </Field>
  )
}

export function SelectField({ id, label, error, hint, required, className = '', children, ...props }) {
  return (
    <Field
      id={id}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      <select
        id={id}
        className={['select', error ? 'input--error' : ''].filter(Boolean).join(' ')}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
    </Field>
  )
}

export function TextAreaField({
  id,
  label,
  error,
  hint,
  required,
  className = '',
  rows = 3,
  ...props
}) {
  return (
    <Field
      id={id}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      <textarea
        id={id}
        rows={rows}
        className={['textarea', error ? 'input--error' : ''].filter(Boolean).join(' ')}
        aria-invalid={Boolean(error)}
        {...props}
      />
    </Field>
  )
}
