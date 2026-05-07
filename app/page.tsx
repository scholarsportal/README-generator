'use client'

import { Suspense } from 'react'
import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type { DatasetMeta, DataFile, Section, Tab, Status, SignedUrls, GenerationMode } from '@/lib/types'
import { PINK_SECTIONS, DEFAULT_SECTIONS } from '@/lib/types'
import { fetchDatasetMeta, fetchFiles, fetchVariables, saveReadme, parseSignedUrls } from '@/lib/borealis'
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
  const [pid, setPid]               = useState(searchParams.get('datasetPid') || DEFAULT_PID)
  const [token, setToken]           = useState('')
  const [signedUrls, setSignedUrls] = useState<SignedUrls | undefined>(undefined)
  const [meta, setMeta]             = useState<DatasetMeta | null>(null)
  const [files, setFiles]           = useState<DataFile[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [fetching, setFetching]     = useState(false)
  const [fetchError, setFetchError] = useState('')

  // ── readme state ──
  const [mode, setMode]             = useState<GenerationMode>('basic')
  const [sections, setSections]     = useState<Section[]>(DEFAULT_SECTIONS)
  const [markdown, setMarkdown]     = useState('')
  const [generating, setGenerating] = useState(false)

  // ── ui state ──
  const [tab, setTab]               = useState<Tab>('preview')
  const [status, setStatus]         = useState<Status>({ message: 'ready — fetch a dataset to begin', state: 'idle' })

  useEffect(() => {
    const signed = parseSignedUrls(searchParams)
    if (signed) setSignedUrls(signed)
    if (searchParams.get('datasetPid')) handleFetch(signed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── fetch ──────────────────────────────────────────────────────────────────

  async function handleFetch(signed?: SignedUrls) {
    if (!pid.trim()) return
    setFetching(true)
    setFetchError('')
    setStatus({ message: 'fetching dataset metadata…', state: 'active' })
    setMeta(null)
    setFiles([])
    setSelectedIds(new Set())
    setMarkdown('')

    const resolvedSigned = signed ?? signedUrls
    const resolvedToken  = token || undefined

    try {
      const [metaData, fileData] = await Promise.all([
        fetchDatasetMeta(pid, resolvedSigned, resolvedToken),
        fetchFiles(pid, resolvedSigned, resolvedToken),
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

  // ── mode change ────────────────────────────────────────────────────────────

  const handleModeChange = useCallback((m: GenerationMode) => {
    setMode(m)
    // advanced: default to pink sections checked, green unchecked
    if (m === 'advanced') setSections(DEFAULT_SECTIONS)
  }, [])

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

    // basic mode always uses pink sections only
    const activeSections: Section[] = mode === 'basic' ? PINK_SECTIONS : sections
    const selectedFiles = files.filter((f) => selectedIds.has(f.id))
    const tabularFiles  = activeSections.includes('variables') ? selectedFiles.filter(isTabular) : []
    const resolvedToken = token || undefined

    const variableMap = new Map<number, Awaited<ReturnType<typeof fetchVariables>>>()
    for (const f of tabularFiles) {
      setStatus({ message: `fetching variables for ${f.name}…`, state: 'active' })
      const vars = await fetchVariables(f.id, signedUrls, resolvedToken)
      variableMap.set(f.id, vars)
    }

    setStatus({ message: 'generating README…', state: 'active' })

    const md = generateReadme({ meta, selectedFiles, allFiles: files, sections: activeSections, variableMap })
    setMarkdown(md)
    setStatus({ message: `README generated (${mode} mode)`, state: 'done' })
    setGenerating(false)
  }

  // ── copy / download ────────────────────────────────────────────────────────

  function handleCopy() { navigator.clipboard.writeText(markdown) }

  function handleDownload() {
    const name = (meta?.title || 'README').replace(/[^a-z0-9]/gi, '_').slice(0, 40)
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `README_${name}.md` })
    a.click()
  }

  // ── save to dataset ────────────────────────────────────────────────────────

  async function handleSave(saveToken: string) {
    setStatus({ message: 'uploading README to Borealis…', state: 'active' })
    try {
      await saveReadme(pid, saveToken, markdown, signedUrls?.addFile)
      setStatus({ message: 'README saved to dataset ✓', state: 'done' })
    } catch (e) {
      setStatus({ message: String(e), state: 'error' })
      throw e
    }
  }

  return (
    <div className={styles.app}>
      <Header
        hasReadme={!!markdown}
        onCopy={handleCopy}
        onDownload={handleDownload}
        saveArea={markdown ? <SaveArea onSave={handleSave} hasSignedUrl={!!signedUrls?.addFile} /> : undefined}
      />
      <div className={styles.layout}>
        <Sidebar
          pid={pid}
          onPidChange={setPid}
          token={token}
          onTokenChange={setToken}
          hasSignedUrls={!!signedUrls}
          onFetch={() => handleFetch()}
          fetching={fetching}
          meta={meta}
          files={files}
          selectedIds={selectedIds}
          onToggleFile={handleToggleFile}
          onToggleAll={handleToggleAll}
          sections={sections}
          onToggleSection={handleToggleSection}
          mode={mode}
          onModeChange={handleModeChange}
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
