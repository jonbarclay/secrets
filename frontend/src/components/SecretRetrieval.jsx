import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export default function SecretRetrieval() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [exists, setExists] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [secretContent, setSecretContent] = useState('')
  const [isRevealed, setIsRevealed] = useState(false)

  useEffect(() => {
    const checkExistence = async () => {
      try {
        await axios.get(`${API_BASE}/secret/${id}`)
        setExists(true)
      } catch (err) {
        if (err.response && (err.response.status === 404 || err.response.status === 410)) {
          setError('Secret not found or has already been burned.')
        } else {
          setError('Error checking secret status.')
        }
      } finally {
        setLoading(false)
      }
    }
    
    if (id) {
        checkExistence()
    }
  }, [id])

  const handleUnlock = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      const response = await axios.post(`${API_BASE}/secret/${id}/unlock`, {
        passphrase: password || null
      })
      setSecretContent(response.data.secret)
      setIsRevealed(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Incorrect password or unable to unlock.')
    }
  }

  const copyToClipboard = async () => {
    if (secretContent) {
        await navigator.clipboard.writeText(secretContent)
    }
  }

  if (loading) {
    return (
      <div className="card text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (error && !exists) {
     return (
        <div className="card text-center space-y-4">
            <h2 className="text-xl font-semibold text-red-600">404 Not Found</h2>
            <p className="text-gray-700">{error}</p>
            <Link to="/" className="button-primary inline-block">Create a New Secret</Link>
        </div>
     )
  }

  if (isRevealed) {
    return (
        <div className="card space-y-4">
            <h2 className="text-xl font-semibold text-green-700">Secret Unlocked</h2>
             <div className="relative">
                <textarea 
                    readOnly 
                    className="input h-32 bg-gray-50 font-mono text-sm"
                    value={secretContent}
                />
             </div>
             <div className="flex gap-3">
                 <button onClick={copyToClipboard} className="button-secondary">Copy Content</button>
                 <Link to="/" className="button-primary">Create New</Link>
             </div>
             <div className="rounded-md bg-yellow-50 p-3 text-yellow-800 text-sm">
                 <p><strong>Warning:</strong> If this was a one-time secret, it has now been deleted from the server.</p>
             </div>
        </div>
    )
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-xl font-semibold">Unlock Secret</h2>
      <p className="text-sm text-gray-600">This secret is password protected. Enter the passphrase to view it.</p>
      
      <form onSubmit={handleUnlock} className="space-y-4">
        <div>
           <label className="block text-sm font-medium text-gray-700">Passphrase</label>
           <input 
             type="password"
             className="input"
             placeholder="Enter passphrase (default: 'uvu')"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
           />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="button-primary w-full">View Secret</button>
      </form>
    </div>
  )
}
