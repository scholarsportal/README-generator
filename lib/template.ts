import type { DatasetMeta, DataFile, Variable, Section } from './types'

// ── Helpers ───────────────────────────────────────────────────────────────────

export const TABULAR_TYPES = new Set([
  'text/csv',
  'text/tsv',
  'text/tab-separated-values',
  'application/x-stata',
  'application/x-stata-dta',
  'application/x-spss-sav',
  'application/x-spss-por',
  'application/x-r-data',
  'application/x-rlang-transport',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
])

export function isTabular(f: DataFile): boolean {
  return (
    TABULAR_TYPES.has(f.contentType) ||
    /\.(csv|tsv|tab|dta|sav|por|rdata|rds|xlsx?)$/i.test(f.name)
  )
}

export function formatBytes(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function fileExt(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE'
}

// ── Tree builder ──────────────────────────────────────────────────────────────

import type { TreeNode } from './types'

export function buildTree(files: DataFile[]): TreeNode {
  const root: TreeNode = { files: [], dirs: {} }
  files.forEach((f, i) => {
    const parts = (f.directoryLabel || '').split('/').filter(Boolean)
    let node = root
    for (const p of parts) {
      if (!node.dirs[p]) node.dirs[p] = { files: [], dirs: {} }
      node = node.dirs[p]
    }
    node.files.push({ ...f, index: i })
  })
  return root
}

// ── Template engine ───────────────────────────────────────────────────────────

export interface GenerateOptions {
  meta: DatasetMeta
  selectedFiles: DataFile[]
  allFiles: DataFile[]
  sections: Section[]
  variableMap: Map<number, Variable[] | null>
}

export function generateReadme(opts: GenerateOptions): string {
  const { meta: m, selectedFiles, allFiles, sections, variableMap } = opts
  const parts: string[] = []

  // title
  parts.push(`# ${m.title}\n`)

  // overview
  if (sections.includes('overview')) {
    parts.push(`## Overview\n`)
    if (m.description) parts.push(`${m.description}\n`)
    const metaLines = [
      m.subject  && `**Subject:** ${m.subject}`,
      m.keywords && `**Keywords:** ${m.keywords}`,
      m.year     && `**Year:** ${m.year}`,
      m.version  && `**Version:** ${m.version}`,
    ].filter(Boolean) as string[]
    if (metaLines.length) parts.push(metaLines.join('  \n') + '\n')
  }

  // citation
  if (sections.includes('citation')) {
    parts.push(`## Citation\n`)
    const authors = m.authors
      ? m.authors.split(';').map((a) => a.trim()).join(', ')
      : 'Authors not specified'
    parts.push(`Please cite this dataset as:\n`)
    parts.push(`> ${authors} (${m.year || 'n.d.'}). *${m.title}*. ${m.publisher}. ${m.doi}\n`)
    parts.push(
      `**DOI:** ${m.doi}  \n**Publisher:** ${m.publisher}  \n**Version:** ${m.version || 'Not specified'}\n`
    )
  }

  // files
  if (sections.includes('files')) {
    parts.push(`## Files\n`)
    const note =
      selectedFiles.length < allFiles.length
        ? ` (${allFiles.length - selectedFiles.length} additional files not included in this README)`
        : ''
    parts.push(
      `This dataset contains ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}${note}.\n`
    )
    parts.push(`| File | Format | Size | Description |`)
    parts.push(`|------|--------|------|-------------|`)
    for (const f of selectedFiles) {
      const format = f.contentType || fileExt(f.name)
      const size = formatBytes(f.size) || '—'
      const desc = f.description || '—'
      parts.push(`| \`${f.name}\` | ${format} | ${size} | ${desc} |`)
    }
    parts.push('')
  }

  // variables
  if (sections.includes('variables')) {
    const tabular = selectedFiles.filter(isTabular)
    if (tabular.length) {
      parts.push(`## Variables\n`)
      parts.push(
        `Variable-level metadata for each tabular file. Labels and types are drawn directly from the Dataverse ingest metadata.\n`
      )
      for (const f of tabular) {
        parts.push(`### \`${f.name}\``)
        if (f.description) parts.push(`${f.description}\n`)
        const vars = variableMap.get(f.id)
        if (vars && vars.length) {
          parts.push(`| Variable | Label | Type |`)
          parts.push(`|----------|-------|------|`)
          for (const v of vars) {
            parts.push(`| \`${v.name}\` | ${v.label || '—'} | ${v.type || '—'} |`)
          }
          parts.push('')
        } else {
          parts.push(
            `_Variable metadata not available for this file. Refer to the accompanying codebook._\n`
          )
        }
      }
    } else {
      parts.push(`## Variables\n`)
      parts.push(
        `_No tabular files selected. Variable documentation is only available for CSV, Stata, SPSS, R, and Excel files that Borealis has ingested._\n`
      )
    }
  }

  // methodology
  if (sections.includes('methodology')) {
    parts.push(`## Methodology\n`)
    parts.push(
      `Details on data collection and processing methods are described in the associated publication and codebook. If you have questions about methodology, contact the authors using the information below.\n`
    )
  }

  // access & license
  if (sections.includes('access')) {
    parts.push(`## Access & License\n`)
    parts.push(`This dataset is openly available through Borealis.\n`)
    if (m.license) parts.push(`**License:** ${m.license}  \n`)
    parts.push(`**Repository:** [${m.doi}](${m.doi})\n`)
  }

  // contact
  if (sections.includes('contact')) {
    parts.push(`## Contact\n`)
    const authors = m.authors || 'See dataset page'
    parts.push(`**Authors:** ${authors}  \n**Publisher:** ${m.publisher}  \n`)
    parts.push(
      `For questions about this dataset, contact the authors through the [dataset page](${m.doi}) on Borealis.\n`
    )
  }

  // related works
  if (sections.includes('related')) {
    parts.push(`## Related Works\n`)
    parts.push(
      `_If this dataset is associated with a publication, please add the citation here._\n`
    )
  }

  // footer
  parts.push(
    `---\n_README generated by [borealis-readme-gen](https://github.com/) on ${new Date().toISOString().split('T')[0]}_`
  )

  return parts.join('\n')
}
