'use client'

import { useState } from 'react'
import styles from './SaveArea.module.css'

interface SaveAreaProps {
  onSave: (token: string) => Promise<void>
  hasSignedUrl: boolean
}

export default function SaveArea({ onSave, hasSignedUrl }: SaveAreaProps) {
  const [token, setToken]     = useState('')
  const [show, setShow]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  async function handleSave() {
    if (!hasSignedUrl && !token.trim()) {
      setError('Enter your Borealis API token.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSave(token)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.wrap}>
      {error && <span className={styles.error}>{error}</span>}
      <div className={styles.row}>
        {!hasSignedUrl && (
          <>
            <input
              type={show ? 'text' : 'password'}
              className={styles.input}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Borealis API token"
            />
            <button className={styles.eyeBtn} onClick={() => setShow((s) => !s)} title="Show/hide token">
              <EyeIcon crossed={show} />
            </button>
          </>
        )}
        <button
          className={`${styles.btn} ${styles.btnAccent}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'saving…' : saved ? 'saved!' : 'save to dataset'}
        </button>
      </div>
    </div>
  )
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 7C1 7 3 3 7 3C11 3 13 7 13 7C13 7 11 11 7 11C3 11 1 7 1 7Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
      {crossed && <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.2" />}
    </svg>
  )
}
