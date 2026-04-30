// ── Dataset metadata ──────────────────────────────────────────────────────────

export interface DatasetMeta {
  title: string
  authors: string
  description: string
  keywords: string
  subject: string
  doi: string
  publisher: string
  year: string
  license: string
  version: string
  signedBase?: string // set when launched via Dataverse signed URL
}

// ── Files ─────────────────────────────────────────────────────────────────────

export interface DataFile {
  id: number
  name: string
  size: number
  contentType: string
  directoryLabel: string
  description: string
  tags: string
}

// ── File tree (built client-side from directoryLabel paths) ───────────────────

export interface TreeNode {
  files: (DataFile & { index: number })[]
  dirs: Record<string, TreeNode>
}

// ── Variable metadata ─────────────────────────────────────────────────────────

export interface Variable {
  name: string
  label: string
  type: string
}

// ── README sections ───────────────────────────────────────────────────────────

export type Section =
  | 'overview'
  | 'citation'
  | 'files'
  | 'variables'
  | 'methodology'
  | 'access'
  | 'contact'
  | 'related'

export const ALL_SECTIONS: Section[] = [
  'overview',
  'citation',
  'files',
  'variables',
  'methodology',
  'access',
  'contact',
  'related',
]

export const DEFAULT_SECTIONS: Section[] = [
  'overview',
  'citation',
  'files',
  'variables',
  'access',
  'contact',
]

// ── Status ────────────────────────────────────────────────────────────────────

export type StatusState = 'idle' | 'active' | 'done' | 'error'

export interface Status {
  message: string
  state: StatusState
}

// ── View tabs ─────────────────────────────────────────────────────────────────

export type Tab = 'preview' | 'raw' | 'dual'
