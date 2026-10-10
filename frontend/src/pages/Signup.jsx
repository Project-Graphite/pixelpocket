import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import AuthLayout from '../components/AuthLayout'
import Field from '../components/Field'
import Alert from '../components/Alert'

function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = form.get('name').trim()
    const email = form.get('email').trim()
    const password = form.get('password')
    const passwordConfirm = form.get('passwordConfirm')

    const errors = {}
    if (!name) errors.name = 'Enter your name.'
    if (!email) errors.email = 'Enter your email address.'
    if (password.length < 8) errors.password = 'Use at least 8 characters.'
    if (password !== passwordConfirm) errors.passwordConfirm = 'The passwords don’t match.'
    setFieldErrors(errors)
    setError('')
    if (Object.keys(errors).length) return

    setSubmitting(true)
    try {
      await signup({ name, email, password, passwordConfirm })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      intro="Save your progress and pick up where you left off on any device."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <Alert>{error}</Alert>
        <Field label="Name" name="name" autoComplete="name" error={fieldErrors.name} required />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          error={fieldErrors.email}
          required
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={fieldErrors.password}
          required
        />
        <Field
          label="Confirm password"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          error={fieldErrors.passwordConfirm}
          required
        />
        <p className="field__hint">
          By creating an account, you agree to the <Link to="/terms">terms of service</Link>. Read
          how we handle your information in the <Link to="/privacy">privacy policy</Link>.
        </p>
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}

export default Signup
