import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/useAuth'
import AuthLayout from '../components/AuthLayout'
import Field from '../components/Field'
import Alert from '../components/Alert'

function ResetPassword() {
  const { token } = useParams()
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const password = form.get('password')
    const passwordConfirm = form.get('passwordConfirm')

    const errors = {}
    if (password.length < 8) errors.password = 'Use at least 8 characters.'
    if (password !== passwordConfirm) errors.passwordConfirm = 'The passwords don’t match.'
    setFieldErrors(errors)
    setError('')
    if (Object.keys(errors).length) return

    setSubmitting(true)
    try {
      // A successful reset also logs you in
      const res = await api.patch(`/users/resetPassword/${token}`, { password, passwordConfirm })
      setUser(res.data.user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      footer={
        <>
          Link expired? <Link to="/forgot-password">Request a new one</Link>
        </>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <Alert>{error}</Alert>
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={fieldErrors.password}
          required
        />
        <Field
          label="Confirm new password"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          error={fieldErrors.passwordConfirm}
          required
        />
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </AuthLayout>
  )
}

export default ResetPassword
