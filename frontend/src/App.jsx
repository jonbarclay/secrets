import React from 'react'
import { Routes, Route } from 'react-router-dom'
import SecretCreation from './components/SecretCreation'
import SecretRetrieval from './components/SecretRetrieval'

function Home() {
    return (
      <main className="flex justify-center p-6">
        <SecretCreation />
      </main>
    )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-uvu-700 to-uvu-500 text-white">
      <header className="px-6 py-4 shadow-lg bg-opacity-80 backdrop-blur">
        <h1 className="text-3xl font-semibold">Secret Vault</h1>
        <p className="text-sm text-green-100">Secure, one-time secret sharing with burn-on-view support.</p>
      </header>
      
      <div className="container mx-auto max-w-6xl">
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/secret/:id" element={<main className="p-6 max-w-2xl mx-auto"><SecretRetrieval /></main>} />
        </Routes>
      </div>
    </div>
  )
}
