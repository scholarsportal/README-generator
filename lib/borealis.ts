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

// ── Parse signed URLs from Dataverse query params ────────────────────────────
// Dataverse passes signed URLs as JSON in the `signedUrls` query param

export function parseSignedUrls(searchParams: URLSearchParams): SignedUrls | undefined {
  const raw = searchParams.get('signedUrls')
  if (!raw) return undefined
  try {
    // Dataverse passes an array of { name, httpMethod, signedUrl, timeOut }
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

