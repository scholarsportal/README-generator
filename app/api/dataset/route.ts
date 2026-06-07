import { NextRequest, NextResponse } from 'next/server'
import { dataverseFetch } from '@/lib/borealis'
import { MOCK_META } from '@/lib/mock'
import type { DatasetMeta } from '@/lib/types'

const USE_MOCK = process.env.USE_MOCK === 'true'
const DEFAULT_PID = 'doi:10.5683/SP3/7HWSTS'

function errorMessage(status: number, body: { message?: string }): string {
  if (status === 404) return `Dataset not found. Check that the DOI is correct and the dataset exists.`
  if (status === 401) return `Authentication required. This dataset is restricted — enter your API token to access it.`
  if (status === 403) return `Access denied. Your API token does not have permission to view this dataset.`
  if (status === 400) return `Invalid request. Check that the DOI format is correct (e.g. doi:10.5683/SP3/XXXXXX).`
  if (status >= 500) return `Server error (${status}). Please try again later.`
  return body?.message || `Unexpected error (HTTP ${status}).`
}

export async function GET(req: NextRequest) {
  const pid       = req.nextUrl.searchParams.get('pid')
  const signedUrl = req.nextUrl.searchParams.get('signedUrl')
  const token     = req.nextUrl.searchParams.get('token') || undefined
  const siteUrl   = req.nextUrl.searchParams.get('siteUrl') || undefined

  if (!pid && !signedUrl) {
    return NextResponse.json({ message: 'Missing pid or signedUrl' }, { status: 400 })
  }

  if (USE_MOCK && pid === DEFAULT_PID && !signedUrl) {
    await new Promise((r) => setTimeout(r, 400))
    return NextResponse.json(MOCK_META)
  }

  try {
    const res = signedUrl
      ? await fetch(signedUrl)
      : await dataverseFetch(
          `/api/v1/datasets/:persistentId/?persistentId=${encodeURIComponent(pid!)}`,
          token,
          siteUrl
        )

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return NextResponse.json(
        { message: errorMessage(res.status, body) },
        { status: res.status }
      )
    }

    const json    = await res.json()
    const latest  = json.data.latestVersion
    const cite: Record<string, unknown>[] = latest.metadataBlocks?.citation?.fields   || []
    const geo:  Record<string, unknown>[] = latest.metadataBlocks?.geospatial?.fields || []

    type RawField = { typeName: string; typeClass: string; value: unknown }
    type CompoundValue = Record<string, { value: string }>

    function findField(fields: Record<string, unknown>[], name: string) {
      return fields.find((x) => (x as RawField).typeName === name) as RawField | undefined
    }

    function primitiveField(name: string, fields = cite): string {
      const f = findField(fields, name)
      if (!f) return ''
      if (Array.isArray(f.value)) return (f.value as string[]).join(', ')
      return (f.value as string) || ''
    }

    function compoundField(name: string, fields = cite): CompoundValue[] {
      const f = findField(fields, name)
      if (!f || f.typeClass !== 'compound') return []
      return (f.value as CompoundValue[]) || []
    }

    function subval(obj: CompoundValue, key: string): string {
      return obj[key]?.value?.trim() || ''
    }

    const authorField = compoundField('author')
    const authors = authorField.map((v) => {
      const name = subval(v, 'authorName')
      const aff  = subval(v, 'authorAffiliation')
      return aff ? `${name} (${aff})` : name
    }).filter(Boolean).join('; ')

    const contactField = compoundField('datasetContact')
    const contact = contactField.map((v) => ({
      name:        subval(v, 'datasetContactName'),
      affiliation: subval(v, 'datasetContactAffiliation'),
      email:       subval(v, 'datasetContactEmail'),
    })).filter((c) => c.name)

    const descField = compoundField('dsDescription')
    const description = descField.map((v) => subval(v, 'dsDescriptionValue')).filter(Boolean).join('\n\n')

    const softwareField = compoundField('software')
    const software = softwareField.map((v) => ({
      name:    subval(v, 'softwareName'),
      version: subval(v, 'softwareVersion'),
    })).filter((s) => s.name)

    const contributorField = compoundField('contributor')
    const contributors = contributorField.map((v) => ({
      type: subval(v, 'contributorType'),
      name: subval(v, 'contributorName'),
    })).filter((c) => c.name)

    const dateCollField = compoundField('dateOfCollection')
    const dateOfCollection = dateCollField.map((v) => ({
      start: subval(v, 'dateOfCollectionStart'),
      end:   subval(v, 'dateOfCollectionEnd'),
    })).filter((d) => d.start || d.end)

    const grantField = compoundField('grantNumber')
    const funding = grantField.map((v) => ({
      agency: subval(v, 'grantNumberAgency'),
      grant:  subval(v, 'grantNumberValue'),
    })).filter((f) => f.agency || f.grant)

    const pubField = compoundField('publication')
    const relatedPublications = pubField.map((v) => ({
      citation: subval(v, 'publicationCitation'),
      url:      subval(v, 'publicationURL') || subval(v, 'publicationIDNumber'),
    })).filter((p) => p.citation || p.url)

    const dataSourcesField = findField(cite, 'dataSources')
    const dataSources: string[] = dataSourcesField
      ? Array.isArray(dataSourcesField.value)
        ? (dataSourcesField.value as string[]).filter(Boolean)
        : [String(dataSourcesField.value)].filter(Boolean)
      : []

    const timePeriodField = compoundField('timePeriodCovered')
    const timePeriod = timePeriodField.map((v) => ({
      start: subval(v, 'timePeriodCoveredStart'),
      end:   subval(v, 'timePeriodCoveredEnd'),
    })).filter((t) => t.start || t.end)

    const geoCovField = compoundField('geographicCoverage', geo)
    const geographicCoverage = geoCovField.map((v) => ({
      country: subval(v, 'country'),
      state:   subval(v, 'state'),
      city:    subval(v, 'city'),
      other:   subval(v, 'otherGeographicCoverage'),
    })).filter((g) => g.country || g.state || g.city || g.other)

    const meta: DatasetMeta = {
      title:               primitiveField('title'),
      authors,
      description,
      keywords:            primitiveField('keyword'),
      subject:             primitiveField('subject'),
      doi:                 json.data.persistentUrl || pid || '',
      publisher:           json.data.publisher || 'Borealis',
      year:                latest.releaseTime ? new Date(latest.releaseTime).getFullYear().toString() : '',
      license:             latest.license?.name || '',
      version:             latest.versionNumber ? `${latest.versionNumber}.${latest.versionMinorNumber}` : '',
      software,
      contributors,
      dateOfCollection,
      funding,
      relatedPublications,
      dataSources,
      timePeriod,
      geographicCoverage,
      contact,
    }

    return NextResponse.json(meta)
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 500 })
  }
}
