import type { DatasetMeta, DataFile, Variable } from './types'

const SITE = 'https://borealisdata.ca'

// ── Dataset metadata ──────────────────────────────────────────────────────────

export async function fetchDatasetMeta(pid: string): Promise<DatasetMeta> {
  const res = await fetch(`/api/dataset?pid=${encodeURIComponent(pid)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── File listing ──────────────────────────────────────────────────────────────

export async function fetchFiles(pid: string): Promise<DataFile[]> {
  const res = await fetch(`/api/files?pid=${encodeURIComponent(pid)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Variable metadata ─────────────────────────────────────────────────────────

export async function fetchVariables(fileId: number): Promise<Variable[] | null> {
  const res = await fetch(`/api/variables?fileId=${fileId}`)
  if (!res.ok) return null
  return res.json()
}

// ── Save README to dataset ────────────────────────────────────────────────────

export async function saveReadme(
  pid: string,
  token: string,
  markdown: string
): Promise<void> {
  const res = await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pid, token, markdown }),
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
