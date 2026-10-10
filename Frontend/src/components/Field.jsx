import { useId } from 'react'

function Field({ label, hint, error, as: Control = 'input', ...inputProps }) {
  const id = useId()
  const hintId = hint && !error ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <Control
        id={id}
        className="field__input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={hintId ?? errorId}
        {...inputProps}
      />
      {hintId && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  )
}

export default Field
