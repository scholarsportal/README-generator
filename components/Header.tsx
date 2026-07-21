'use client'

import { useState, useEffect } from 'react'
import styles from './Header.module.css'

interface HeaderProps {
  hasReadme: boolean
  onCopy: () => void
  onDownload: (ext: 'md' | 'txt') => void
  saveArea?: React.ReactNode
}

export default function Header({ hasReadme, onCopy, onDownload, saveArea }: HeaderProps) {
  const [dark, setDark] = useState<boolean | null>(null)

  useEffect(() => {
    // On mount, check if a manual preference is set
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') setDark(true)
    else if (stored === 'light') setDark(false)
    else setDark(null) // follow system
  }, [])

  useEffect(() => {
    if (dark === null) {
      document.documentElement.classList.remove('dark', 'light')
      localStorage.removeItem('theme')
    } else if (dark) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  function toggleTheme() {
    setDark((prev) => {
      if (prev === null) {
        // check current system preference
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        return !systemDark
      }
      return !prev
    })
  }

  const isDarkMode = dark !== null
    ? dark
    : (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <header className={styles.header}>
      <div className={styles.wordmark}>
        Borealis README<em>.</em>gen
      </div>
      <div className={styles.badge}>external tool</div>
      <InfoTooltip />
      <button className={styles.themeToggle} onClick={toggleTheme} title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
        {isDarkMode ? <SunIcon /> : <MoonIcon />}
      </button>
      <div className={styles.actions}>
        {hasReadme && (
          <>
            {saveArea}
            <button className={`${styles.btn} ${styles.btnSm}`} onClick={onCopy}>
              copy markdown
            </button>
            <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => onDownload('txt')}>
              download .txt
            </button>
            <button className={`${styles.btn} ${styles.btnSm} ${styles.btnAccent}`} onClick={() => onDownload('md')}>
              download .md
            </button>
          </>
        )}
      </div>
    </header>
  )
}

function InfoTooltip() {
  const [visible, setVisible] = useState(false)
  return (
    <div className={styles.infoWrap}>
      <button
        className={styles.infoBtn}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="About this tool"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M7 6.5V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="7" cy="4.5" r="0.7" fill="currentColor"/>
        </svg>
      </button>
      {visible && (
        <div className={styles.tooltip}>
          Generate a README.md for your Borealis dataset. Choose Minimum for essential fields,
          or Advanced to select exactly which sections to include.
        </div>
      )}
    </div>
  )
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="7" y1="1" x2="7" y2="2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="7" y1="11.5" x2="7" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="1" y1="7" x2="2.5" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="11.5" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="2.93" y1="2.93" x2="3.99" y2="3.99" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="10.01" y1="10.01" x2="11.07" y2="11.07" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="11.07" y1="2.93" x2="10.01" y2="3.99" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="3.99" y1="10.01" x2="2.93" y2="11.07" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M11.5 8.5A5 5 0 0 1 5.5 2.5a5 5 0 1 0 6 6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
