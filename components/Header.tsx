'use client'

import { useState } from 'react'
import styles from './Header.module.css'

interface HeaderProps {
  hasReadme: boolean
  onCopy: () => void
  onDownload: (ext: 'md' | 'txt') => void
  saveArea?: React.ReactNode
}
  
export default function Header({ hasReadme, onCopy, onDownload, saveArea }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.wordmark}>
        Borealis README<em>.</em>gen
      </div>
      <div className={styles.badge}>external tool</div>
      <InfoTooltip />
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
