'use client'

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
