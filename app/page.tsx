'use client'

import { Suspense } from 'react'
import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type { DatasetMeta, DataFile, Section, Tab, Status } from '@/lib/types'
import { DEFAULT_SECTIONS } from '@/lib/types'
import { fetchDatasetMeta, fetchFiles, fetchVariables, saveReadme } from '@/lib/borealis'
import { generateReadme, isTabular } from '@/lib/template'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar/Sidebar'
import Viewer from '@/components/Viewer/Viewer'
import SaveArea from '@/components/SaveArea'
import styles from './page.module.css'

const DEFAULT_PID = 'doi:10.5683/SP3/7HWSTS'

export default function Home() {
  return (
    <Suspense>
      <App />
    </Suspense>
  )
}

function App() {
  const searchParams = useSearchParams()

  // ── dataset state ──
  const [pid, setPid]             = useState(searchParams.get('datasetPid') || DEFAULT_PID)
  const [meta, setMeta]           = useState<DatasetMeta | null>(null)
  const [files, setFiles]         = useState<DataFile[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [fetching, setFetching]   = useState(false)
  const [fetchError, setFetchError] = useState('')

  // ── readme state ──
  const [sections, setSections]   = useState<Section[]>(DEFAULT_SECTIONS)
  const [markdown, setMarkdown]   = useState('')
  const [generating, setGenerating] = useState(false)

  // ── ui state ──
  const [tab, setTab]             = useState<Tab>('preview')
  const [status, setStatus]       = useState<Status>({ message: 'ready — fetch a dataset to begin', state: 'idle' })

  // auto-fetch on load if pid in query params
  useEffect(() => {
    if (searchParams.get('datasetPid')) handleFetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── fetch ──────────────────────────────────────────────────────────────────

  async function handleFetch() {
    if (!pid.trim()) return
    setFetching(true)
    setFetchError('')
    setStatus({ message: 'fetching dataset metadata…', state: 'active' })
    setMeta(null)
    setFiles([])
    setSelectedIds(new Set())
    setMarkdown('')

    try {
      const [metaData, fileData] = await Promise.all([
        fetchDatasetMeta(pid),
        fetchFiles(pid),
      ])
      setMeta(metaData)
      setFiles(fileData)
      setSelectedIds(new Set(fileData.map((f) => f.id)))
      setStatus({ message: `loaded — ${fileData.length} files found`, state: 'done' })
    } catch (e) {
      setFetchError(String(e))
      setStatus({ message: 'error fetching dataset', state: 'error' })
    } finally {
      setFetching(false)
    }
  }

  // ── file selection ─────────────────────────────────────────────────────────

  const handleToggleFile = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }, [])

  const handleToggleAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(files.map((f) => f.id)) : new Set())
  }, [files])

  // ── section toggles ────────────────────────────────────────────────────────

  const handleToggleSection = useCallback((s: Section) => {
    setSections((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }, [])

  // ── generate ───────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!meta) return
    setGenerating(true)

    const selectedFiles = files.filter((f) => selectedIds.has(f.id))
    const tabularFiles  = sections.includes('variables') ? selectedFiles.filter(isTabular) : []

    // fetch variable metadata for each tabular file
    const variableMap = new Map<number, Awaited<ReturnType<typeof fetchVariables>>>()
    for (const f of tabularFiles) {
      setStatus({ message: `fetching variables for ${f.name}…`, state: 'active' })
      const vars = await fetchVariables(f.id)
      variableMap.set(f.id, vars)
    }

    setStatus({ message: 'generating README…', state: 'active' })

    const md = generateReadme({
      meta,
      selectedFiles,
      allFiles: files,
      sections,
      variableMap,
    })

    setMarkdown(md)
    setStatus({ message: 'README generated', state: 'done' })
    setGenerating(false)
  }

  // ── copy / download ────────────────────────────────────────────────────────

  function handleCopy() {
    navigator.clipboard.writeText(markdown)
  }

  function handleDownload() {
    const name = (meta?.title || 'README').replace(/[^a-z0-9]/gi, '_').slice(0, 40)
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `README_${name}.md`,
    })
    a.click()
  }

  // ── save to dataset ────────────────────────────────────────────────────────

  async function handleSave(token: string) {
    setStatus({ message: 'uploading README to Borealis…', state: 'active' })
    try {
      await saveReadme(pid, token, markdown)
      setStatus({ message: 'README saved to dataset ✓', state: 'done' })
    } catch (e) {
      setStatus({ message: String(e), state: 'error' })
      throw e
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.app}>
      <Header
        hasReadme={!!markdown}
        onCopy={handleCopy}
        onDownload={handleDownload}
        saveArea={
          markdown ? (
            <SaveArea onSave={handleSave} />
          ) : undefined
        }
      />
      <div className={styles.layout}>
        <Sidebar
          pid={pid}
          onPidChange={setPid}
          onFetch={handleFetch}
          fetching={fetching}
          meta={meta}
          files={files}
          selectedIds={selectedIds}
          onToggleFile={handleToggleFile}
          onToggleAll={handleToggleAll}
          sections={sections}
          onToggleSection={handleToggleSection}
          onGenerate={handleGenerate}
          generating={generating}
          error={fetchError}
        />
        <Viewer
          markdown={markdown}
          onChange={setMarkdown}
          tab={tab}
          onTabChange={setTab}
          status={status}
        />
      </div>
    </div>
  )
}
