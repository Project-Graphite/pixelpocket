import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { MAX_COVER_BYTES } from '../services/romHeader'
import { CartridgeArt } from './Icons'

const TYPES = ['image/jpeg', 'image/png', 'image/webp']

// `current` is the existing cover's URL
function CoverPicker({
  file,
  onChange,
  current = null,
  disabled = false,
  label = 'Cover image (optional)',
}) {
  const id = useId()
  const [error, setError] = useState('')

  // Release the previous preview URL when the file changes
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  const previous = useRef(null)
  useEffect(() => {
    if (previous.current && previous.current !== preview) URL.revokeObjectURL(previous.current)
    previous.current = preview
  }, [preview])

  const choose = (picked) => {
    setError('')
    if (!picked) return onChange(null)
    if (!TYPES.includes(picked.type)) {
      setError('Choose a JPEG, PNG or WebP image.')
      return onChange(null)
    }
    if (picked.size > MAX_COVER_BYTES) {
      setError('A cover image can be at most 5 MB.')
      return onChange(null)
    }
    return onChange(picked)
  }

  const shown = preview || current

  return (
    <div className="cover-picker">
      <span className="cover-picker__preview" aria-hidden="true">
        {shown ? <img src={shown} alt="" /> : <CartridgeArt />}
      </span>
      <div className="field">
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="field__input"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={`${id}-msg`}
          onChange={(e) => choose(e.target.files[0])}
          disabled={disabled}
        />
        {error ? (
          <p id={`${id}-msg`} className="field__error">
            {error}
          </p>
        ) : (
          <p id={`${id}-msg`} className="field__hint">
            JPEG, PNG or WebP, up to 5 MB. Shown above the game’s name.
          </p>
        )}
      </div>
    </div>
  )
}

export default CoverPicker
