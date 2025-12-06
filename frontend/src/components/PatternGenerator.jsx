import React, { useState } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

export default function PatternGenerator() {
  const [pattern, setPattern] = useState('WsLaWLLrrSa')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const generate = async () => {
    setError('')
    setPassword('')
    try {
      const response = await axios.get(`${API_BASE}/generator`, { params: { pattern } })
      setPassword(response.data.password)
    } catch (err) {
      const detail = err.response?.data?.detail || 'Could not generate password'
      setError(detail)
    }
  }

  return (
    <section className="card">
      <h2 className="text-xl font-semibold">Password Generator</h2>
      <p className="text-sm text-gray-600">Use legacy pattern syntax (w, W, n, s, r, S, a, and * multipliers).</p>
      <div className="space-y-3">
        <input
          className="input"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Pattern e.g., WsLaWLLrrSa or r*16"
        />
        <button className="button-primary" onClick={generate}>Generate</button>
        {password && (
          <div className="rounded-md bg-uvu-600 px-3 py-2 text-white">
            <p className="text-sm font-semibold">Generated password</p>
            <p className="break-all font-mono text-sm">{password}</p>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </section>
  )
}
