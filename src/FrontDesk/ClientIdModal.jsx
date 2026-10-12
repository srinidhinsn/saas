import { useEffect, useRef, useState } from 'react'

export default function ClientIdModal({ open, onClose }) {
  const APP_URL = (import.meta.env.VITE_APP_URL || '').replace(/\/$/, '')
  const inputRef = useRef(null)
  const [clientId, setClientId] = useState(() => localStorage.getItem('client_id') || '')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setError('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const id = clientId.trim().toLowerCase()
    if (!id) return setError('Please enter your Client ID.')
    if (!/^[a-z0-9_-]+$/.test(id))
      return setError('Client ID can only contain letters, numbers, - and _.')

    localStorage.setItem('client_id', id)
    onClose()
    window.location.href = `${APP_URL}/saas/${id}/login`
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-color-modalsbg px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-id-title"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-slideUp overflow-hidden rounded-card-lg border border-border-default bg-bg-primary shadow-modal"
      >
        <div className="h-1 bg-bg-secondary" />

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-button bg-bg-secondary text-lg font-bold text-text-primary">
              T
            </span>
            <div>
              <h2 id="client-id-title" className="text-xl font-bold leading-tight tracking-tight text-text-primary">
                Sign in to TEKHAWK
              </h2>
              <p className="text-xs text-text-secondary">Software Solutions</p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-text-secondary">
            Enter your Client ID to continue to your workspace login.
          </p>

          <label htmlFor="client-id" className="mt-6 block text-sm font-medium text-text-primary">
            Client ID
          </label>
          <input
            id="client-id"
            ref={inputRef}
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value)
              setError('')
            }}
            placeholder="e.g. easyfood"
            autoComplete="off"
            aria-invalid={!!error}
            className={`mt-2 w-full rounded-input border bg-bg-primary px-4 py-3 text-text-primary outline-none transition focus:ring-2 ${
              error
                ? 'border-action-danger focus:border-action-danger focus:ring-action-danger/30'
                : 'border-border-default focus:border-bg-secondary focus:ring-bg-secondary/30'
            }`}
          />
          {error && <p className="mt-2 text-sm text-action-danger">{error}</p>}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-button border border-border-default bg-bg-primary px-4 py-3 font-medium text-text-primary transition hover:bg-bg-tertiary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-button bg-bg-secondary px-4 py-3 font-bold text-text-primary shadow-button transition hover:brightness-95"
            >
              Continue
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}