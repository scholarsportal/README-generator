'use client'

import { Suspense } from 'react'
import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type { DatasetMeta, DataFile, Section, Tab, Status, SignedUrls, GenerationMode, CustomSection } from '@/lib/types'
import { PINK_SECTIONS, DEFAULT_SECTIONS } from '@/lib/types'
import { fetchDatasetMeta, fetchFiles, fetchVariables, saveReadme, parseSignedUrls, resolveCallback } from '@/lib/borealis'
import { generateReadme, isTabular } from '@/lib/template'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar/Sidebar'
import Viewer from '@/components/Viewer/Viewer'
import SaveArea from '@/components/SaveArea'
import styles from './page.module.css'

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
  const [pid, setPid]               = useState('')
  const [siteUrl, setSiteUrl]       = useState('')
  const [token, setToken]           = useState('')
  const [signedUrls, setSignedUrls] = useState<SignedUrls | undefined>(undefined)
  const [meta, setMeta]             = useState<DatasetMeta | null>(null)
  const [files, setFiles]           = useState<DataFile[]>([])
  const [selectedIds, setSelectedIds]   = useState<Set<number>>(new Set())
  const [variableIds, setVariableIds]   = useState<Set<number>>(new Set())
  const [fetching, setFetching]     = useState(false)
  const [fetchError, setFetchError] = useState('')

  // ── readme state ──
  const [mode, setMode]             = useState<GenerationMode>('basic')
  const [sections, setSections]     = useState<Section[]>(DEFAULT_SECTIONS)
  const [customSections, setCustomSections] = useState<CustomSection[]>([])
  const [markdown, setMarkdown]     = useState('')
  const [generating, setGenerating] = useState(false)

  // ── ui state ──
  const [tab, setTab]               = useState<Tab>('preview')
  const [status, setStatus]         = useState<Status>({ message: 'loading dataset…', state: 'active' })
  const [launched, setLaunched]     = useState(false)

  useEffect(() => {
    async function init() {
      const callbackParam = searchParams.get('callback')
      const directPid     = searchParams.get('datasetPid')
      const directSiteUrl = searchParams.get('siteUrl') || ''

      if (callbackParam) {
        setLaunched(true)
        setStatus({ message: 'connecting to Dataverse…', state: 'active' })
        try {
          const { pid: resolvedPid, signedUrls: resolvedSigned } = await resolveCallback(callbackParam)
          setPid(resolvedPid)
          setSiteUrl(directSiteUrl)
          setSignedUrls(resolvedSigned)
          await handleFetch(resolvedPid, resolvedSigned, directSiteUrl)
        } catch (e) {
          setFetchError(String(e))
          setStatus({ message: 'failed to connect to Dataverse', state: 'error' })
        }
        return
      }

      if (directPid) {
        setLaunched(true)
        const signed = parseSignedUrls(searchParams)
        if (signed) setSignedUrls(signed)
        setPid(directPid)
        setSiteUrl(directSiteUrl)
        await handleFetch(directPid, signed, directSiteUrl)
        return
      }

      setLaunched(false)
      setStatus({ message: 'ready', state: 'idle' })
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── fetch ──────────────────────────────────────────────────────────────────

  async function handleFetch(resolvedPid: string, resolvedSigned?: SignedUrls, resolvedSiteUrl?: string) {
    if (!resolvedPid) return
    setFetching(true)
    setFetchError('')
    setStatus({ message: 'fetching dataset metadata…', state: 'active' })
    setMeta(null)
    setFiles([])
    setSelectedIds(new Set())
    setVariableIds(new Set())
    setMarkdown('')

    const resolvedToken = token || undefined
    const site = resolvedSiteUrl || siteUrl || undefined

    try {
      const [metaData, fileData] = await Promise.all([
        fetchDatasetMeta(resolvedPid, resolvedSigned, resolvedToken, site),
        fetchFiles(resolvedPid, resolvedSigned, resolvedToken, site),
      ])
      setMeta(metaData)
      setFiles(fileData)

      setSelectedIds(new Set(fileData.filter((f) => !f.restricted).map((f) => f.id)))
      // default variable checkboxes unchecked
      setVariableIds(new Set(fileData.filter((f) => !f.restricted && isTabular(f)).map((f) => f.id)))
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

  const handleToggleVariable = useCallback((id: number, checked: boolean) => {
    setVariableIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }, [])

  const handleToggleAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(files.map((f) => f.id)) : new Set())
  }, [files])

  const handleModeChange = useCallback((m: GenerationMode) => {
    setMode(m)
    if (m === 'advanced') setSections(DEFAULT_SECTIONS)
  }, [])

  const handleToggleSection = useCallback((s: Section) => {
    setSections((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }, [])

  const handleAddCustomSection = useCallback((section: CustomSection) => {
    setCustomSections((prev) => [...prev, section])
  }, [])

  const handleRemoveCustomSection = useCallback((id: string) => {
    setCustomSections((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const handleUpdateCustomSection = useCallback((id: string, field: 'title' | 'content', value: string) => {
    setCustomSections((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
  }, [])

  // ── generate ───────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!meta) return
    setGenerating(true)

    const activeSections: Section[] = mode === 'basic' ? PINK_SECTIONS : sections
    const selectedFiles = files.filter((f) => selectedIds.has(f.id))
    const tabularFiles  = selectedFiles.filter(isTabular).filter((f) => variableIds.has(f.id))
    const resolvedToken = token || undefined
    const site = siteUrl || undefined

    const variableMap = new Map<number, Awaited<ReturnType<typeof fetchVariables>>>()
    for (const f of tabularFiles) {
      setStatus({ message: `fetching variables for ${f.name}…`, state: 'active' })
      const vars = await fetchVariables(f.id, signedUrls, resolvedToken, site)
      variableMap.set(f.id, vars)
    }

    setStatus({ message: 'generating README…', state: 'active' })
    const md = generateReadme({ meta, selectedFiles, allFiles: files, sections: activeSections, variableMap, customSections: mode === 'advanced' ? customSections : [] })
    setMarkdown(md)
    setStatus({ message: `README generated (${mode} mode)`, state: 'done' })
    setGenerating(false)
  }

  function handleCopy() { navigator.clipboard.writeText(markdown) }

  function handleDownload(ext: 'md' | 'txt') {
    const name = (meta?.title || 'README').replace(/[^a-z0-9]/gi, '_').slice(0, 40)
    const mimeType = ext === 'md' ? 'text/markdown' : 'text/plain'
    const blob = new Blob([markdown], { type: mimeType })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `README_${name}.${ext}` })
    a.click()
  }

  async function handleSave(saveToken: string) {
    setStatus({ message: 'uploading README to Borealis…', state: 'active' })
    try {
      await saveReadme(pid, saveToken || token, markdown, signedUrls?.addFile, siteUrl || undefined)
      setStatus({ message: 'README saved to dataset ✓', state: 'done' })
    } catch (e) {
      setStatus({ message: String(e), state: 'error' })
      throw e
    }
  }

  if (!launched && status.state === 'idle') {
    return (
      <div className={styles.app}>
        <Header hasReadme={false} onCopy={handleCopy} onDownload={handleDownload} />
        <div className={styles.notLaunched}>
          <div className={styles.notLaunchedGlyph}>README</div>
          <div className={styles.notLaunchedTitle}>Open from a dataset page</div>
          <div className={styles.notLaunchedSub}>
            This tool must be launched from a Borealis dataset page.
            Navigate to a dataset on Borealis and click the <strong>Generate README</strong> button.
          </div>
        </div>
      </div>
    )
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
          token={token}
          onTokenChange={setToken}
          hasSignedUrls={!!signedUrls}
          fetching={fetching}
          meta={meta}
          files={files}
          selectedIds={selectedIds}
          variableIds={variableIds}
          onToggleFile={handleToggleFile}
          onToggleVariable={handleToggleVariable}
          onToggleAll={handleToggleAll}
          sections={sections}
          onToggleSection={handleToggleSection}
          mode={mode}
          onModeChange={handleModeChange}
          customSections={customSections}
          onAddCustomSection={handleAddCustomSection}
          onRemoveCustomSection={handleRemoveCustomSection}
          onUpdateCustomSection={handleUpdateCustomSection}
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
