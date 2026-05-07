import type { DatasetMeta, DataFile, Variable, Section } from './types'

export const TABULAR_TYPES = new Set([
  'text/csv', 'text/tsv', 'text/tab-separated-values',
  'application/x-stata', 'application/x-stata-dta',
  'application/x-spss-sav', 'application/x-spss-por',
  'application/x-r-data', 'application/x-rlang-transport',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
])

export function isTabular(f: DataFile): boolean {
  return TABULAR_TYPES.has(f.contentType) || /\.(csv|tsv|tab|dta|sav|por|rdata|rds|xlsx?)$/i.test(f.name)
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

export interface GenerateOptions {
  meta: DatasetMeta
  selectedFiles: DataFile[]
  allFiles: DataFile[]
  sections: Section[]
  variableMap: Map<number, Variable[] | null>
}

const PLACEHOLDER = (text: string) => `_${text}_`

export function generateReadme(opts: GenerateOptions): string {
  const { meta: m, selectedFiles, allFiles, sections, variableMap } = opts
  const parts: string[] = []
  const has = (s: Section) => sections.includes(s)

  parts.push(`# ${m.title}\n`)

  // ── Description ───────────────────────────────────────────────────────────
  if (has('description')) {
    parts.push(`## Description\n`)
    if (m.description) parts.push(`${m.description}\n`)
    const meta = [
      m.subject  && `**Subject:** ${m.subject}`,
      m.keywords && `**Keywords:** ${m.keywords}`,
    ].filter(Boolean) as string[]
    if (meta.length) parts.push(meta.join('  \n') + '\n')
  }

  // ── Authors ───────────────────────────────────────────────────────────────
  if (has('authors') && m.authors) {
    parts.push(`## Authors\n`)
    parts.push(m.authors.split(';').map((a) => `- ${a.trim()}`).join('\n') + '\n')
  }

  // ── Contact ───────────────────────────────────────────────────────────────
  if (has('contact')) {
    parts.push(`## Contact Information\n`)
    if (m.contact.length) {
      m.contact.forEach((c) => {
        const line = [c.name, c.affiliation, c.email ? `[${c.email}](mailto:${c.email})` : ''].filter(Boolean).join(' — ')
        parts.push(`- ${line}`)
      })
      parts.push('')
    } else {
      parts.push(`For questions about this dataset, contact the authors through the [dataset page](${m.doi}) on Borealis.\n`)
    }
  }

  // ── DOI ───────────────────────────────────────────────────────────────────
  if (has('doi')) {
    parts.push(`## DOI / Persistent Identifier\n`)
    parts.push(`**DOI:** [${m.doi}](${m.doi})  \n**Publisher:** ${m.publisher}\n`)
  }

  // ── License ───────────────────────────────────────────────────────────────
  if (has('license')) {
    parts.push(`## License\n`)
    parts.push(`This dataset is openly available through Borealis.\n`)
    if (m.license) parts.push(`**License:** ${m.license}\n`)
  }

  // ── Version ───────────────────────────────────────────────────────────────
  if (has('version') && m.version) {
    parts.push(`## Version Information\n`)
    parts.push(`**Current version:** ${m.version}  \n**Year:** ${m.year || 'Not specified'}\n`)
    parts.push(`_For a full version history, see the dataset page on Borealis._\n`)
  }

  // ── Citation ──────────────────────────────────────────────────────────────
  if (has('citation')) {
    parts.push(`## Recommended Citation\n`)
    const authors = m.authors ? m.authors.split(';').map((a) => a.trim()).join(', ') : 'Authors not specified'
    parts.push(`> ${authors} (${m.year || 'n.d.'}). *${m.title}*. ${m.publisher}. ${m.doi}\n`)
  }

  // ── Related Publications ──────────────────────────────────────────────────
  if (has('related_publications')) {
    parts.push(`## Related Publications\n`)
    if (m.relatedPublications.length) {
      m.relatedPublications.forEach((p) => {
        if (p.citation) parts.push(`- ${p.citation}${p.url ? `  \n  URL: ${p.url}` : ''}`)
      })
      parts.push('')
    } else {
      parts.push(PLACEHOLDER('No related publications are listed in the dataset metadata. Add any associated publications here.') + '\n')
    }
  }

  // ── Software ──────────────────────────────────────────────────────────────
  if (has('software')) {
    parts.push(`## Software / Tools Used\n`)
    if (m.software.length) {
      m.software.forEach((s) => {
        parts.push(`- **${s.name}**${s.version ? ` v${s.version}` : ''}`)
      })
      parts.push('')
    } else {
      parts.push(PLACEHOLDER('List the software or tools used to generate, process, or analyse this dataset (e.g. R 4.3, Python 3.11, SPSS 28, ArcGIS 10.8).') + '\n')
    }
  }

  // ── Methodology ───────────────────────────────────────────────────────────
  if (has('methodology')) {
    parts.push(`## Methodology\n`)
    parts.push(PLACEHOLDER('Describe how the data were collected, generated, or derived. Include instrument details, experimental conditions, sampling strategy, and any relevant protocols.') + '\n')
  }

  // ── Data Collection & Processing ─────────────────────────────────────────
  if (has('data_collection')) {
    parts.push(`## Data Collection & Processing\n`)
    parts.push(PLACEHOLDER('Describe the instruments and methods used to collect the data, the conditions, and steps taken to process raw data into the submitted dataset.') + '\n')
  }

  // ── Date of Collection ────────────────────────────────────────────────────
  if (has('date_of_collection')) {
    parts.push(`## Date of Collection\n`)
    if (m.dateOfCollection.length) {
      m.dateOfCollection.forEach((d) => {
        if (d.start && d.end) parts.push(`- ${d.start} to ${d.end}`)
        else if (d.start) parts.push(`- From ${d.start}`)
        else if (d.end) parts.push(`- Until ${d.end}`)
      })
      parts.push('')
    } else {
      parts.push(PLACEHOLDER('Specify the date(s) or date range(s) when the data were collected.') + '\n')
    }
  }

  // ── Time Period Covered ───────────────────────────────────────────────────
  if (has('time_period')) {
    parts.push(`## Time Period Covered\n`)
    if (m.timePeriod.length) {
      m.timePeriod.forEach((t) => {
        if (t.start && t.end) parts.push(`- ${t.start} to ${t.end}`)
        else if (t.start) parts.push(`- From ${t.start}`)
        else if (t.end) parts.push(`- Until ${t.end}`)
      })
      parts.push('')
    } else {
      parts.push(PLACEHOLDER('Describe the time period to which the data refer (not the dates of collection or deposit).') + '\n')
    }
  }

  // ── Geographic Coverage ───────────────────────────────────────────────────
  if (has('geographic_coverage')) {
    parts.push(`## Geographic Coverage\n`)
    if (m.geographicCoverage.length) {
      m.geographicCoverage.forEach((g) => {
        const loc = [g.city, g.state, g.country, g.other].filter(Boolean).join(', ')
        if (loc) parts.push(`- ${loc}`)
      })
      parts.push('')
    } else {
      parts.push(PLACEHOLDER('Describe the geographic scope of the data, including countries, regions, or coordinates where applicable.') + '\n')
    }
  }

  // ── Contributors ──────────────────────────────────────────────────────────
  if (has('contributors')) {
    parts.push(`## Contributors / Co-investigators\n`)
    if (m.contributors.length) {
      m.contributors.forEach((c) => {
        parts.push(`- **${c.name}**${c.type ? ` (${c.type})` : ''}`)
      })
      parts.push('')
    } else {
      parts.push(PLACEHOLDER('List individuals or organizations who contributed to the dataset beyond the primary authors. Use ORCIDs where available.') + '\n')
    }
  }

  // ── Funding ───────────────────────────────────────────────────────────────
  if (has('funding')) {
    parts.push(`## Funding\n`)
    if (m.funding.length) {
      m.funding.forEach((f) => {
        const line = [f.agency, f.grant ? `Grant #${f.grant}` : ''].filter(Boolean).join(' — ')
        parts.push(`- ${line}`)
      })
      parts.push('')
    } else {
      parts.push(PLACEHOLDER('List funding sources and grant numbers that supported this research.') + '\n')
    }
  }

  // ── Data Sources ──────────────────────────────────────────────────────────
  if (has('data_sources')) {
    parts.push(`## Data Sources\n`)
    if (m.dataSources.length) {
      m.dataSources.forEach((s) => parts.push(`- ${s}`))
      parts.push('')
    } else {
      parts.push(PLACEHOLDER('List any books, articles, datasets, or other sources that the data were derived from or built upon.') + '\n')
    }
  }

  // ── Files ─────────────────────────────────────────────────────────────────
  if (has('files')) {
    parts.push(`## Files\n`)
    const note = selectedFiles.length < allFiles.length ? ` (${allFiles.length - selectedFiles.length} additional files not included in this README)` : ''
    parts.push(`This dataset contains ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}${note}.\n`)
    parts.push(`| File | Format | Size | Description |`)
    parts.push(`|------|--------|------|-------------|`)
    for (const f of selectedFiles) {
      parts.push(`| \`${f.name}\` | ${f.contentType || fileExt(f.name)} | ${formatBytes(f.size) || '—'} | ${f.description || '—'} |`)
    }
    parts.push('')
  }

  // ── Variables ─────────────────────────────────────────────────────────────
  if (has('variables')) {
    const tabular = selectedFiles.filter(isTabular)
    if (tabular.length) {
      parts.push(`## Variable List / Data Dictionary\n`)
      parts.push(`Variable-level metadata for each tabular file.\n`)
      for (const f of tabular) {
        parts.push(`### \`${f.name}\``)
        if (f.description) parts.push(`${f.description}\n`)
        const vars = variableMap.get(f.id)
        if (vars && vars.length) {
          parts.push(`| Variable | Label | Type |`)
          parts.push(`|----------|-------|------|`)
          for (const v of vars) parts.push(`| \`${v.name}\` | ${v.label || '—'} | ${v.type || '—'} |`)
          parts.push('')
        } else {
          parts.push(`_Variable metadata not available. Refer to the accompanying codebook._\n`)
        }
      }
    } else {
      parts.push(`## Variable List / Data Dictionary\n`)
      parts.push(`_No tabular files selected. Variable documentation is only available for CSV, Stata, SPSS, R, and Excel files._\n`)
    }
  }

  // ── Abbreviations ─────────────────────────────────────────────────────────
  if (has('abbreviations')) {
    parts.push(`## Abbreviations / Codes Used\n`)
    parts.push(PLACEHOLDER('Explain any abbreviations, codes, or specialized formats used in this dataset. Include codes used to represent missing data values.') + '\n')
  }

  parts.push(`---\n_README generated by [borealis-readme-gen](https://github.com/scholarsportal/README-generator) on ${new Date().toISOString().split('T')[0]}_`)

  return parts.join('\n')
}
