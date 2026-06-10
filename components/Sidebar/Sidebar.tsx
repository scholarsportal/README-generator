'use client'

import { useState } from 'react'
import type { DatasetMeta, DataFile, Section, GenerationMode, CustomSection } from '@/lib/types'
import { SECTION_META, PINK_SECTIONS, GREEN_SECTIONS } from '@/lib/types'
import { formatBytes, fileExt, buildTree } from '@/lib/template'
import type { TreeNode } from '@/lib/types'
import styles from './Sidebar.module.css'

interface SidebarProps {
  token: string
  onTokenChange: (t: string) => void
  hasSignedUrls: boolean
  fetching: boolean
  meta: DatasetMeta | null
  files: DataFile[]
  selectedIds: Set<number>
  onToggleFile: (id: number, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
  sections: Section[]
  onToggleSection: (s: Section) => void
  mode: GenerationMode
  onModeChange: (m: GenerationMode) => void
  customSections: CustomSection[]
  onAddCustomSection: (section: CustomSection) => void
  onRemoveCustomSection: (id: string) => void
  onUpdateCustomSection: (id: string, field: 'title' | 'content', value: string) => void
  onGenerate: () => void
  generating: boolean
  error: string
}

export default function Sidebar({
  fetching,
  meta, files, selectedIds, onToggleFile, onToggleAll,
  sections, onToggleSection,
  mode, onModeChange,
  customSections, onAddCustomSection, onRemoveCustomSection, onUpdateCustomSection,
  onGenerate, generating,
  error,
}: SidebarProps) {
  const tree = files.length ? buildTree(files) : null
  const unrestrictedFiles = files.filter((f) => !(f as DataFile & { restricted?: boolean }).restricted)
  const canGenerate = !!meta && selectedIds.size > 0 && !generating

  const allMinChecked = PINK_SECTIONS.every((s) => sections.includes(s))
  const allEnhChecked = GREEN_SECTIONS.every((s) => sections.includes(s))

  function toggleAllMin(checked: boolean) {
    PINK_SECTIONS.forEach((s) => {
      const has = sections.includes(s)
      if (checked && !has) onToggleSection(s)
      if (!checked && has) onToggleSection(s)
    })
  }

  function toggleAllEnh(checked: boolean) {
    GREEN_SECTIONS.forEach((s) => {
      const has = sections.includes(s)
      if (checked && !has) onToggleSection(s)
      if (!checked && has) onToggleSection(s)
    })
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.scroll}>

        {/* Loading state */}
        {fetching && (
          <div className={styles.fetchingState}>
            <div className={styles.spinner} />
            <span>Loading dataset…</span>
          </div>
        )}

        {/* Error */}
        {error && <div className={styles.error}>{error}</div>}

        {/* Dataset meta */}
        {meta && (
          <div>
            <label className={styles.label}>Dataset</label>
            <div className={styles.metaCard}>
              {([['title', meta.title], ['authors', meta.authors], ['DOI', meta.doi], ['version', meta.version], ['license', meta.license]] as [string, string][])
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className={styles.metaRow}>
                    <span className={styles.metaKey}>{k}</span>
                    <span className={styles.metaVal}>{v}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* File tree */}
        {tree && (
          <div>
            <div className={styles.fileHeader}>
              <label className={styles.label} style={{ margin: 0 }}>Files to include</label>
              <span className={styles.pill}>{selectedIds.size} / {unrestrictedFiles.length}</span>
            </div>
            <div className={styles.selectAllRow}>
              <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => onToggleAll(true)}>select all</button>
              <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => onToggleAll(false)}>none</button>
            </div>
            <div className={styles.fileTree}>
              <TreeLevel node={tree} files={files} selectedIds={selectedIds} onToggleFile={onToggleFile} depth={0} />
            </div>
          </div>
        )}

        {meta && <hr className={styles.divider} />}

        {/* Generation mode */}
        {meta && (
          <div>
            <label className={styles.label}>Generation mode</label>
            <div className={styles.modeToggle}>
              <button
                className={`${styles.modeBtn} ${mode === 'basic' ? styles.modeBtnActive : ''}`}
                onClick={() => onModeChange('basic')}
              >
                <span className={styles.modeBtnTitle}>Minimum</span>
                <span className={styles.modeBtnSub}>Core README fields</span>
              </button>
              <button
                className={`${styles.modeBtn} ${mode === 'advanced' ? styles.modeBtnActive : ''}`}
                onClick={() => onModeChange('advanced')}
              >
                <span className={styles.modeBtnTitle}>Advanced</span>
                <span className={styles.modeBtnSub}>Choose your sections</span>
              </button>
            </div>
          </div>
        )}

        {/* Section toggles — advanced only */}
        {mode === 'advanced' && (
          <div>
            <div className={styles.tierBlock}>
              <div className={styles.tierLabelRow}>
                <div className={styles.tierLabel}>
                  <span className={styles.tierDot} style={{ background: '#ea9999' }} />
                  Minimum README
                </div>
                <label className={styles.selectAllCheck}>
                  <input
                    type="checkbox"
                    checked={allMinChecked}
                    onChange={(e) => toggleAllMin(e.target.checked)}
                  />
                  all
                </label>
              </div>
              {PINK_SECTIONS.map((s) => (
                <label key={s} className={styles.toggleItem}>
                  <input type="checkbox" checked={sections.includes(s)} onChange={() => onToggleSection(s)} />
                  {SECTION_META[s].label}
                </label>
              ))}
            </div>
            <div className={styles.tierBlock}>
              <div className={styles.tierLabelRow}>
                <div className={styles.tierLabel}>
                  <span className={styles.tierDot} style={{ background: '#93c47d' }} />
                  Enhanced README
                </div>
                <label className={styles.selectAllCheck}>
                  <input
                    type="checkbox"
                    checked={allEnhChecked}
                    onChange={(e) => toggleAllEnh(e.target.checked)}
                  />
                  all
                </label>
              </div>
              {GREEN_SECTIONS.map((s) => (
                <label key={s} className={styles.toggleItem}>
                  <input type="checkbox" checked={sections.includes(s)} onChange={() => onToggleSection(s)} />
                  {SECTION_META[s].label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Custom sections — advanced only */}
        {mode === 'advanced' && (
          <div>
            <div className={styles.tierLabel} style={{ marginBottom: 8 }}>
              <span className={styles.tierDot} style={{ background: 'var(--border-mid)' }} />
              Custom sections
            </div>
            {customSections.map((cs) => (
              <div key={cs.id} className={styles.customCard}>
                <div className={styles.customCardHeader}>
                  <input
                    type="text"
                    className={styles.customTitleInput}
                    value={cs.title}
                    onChange={(e) => onUpdateCustomSection(cs.id, 'title', e.target.value)}
                    placeholder="Section title"
                  />
                  <button className={styles.removeBtn} onClick={() => onRemoveCustomSection(cs.id)} title="Remove">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                <textarea
                  className={styles.customContentInput}
                  value={cs.content}
                  onChange={(e) => onUpdateCustomSection(cs.id, 'content', e.target.value)}
                  placeholder="Section content…"
                  rows={3}
                />
              </div>
            ))}
            <button
              className={`${styles.btn} ${styles.btnFull}`}
              onClick={() => onAddCustomSection({ id: crypto.randomUUID(), title: '', content: '' })}
            >
              + add custom section
            </button>
          </div>
        )}

        {/* Minimum mode summary */}
        {mode === 'basic' && meta && (
          <div className={styles.basicSummary}>
            <div className={styles.basicSummaryTitle}>Will include:</div>
            {PINK_SECTIONS.map((s) => (
              <div key={s} className={styles.basicSummaryItem}>
                <span className={styles.basicDot} />
                {SECTION_META[s].label}
              </div>
            ))}
          </div>
        )}

        {/* Generate button */}
        {meta && (
          <button
            className={`${styles.btn} ${styles.btnAccent} ${styles.btnFull}`}
            onClick={onGenerate}
            disabled={!canGenerate}
          >
            {generating ? 'generating…' : 'generate README'}
          </button>
        )}

      </div>
    </aside>
  )
}

// ── File tree ─────────────────────────────────────────────────────────────────

function TreeLevel({ node, files, selectedIds, onToggleFile, depth }: {
  node: TreeNode; files: DataFile[]; selectedIds: Set<number>
  onToggleFile: (id: number, checked: boolean) => void; depth: number
}) {
  return (
    <>
      {node.files.map((f) => {
        const restricted = (f as DataFile & { restricted?: boolean }).restricted
        return restricted
          ? <RestrictedFileItem key={f.id} file={f} depth={depth} />
          : (
            <label key={f.id} className={styles.fileItem} style={{ paddingLeft: 8 + depth * 16 }}>
              <input type="checkbox" checked={selectedIds.has(f.id)} onChange={(e) => onToggleFile(f.id, e.target.checked)} />
              <span className={styles.extBadge}>{fileExt(f.name)}</span>
              <span className={styles.fileName} title={f.name}>{f.name}</span>
              <span className={styles.fileSize}>{formatBytes(f.size)}</span>
            </label>
          )
      })}
      {Object.entries(node.dirs).map(([dirName, child]) => (
        <FolderNode key={dirName} name={dirName} node={child} files={files} selectedIds={selectedIds} onToggleFile={onToggleFile} depth={depth} />
      ))}
    </>
  )
}

function RestrictedFileItem({ file, depth }: { file: DataFile & { restricted?: boolean }; depth: number }) {
  const [showTip, setShowTip] = useState(false)
  return (
    <div
      className={`${styles.fileItem} ${styles.fileItemRestricted}`}
      style={{ paddingLeft: 8 + depth * 16 }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      title="Restricted — not available for README generation"
    >
      <LockIcon />
      <span className={styles.extBadge} style={{ opacity: 0.4 }}>{fileExt(file.name)}</span>
      <span className={styles.fileName} style={{ opacity: 0.4 }} title={file.name}>{file.name}</span>
      <span className={styles.fileSize} style={{ opacity: 0.4 }}>{formatBytes(file.size)}</span>
      {showTip && (
        <span className={styles.restrictedTip}>Restricted file</span>
      )}
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
      <rect x="2" y="5" width="8" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4 5V3.5a2 2 0 0 1 4 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function FolderNode({ name, node, files, selectedIds, onToggleFile, depth }: {
  name: string; node: TreeNode; files: DataFile[]; selectedIds: Set<number>
  onToggleFile: (id: number, checked: boolean) => void; depth: number
}) {
  const [open, setOpen] = useState(true)

  function collectIds(n: TreeNode): number[] {
    return [...n.files.filter((f) => !(f as DataFile & { restricted?: boolean }).restricted).map((f) => f.id), ...Object.values(n.dirs).flatMap(collectIds)]
  }

  const allIds = collectIds(node)
  const allChecked = allIds.length > 0 && allIds.every((id) => selectedIds.has(id))

  return (
    <>
      <div className={styles.folderRow} style={{ paddingLeft: 8 + depth * 16 }}>
        <button className={styles.folderToggle} onClick={() => setOpen((o) => !o)}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>
            <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <input type="checkbox" className={styles.folderCb} checked={allChecked} onChange={(e) => allIds.forEach((id) => onToggleFile(id, e.target.checked))} />
        <svg width="16" height="16" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, color: 'var(--muted)' }}>
          <path d="M1 3.5C1 2.67 1.67 2 2.5 2H4.5L5.5 3H9.5C10.33 3 11 3.67 11 4.5V8.5C11 9.33 10.33 10 9.5 10H2.5C1.67 10 1 9.33 1 8.5V3.5Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1" />
        </svg>
        <span className={styles.folderName}>{name}</span>
      </div>
      {open && (
        <TreeLevel node={node} files={files} selectedIds={selectedIds} onToggleFile={onToggleFile} depth={depth + 1} />
      )}
    </>
  )
}
