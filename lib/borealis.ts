import type { DatasetMeta, DataFile, Variable, SignedUrls } from './types'

const SITE = 'https://borealisdata.ca'

// ── Dataset metadata ──────────────────────────────────────────────────────────

export async function fetchDatasetMeta(
  pid: string,
  signed?: SignedUrls,
  token?: string
): Promise<DatasetMeta> {
  const params = new URLSearchParams({ pid })
  if (signed?.getDatasetMetadata) params.set('signedUrl', signed.getDatasetMetadata)
  if (token) params.set('token', token)

  const res = await fetch(`/api/dataset?${params}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── File listing ──────────────────────────────────────────────────────────────

export async function fetchFiles(
  pid: string,
  signed?: SignedUrls,
  token?: string
): Promise<DataFile[]> {
  const params = new URLSearchParams({ pid })
  if (signed?.getFiles) params.set('signedUrl', signed.getFiles)
  if (token) params.set('token', token)

  const res = await fetch(`/api/files?${params}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Variable metadata ─────────────────────────────────────────────────────────

export async function fetchVariables(
  fileId: number,
  signed?: SignedUrls,
  token?: string
): Promise<Variable[] | null> {
  const params = new URLSearchParams({ fileId: String(fileId) })
  if (signed?.getVariables) params.set('signedUrlBase', signed.getVariables)
  if (token) params.set('token', token)

  const res = await fetch(`/api/variables?${params}`)
  if (!res.ok) return null
  return res.json()
}

// ── Save README to dataset ────────────────────────────────────────────────────

export async function saveReadme(
  pid: string,
  token: string,
  markdown: string,
  signedUrl?: string
): Promise<void> {
  const res = await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pid, token, markdown, signedUrl }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`)
  }
}

// ── Raw Borealis fetch (used server-side in API routes) ───────────────────────

export async function borealisFetch(path: string, token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers['X-Dataverse-key'] = token
  const res = await fetch(`${SITE}${path}`, { headers })
  return res
}

// ── Parse signed URLs from Dataverse query params ─────────────────────────────

export function parseSignedUrls(searchParams: URLSearchParams): SignedUrls | undefined {
  const raw = searchParams.get('signedUrls')
  if (!raw) return undefined
  try {
    const arr = JSON.parse(raw) as { name: string; signedUrl: string }[]
    const map: SignedUrls = {}
    for (const entry of arr) {
      if (entry.name === 'getDatasetMetadata') map.getDatasetMetadata = entry.signedUrl
      if (entry.name === 'getFiles')           map.getFiles           = entry.signedUrl
      if (entry.name === 'getVariables')       map.getVariables       = entry.signedUrl
      if (entry.name === 'addFile')            map.addFile            = entry.signedUrl
    }
    return Object.keys(map).length ? map : undefined
  } catch {
    return undefined
  }
}

// ── Resolve callback URL (Dataverse external tool callback mechanism) ──────────
// Dataverse passes a base64-encoded callback URL instead of signedUrls directly.
// Calling it returns { datasetPid, signedUrls: [...] }

export interface CallbackResult {
  pid: string
  signedUrls: SignedUrls
}

export async function resolveCallback(callbackParam: string): Promise<CallbackResult> {
  // decode base64 to get the actual callback URL
  const callbackUrl = atob(callbackParam)

  const res = await fetch(callbackUrl)
  if (!res.ok) throw new Error(`Callback fetch failed: HTTP ${res.status}`)

  const json = await res.json()

  // extract pid
  const pid: string = json.datasetPid || json.pid || ''

  // extract signed URLs
  const arr: { name: string; signedUrl: string }[] = json.signedUrls || []
  const signedUrls: SignedUrls = {}
  for (const entry of arr) {
    if (entry.name === 'getDatasetMetadata') signedUrls.getDatasetMetadata = entry.signedUrl
    if (entry.name === 'getFiles')           signedUrls.getFiles           = entry.signedUrl
    if (entry.name === 'getVariables')       signedUrls.getVariables       = entry.signedUrl
    if (entry.name === 'addFile')            signedUrls.addFile            = entry.signedUrl
  }

  if (!pid) throw new Error('Callback response did not include a dataset PID.')

  return { pid, signedUrls }
}
