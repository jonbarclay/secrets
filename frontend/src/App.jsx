import React from 'react'
import SecretCreation from './components/SecretCreation'
import PatternGenerator from './components/PatternGenerator'

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-uvu-700 to-uvu-500 text-white">
      <header className="px-6 py-4 shadow-lg bg-opacity-80 backdrop-blur">
        <h1 className="text-3xl font-semibold">Secret Vault</h1>
        <p className="text-sm text-green-100">Secure, one-time secret sharing with burn-on-view support.</p>
      </header>
      <main className="grid gap-6 p-6 md:grid-cols-2">
        <SecretCreation />
        <PatternGenerator />
      </main>
    </div>
  )
}
