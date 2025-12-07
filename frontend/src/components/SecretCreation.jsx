import React, { useState } from 'react'
import axios from 'axios'
import { ChevronDown, ChevronUp, Copy, Lock, Shield, Clock, Hash, Check, RefreshCw } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const WORD_LIST = [
  'apple', 'bridge', 'cloud', 'delta', 'eagle', 'forest', 'giant', 'harbor', 'island', 'jungle',
  'knight', 'lunar', 'mount', 'noble', 'ocean', 'pilot', 'quest', 'river', 'solar', 'tiger',
  'urban', 'valley', 'winter', 'xenon', 'yacht', 'zebra', 'acorn', 'beacon', 'cactus', 'drift',
  'ember', 'falcon', 'grove', 'haven', 'iris', 'jasper', 'kestrel', 'lemon', 'maple', 'north',
  'oasis', 'pebble', 'quartz', 'raven', 'stone', 'topaz', 'unity', 'vapor', 'willow', 'azure'
]

export default function SecretCreation() {
  const [secret, setSecret] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [ttlValue, setTtlValue] = useState(7)
  const [ttlUnit, setTtlUnit] = useState('days')
  const [expirationMethod, setExpirationMethod] = useState('one_time')
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  
  // Generator State
  const [showGenSettings, setShowGenSettings] = useState(false)
  const [genMode, setGenMode] = useState('random') // 'random' or 'passphrase'
  
  // Random Mode Settings
  const [length, setLength] = useState(16)
  const [useUpper, setUseUpper] = useState(true)
  const [useNumbers, setUseNumbers] = useState(true)
  const [useSymbols, setUseSymbols] = useState(true)

  // Passphrase Mode Settings
  const [wordCount, setWordCount] = useState(4)
  const [separator, setSeparator] = useState('mixed')
  const [capitalize, setCapitalize] = useState(false)

  const generatePassword = () => {
    if (genMode === 'random') {
        const charsetLower = 'abcdefghijklmnopqrstuvwxyz'
        const charsetUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const charsetNumbers = '0123456789'
        const charsetSymbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'

        let charset = charsetLower
        if (useUpper) charset += charsetUpper
        if (useNumbers) charset += charsetNumbers
        if (useSymbols) charset += charsetSymbols

        let newPassword = ''
        const cryptoObj = window.crypto || window.msCrypto
        const randomValues = new Uint32Array(length)
        cryptoObj.getRandomValues(randomValues)

        for (let i = 0; i < length; i++) {
            newPassword += charset[randomValues[i] % charset.length]
        }
        setSecret(newPassword)
    } else {
        // Passphrase Mode
        const selectedWords = []
        const cryptoObj = window.crypto || window.msCrypto
        const randomValues = new Uint32Array(wordCount)
        cryptoObj.getRandomValues(randomValues)

        for (let i = 0; i < wordCount; i++) {
            let word = WORD_LIST[randomValues[i] % WORD_LIST.length]
            if (capitalize) {
                word = word.charAt(0).toUpperCase() + word.slice(1)
            }
            selectedWords.push(word)
        }

        if (separator === 'mixed') {
            const separators = '!@#$%^&*-_+=.|~'
            let mixedSecret = selectedWords[0]
            const sepValues = new Uint32Array(wordCount - 1)
            cryptoObj.getRandomValues(sepValues)
            
            for (let i = 1; i < selectedWords.length; i++) {
                const sep = separators[sepValues[i-1] % separators.length]
                mixedSecret += sep + selectedWords[i]
            }
            setSecret(mixedSecret)
        } else {
            setSecret(selectedWords.join(separator))
        }
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLink('')

    try {
      const ttlSeconds =
        expirationMethod === 'time'
          ? ttlValue * (ttlUnit === 'days' ? 86400 : ttlUnit === 'hours' ? 3600 : 60)
          : undefined

      const response = await axios.post(`${API_BASE}/secret`, {
        secret,
        passphrase: passphrase || null,
        expiration_method: expirationMethod,
        ttl_seconds: ttlSeconds
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
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <section className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100">
        <div className="bg-uvu-700 p-6 text-white">
             <h2 className="text-2xl font-bold flex items-center gap-2">
                <Lock className="w-6 h-6" /> Create a Secret
             </h2>
             <p className="text-gray-100 mt-1 text-sm">Encrypt text, secure with a password, and create a self-destructing link.</p>
        </div>

        <div className="p-6 space-y-6">
            {/* Secret Input Area with Integrated Generator */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-gray-700">Secret Content</label>
                <div className="flex items-center gap-2">
                    <button 
                        type="button" 
                        onClick={generatePassword}
                        className="text-xs bg-gray-100 text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors font-medium flex items-center gap-1"
                    >
                        <RefreshCw className="w-3 h-3" /> Generate Password
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setShowGenSettings(!showGenSettings)}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                        {showGenSettings ? 'Hide Settings' : 'Settings'}
                    </button>
                </div>
              </div>

              {/* Collapsible Generator Settings */}
              {showGenSettings && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm space-y-3 animate-in slide-in-from-top-2">
                      <div className="flex gap-4 border-b border-gray-200 pb-2">
                          <button 
                            className={`text-xs font-semibold pb-1 ${genMode === 'random' ? 'text-uvu-700 border-b-2 border-uvu-700' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setGenMode('random')}
                          >
                              Random Characters
                          </button>
                          <button 
                            className={`text-xs font-semibold pb-1 ${genMode === 'passphrase' ? 'text-uvu-700 border-b-2 border-uvu-700' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setGenMode('passphrase')}
                          >
                              Passphrase (Words)
                          </button>
                      </div>

                      {genMode === 'random' ? (
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Length: {length}</label>
                                  <input 
                                    type="range" min="8" max="64" value={length} 
                                    onChange={(e) => setLength(Number(e.target.value))}
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                  />
                              </div>
                              <div className="flex flex-col gap-1">
                                  <label className="flex items-center gap-2 text-xs text-gray-700">
                                      <input type="checkbox" checked={useUpper} onChange={(e) => setUseUpper(e.target.checked)} className="rounded text-uvu-600 focus:ring-uvu-500" /> Uppercase (A-Z)
                                  </label>
                                  <label className="flex items-center gap-2 text-xs text-gray-700">
                                      <input type="checkbox" checked={useNumbers} onChange={(e) => setUseNumbers(e.target.checked)} className="rounded text-uvu-600 focus:ring-uvu-500" /> Numbers (0-9)
                                  </label>
                                  <label className="flex items-center gap-2 text-xs text-gray-700">
                                      <input type="checkbox" checked={useSymbols} onChange={(e) => setUseSymbols(e.target.checked)} className="rounded text-uvu-600 focus:ring-uvu-500" /> Symbols (!@#)
                                  </label>
                              </div>
                          </div>
                      ) : (
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Words: {wordCount}</label>
                                  <input 
                                    type="range" min="3" max="10" value={wordCount} 
                                    onChange={(e) => setWordCount(Number(e.target.value))}
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                  />
                              </div>
                              <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                      <label className="text-xs font-medium text-gray-600">Separator:</label>
                                      <select 
                                        value={separator} onChange={(e) => setSeparator(e.target.value)}
                                        className="text-xs border-gray-300 rounded focus:ring-uvu-500 focus:border-uvu-500 py-1 bg-white text-gray-900"
                                      >
                                          <option value="mixed">Mixed (Random)</option>
                                          <option value="-">- (Dash)</option>
                                          <option value="_">_ (Underscore)</option>
                                          <option value=".">. (Period)</option>
                                          <option value=" "> (Space)</option>
                                      </select>
                                  </div>
                                  <label className="flex items-center gap-2 text-xs text-gray-700">
                                      <input type="checkbox" checked={capitalize} onChange={(e) => setCapitalize(e.target.checked)} className="rounded text-uvu-600 focus:ring-uvu-500" /> Capitalize
                                  </label>
                              </div>
                          </div>
                      )}
                  </div>
              )}

              <textarea
                className="input h-32 w-full font-mono text-sm"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Paste sensitive text, passwords, or keys here..."
                required
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Passphrase */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-gray-400" /> Passphrase (Optional)
                        </label>
                        <input
                            className="input w-full"
                            type="password"
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            placeholder="Default: 'uvu'"
                        />
                    </div>
                
                    {/* Expiration */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" /> Expiration
                        </label>
                        <div className="flex rounded-md shadow-sm" role="group">
                            <button
                                type="button"
                                onClick={() => setExpirationMethod('one_time')}
                                className={`px-4 py-2 text-sm font-medium border rounded-l-lg flex-1 transition-colors ${
                                    expirationMethod === 'one_time'
                                    ? 'bg-uvu-600 text-white border-uvu-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                One-time
                            </button>
                            <button
                                type="button"
                                onClick={() => setExpirationMethod('time')}
                                className={`px-4 py-2 text-sm font-medium border rounded-r-lg flex-1 transition-colors ${
                                    expirationMethod === 'time'
                                    ? 'bg-uvu-600 text-white border-uvu-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                Timer
                            </button>
                        </div>
                        {expirationMethod === 'time' && (
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                <input
                                    className="input w-full col-span-2"
                                    type="number"
                                    min="1"
                                    value={ttlValue}
                                    onChange={(e) => setTtlValue(Number(e.target.value))}
                                    placeholder="Duration"
                                />
                                <select
                                    className="input w-full"
                                    value={ttlUnit}
                                    onChange={(e) => setTtlUnit(e.target.value)}
                                >
                                    <option value="days">Days</option>
                                    <option value="hours">Hours</option>
                                    <option value="minutes">Minutes</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <button type="submit" className="button-primary w-full py-3 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
                    Create Secret Link
                </button>

                {/* Result Area */}
                {link && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-4 animate-in fade-in slide-in-from-top-4 duration-300 space-y-3">
                    <p className="text-sm font-bold text-green-800">Secret Link Created!</p>
                    <div className="flex gap-2">
                        <input 
                            readOnly 
                            className="input text-sm font-mono bg-white text-gray-600" 
                            value={link} 
                        />
                        <button 
                            type="button" 
                            onClick={copyToClipboard} 
                            className={`px-4 py-2 rounded-md font-semibold text-white transition-colors flex items-center gap-2 ${copied ? 'bg-green-600 hover:bg-green-700' : 'bg-uvu-600 hover:bg-uvu-700'}`}
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                  </div>
                )}
                
                {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">{error}</div>}
            </form>
        </div>
      </section>
    </div>
  )
}
