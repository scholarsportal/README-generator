'use client'

import { useState } from 'react'
import type { DatasetMeta, DataFile, Section } from '@/lib/types'
import { ALL_SECTIONS } from '@/lib/types'
import { formatBytes, fileExt, buildTree } from '@/lib/template'
import type { TreeNode } from '@/lib/types'
import styles from './Sidebar.module.css'

interface SidebarProps {
  pid: string
  onPidChange: (pid: string) => void
  token: string
  onTokenChange: (t: string) => void
  hasSignedUrls: boolean
  onFetch: () => void
  fetching: boolean
  meta: DatasetMeta | null
  files: DataFile[]
  selectedIds: Set<number>
  onToggleFile: (id: number, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
  sections: Section[]
  onToggleSection: (s: Section) => void
  onGenerate: () => void
  generating: boolean
  error: string
}

const SECTION_LABELS: Record<Section, string> = {
  overview:    'overview',
  citation:    'citation',
  files:       'file descriptions',
  variables:   'variable codebook',
  methodology: 'methodology',
  access:      'access & license',
  contact:     'contact',
  related:     'related works',
}

export default function Sidebar({
  pid, onPidChange, token, onTokenChange, hasSignedUrls,
  onFetch, fetching,
  meta, files, selectedIds, onToggleFile, onToggleAll,
  sections, onToggleSection,
  onGenerate, generating,
  error,
}: SidebarProps) {
  const tree = files.length ? buildTree(files) : null
  const canGenerate = !!meta && selectedIds.size > 0 && !generating

  return (
    <aside className={styles.sidebar}>
      <div className={styles.scroll}>

        {/* Dataset PID */}
        <div className={styles.field}>
          <label className={styles.label}>Dataset PID</label>
          <input
            type="text"
            className={styles.input}
            value={pid}
            onChange={(e) => onPidChange(e.target.value)}
            placeholder="doi:10.5683/SP3/…"
            onKeyDown={(e) => e.key === 'Enter' && onFetch()}
          />
          {/* Token field — only shown when not launched via signed URL */}
          {!hasSignedUrls && (
            <input
              type="password"
              className={styles.input}
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              placeholder="API Token"
            />
          )}
          <button
            className={`${styles.btn} ${styles.btnFull}`}
            onClick={onFetch}
            disabled={fetching}
          >
            {fetching ? 'fetching…' : 'fetch from Borealis'}
          </button>
          {!hasSignedUrls && (
            <span className={styles.hint}>
              API token only needed for unpublished datasets
            </span>
          )}
        </div>

        {/* Error */}
        {error && <div className={styles.error}>{error}</div>}

        {/* Dataset meta */}
        {meta && (
          <div>
            <label className={styles.label}>Dataset</label>
            <div className={styles.metaCard}>
              {[
                ['title',   meta.title],
                ['authors', meta.authors],
                ['DOI',     meta.doi],
                ['version', meta.version],
                ['license', meta.license],
              ].filter(([, v]) => v).map(([k, v]) => (
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
              <span className={styles.pill}>{selectedIds.size} / {files.length}</span>
            </div>
            <div className={styles.selectAllRow}>
              <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => onToggleAll(true)}>select all</button>
              <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => onToggleAll(false)}>none</button>
            </div>
            <div className={styles.fileTree}>
              <TreeLevel
                node={tree}
                files={files}
                selectedIds={selectedIds}
                onToggleFile={onToggleFile}
                depth={0}
              />
            </div>
          </div>
        )}

        <hr className={styles.divider} />

        {/* Section toggles */}
        <div>
          <label className={styles.label}>README sections</label>
          <div className={styles.toggleGrid}>
            {ALL_SECTIONS.map((s) => (
              <label key={s} className={styles.toggleItem}>
                <input
                  type="checkbox"
                  checked={sections.includes(s)}
                  onChange={(e) => onToggleSection(s)}
                />
                {SECTION_LABELS[s]}
              </label>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          className={`${styles.btn} ${styles.btnAccent} ${styles.btnFull}`}
          onClick={onGenerate}
          disabled={!canGenerate}
        >
          {generating ? 'generating…' : 'generate README'}
        </button>

      </div>
    </aside>
  )
}

// ── File tree sub-component ───────────────────────────────────────────────────

function TreeLevel({
  node, files, selectedIds, onToggleFile, depth,
}: {
  node: TreeNode
  files: DataFile[]
  selectedIds: Set<number>
  onToggleFile: (id: number, checked: boolean) => void
  depth: number
}) {
  return (
    <>
      {node.files.map((f) => (
        <label
          key={f.id}
          className={styles.fileItem}
          style={{ paddingLeft: 8 + depth * 16 }}
        >
          <input
            type="checkbox"
            checked={selectedIds.has(f.id)}
            onChange={(e) => onToggleFile(f.id, e.target.checked)}
          />
          <span className={styles.extBadge}>{fileExt(f.name)}</span>
          <span className={styles.fileName} title={f.name}>{f.name}</span>
          <span className={styles.fileSize}>{formatBytes(f.size)}</span>
        </label>
      ))}
      {Object.entries(node.dirs).map(([dirName, child]) => (
        <FolderNode
          key={dirName}
          name={dirName}
          node={child}
          files={files}
          selectedIds={selectedIds}
          onToggleFile={onToggleFile}
          depth={depth}
        />
      ))}
    </>
  )
}

function FolderNode({
  name, node, files, selectedIds, onToggleFile, depth,
}: {
  name: string
  node: TreeNode
  files: DataFile[]
  selectedIds: Set<number>
  onToggleFile: (id: number, checked: boolean) => void
  depth: number
}) {
  const [open, setOpen] = useState(true)

  // collect all file ids in this subtree
  function collectIds(n: TreeNode): number[] {
    return [
      ...n.files.map((f) => f.id),
      ...Object.values(n.dirs).flatMap(collectIds),
    ]
  }

  const allIds = collectIds(node)
  const allChecked = allIds.every((id) => selectedIds.has(id))

  function handleFolderCheck(checked: boolean) {
    allIds.forEach((id) => onToggleFile(id, checked))
  }

  return (
    <>
      <div className={styles.folderRow} style={{ paddingLeft: 8 + depth * 16 }}>
        <button className={styles.folderToggle} onClick={() => setOpen((o) => !o)}>
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }}
          >
            <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <input
          type="checkbox"
          className={styles.folderCb}
          checked={allChecked}
          onChange={(e) => handleFolderCheck(e.target.checked)}
        />
        <svg width="16" height="16" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, color: 'var(--muted)' }}>
          <path d="M1 3.5C1 2.67 1.67 2 2.5 2H4.5L5.5 3H9.5C10.33 3 11 3.67 11 4.5V8.5C11 9.33 10.33 10 9.5 10H2.5C1.67 10 1 9.33 1 8.5V3.5Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1" />
        </svg>
        <span className={styles.folderName}>{name}</span>
      </div>
      {open && (
        <div>
          <TreeLevel
            node={node}
            files={files}
            selectedIds={selectedIds}
            onToggleFile={onToggleFile}
            depth={depth + 1}
          />
        </div>
      )}
    </>
  )
}
