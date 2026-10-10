import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/useAuth'
import Field from '../components/Field'
import Alert from '../components/Alert'
import './Account.css'

function ProfileForm() {
  const { user, setUser } = useAuth()
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const name = new FormData(e.currentTarget).get('name').trim()
    setStatus(null)
    if (!name) return setStatus({ type: 'error', text: 'Enter your name.' })

    setSubmitting(true)
    try {
      const res = await api.patch('/users/updateMe', { name })
      setUser(res.data.user)
      setStatus({ type: 'success', text: 'Changes saved.' })
    } catch (err) {
      setStatus({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="account__section board" aria-labelledby="profile-heading">
      <h2 id="profile-heading">Profile</h2>
      <form className="form" onSubmit={handleSubmit} noValidate>
        {status && <Alert type={status.type}>{status.text}</Alert>}
        <Field label="Name" name="name" defaultValue={user.name} autoComplete="name" required />
        <Field label="Email" value={user.email} readOnly hint="Your email can’t be changed yet." />
        <button
          type="submit"
          className="btn btn--primary account__form-actions"
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </section>
  )
}

function PasswordForm() {
  const { setUser } = useAuth()
  const [status, setStatus] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    const passwordCurrent = form.get('passwordCurrent')
    const password = form.get('password')
    const passwordConfirm = form.get('passwordConfirm')

    const errors = {}
    if (!passwordCurrent) errors.passwordCurrent = 'Enter your current password.'
    if (password.length < 8) errors.password = 'Use at least 8 characters.'
    if (password !== passwordConfirm) errors.passwordConfirm = 'The passwords don’t match.'
    setFieldErrors(errors)
    setStatus(null)
    if (Object.keys(errors).length) return

    setSubmitting(true)
    try {
      const res = await api.patch('/users/updateMyPassword', {
        passwordCurrent,
        password,
        passwordConfirm,
      })
      setUser(res.data.user)
      setStatus({ type: 'success', text: 'Password changed.' })
      formEl.reset()
    } catch (err) {
      setStatus({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="account__section board" aria-labelledby="password-heading">
      <h2 id="password-heading">Password</h2>
      <form className="form" onSubmit={handleSubmit} noValidate>
        {status && <Alert type={status.type}>{status.text}</Alert>}
        <Field
          label="Current password"
          name="passwordCurrent"
          type="password"
          autoComplete="current-password"
          error={fieldErrors.passwordCurrent}
          required
        />
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
        <button
          type="submit"
          className="btn btn--primary account__form-actions"
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </section>
  )
}

function DeleteAccount() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleDelete = async () => {
    setError('')
    setSubmitting(true)
    try {
      await api.delete('/users/deleteMe')
      setUser(null)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <section className="account__section board" aria-labelledby="delete-heading">
      <h2 id="delete-heading">Delete account</h2>
      <p className="muted">
        Deleting your account erases it, along with the games you uploaded and all of your saves,
        then logs you out. This can’t be undone.
      </p>
      <Alert>{error}</Alert>
      {confirming ? (
        <div className="account__row">
          <button
            type="button"
            className="btn btn--danger"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting ? 'Deleting…' : 'Yes, delete my account'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setConfirming(false)}
            disabled={submitting}
          >
            Keep my account
          </button>
        </div>
      ) : (
        <div className="account__row">
          <button type="button" className="btn btn--danger" onClick={() => setConfirming(true)}>
            Delete account
          </button>
        </div>
      )}
    </section>
  )
}

function Account() {
  return (
    <main className="account">
      <h1 className="account__title">Account</h1>
      <ProfileForm />
      <PasswordForm />
      <DeleteAccount />
    </main>
  )
}

export default Account
