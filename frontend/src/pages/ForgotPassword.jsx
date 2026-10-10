import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import AuthLayout from '../components/AuthLayout'
import Field from '../components/Field'
import Alert from '../components/Alert'

function ForgotPassword() {
  const [error, setError] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post('/users/forgotPassword', { email: form.get('email').trim() })
      setSentMessage(res.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      intro="Enter your email and we’ll send you a link to choose a new password."
      footer={<Link to="/login">Back to log in</Link>}
    >
      {sentMessage ? (
        <Alert type="success">{sentMessage} The link works for 10 minutes.</Alert>
      ) : (
        <form className="form" onSubmit={handleSubmit} noValidate>
          <Alert>{error}</Alert>
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}

export default ForgotPassword
