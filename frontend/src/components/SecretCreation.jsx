import React, { useState } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

export default function SecretCreation() {
  const [secret, setSecret] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [ttlSeconds, setTtlSeconds] = useState(3600)
  const [expirationMethod, setExpirationMethod] = useState('one_time')
  const [link, setLink] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLink('')

    try {
      const response = await axios.post(`${API_BASE}/secret`, {
        secret,
        passphrase: passphrase || null,
        expiration_method: expirationMethod,
        ttl_seconds: expirationMethod === 'time' ? Number(ttlSeconds) : undefined
      })

      const id = response.data.id
      const shareLink = `${window.location.origin}/secret/${id}`
      setLink(shareLink)
    } catch (err) {
      const detail = err.response?.data?.detail || 'Unable to create secret'
      setError(detail)
    }
  }

  const copyToClipboard = async () => {
    if (link) {
      await navigator.clipboard.writeText(link)
    }
  }

  return (
    <section className="card">
      <h2 className="text-xl font-semibold">Create a Secret</h2>
      <p className="text-sm text-gray-600">Encrypt server-side, protect with a passphrase, and burn after viewing.</p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700">Secret</label>
          <textarea
            className="input h-28"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Paste sensitive text here"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Passphrase (optional)</label>
          <input
            className="input"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Defaults to 'uvu' if empty"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Expiration Method</label>
            <div className="flex gap-3">
              <button
                type="button"
                className={`button-secondary ${expirationMethod === 'one_time' ? 'ring-2 ring-uvu-500' : ''}`}
                onClick={() => setExpirationMethod('one_time')}
              >
                One-time view
              </button>
              <button
                type="button"
                className={`button-secondary ${expirationMethod === 'time' ? 'ring-2 ring-uvu-500' : ''}`}
                onClick={() => setExpirationMethod('time')}
              >
                Time-based
              </button>
            </div>
          </div>
          {expirationMethod === 'time' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">TTL (seconds)</label>
              <input
                className="input"
                type="number"
                min="60"
                value={ttlSeconds}
                onChange={(e) => setTtlSeconds(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="button-primary">Create secret</button>
          {link && (
            <button type="button" className="button-secondary" onClick={copyToClipboard}>
              Copy link
            </button>
          )}
        </div>
        {link && (
          <div className="rounded-md bg-green-50 p-3 text-green-800">
            <p className="text-sm font-medium">Share this link:</p>
            <p className="break-all text-sm">{link}</p>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </section>
  )
}
