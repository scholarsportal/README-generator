import { NextRequest, NextResponse } from 'next/server'
import { borealisFetch } from '@/lib/borealis'
import { MOCK_META } from '@/lib/mock'
import type { DatasetMeta } from '@/lib/types'

const USE_MOCK = process.env.USE_MOCK === 'true'

export async function GET(req: NextRequest) {
  const pid = req.nextUrl.searchParams.get('pid')
  if (!pid) return NextResponse.json({ message: 'Missing pid' }, { status: 400 })

  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    return NextResponse.json(MOCK_META)
  }

  try {
    const res = await borealisFetch(
      `/api/v1/datasets/:persistentId/?persistentId=${encodeURIComponent(pid)}`
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return NextResponse.json(
        { message: (body as { message?: string }).message || `Borealis returned ${res.status}` },
        { status: res.status }
      )
    }

    const json = await res.json()
    const latest = json.data.latestVersion
    const fields: Record<string, unknown>[] = latest.metadataBlocks?.citation?.fields || []

    function field(name: string): string {
      const f = fields.find((x) => (x as { typeName: string }).typeName === name) as
        | { typeClass: string; value: unknown }
        | undefined
      if (!f) return ''
      if (f.typeClass === 'compound') {
        return (f.value as Record<string, { value: string }>[])
          .map((v) =>
            Object.values(v)
              .map((sub) => sub.value)
              .filter(Boolean)
              .join(', ')
          )
          .join('; ')
      }
      if (Array.isArray(f.value)) return (f.value as string[]).join(', ')
      return (f.value as string) || ''
    }

    const meta: DatasetMeta = {
      title:       field('title'),
      authors:     field('author'),
      description: field('dsDescription'),
      keywords:    field('keyword'),
      subject:     field('subject'),
      doi:         json.data.persistentUrl || pid,
      publisher:   json.data.publisher || 'Borealis',
      year:        latest.releaseTime ? new Date(latest.releaseTime).getFullYear().toString() : '',
      license:     latest.license?.name || '',
      version:     latest.versionNumber
        ? `${latest.versionNumber}.${latest.versionMinorNumber}`
        : '',
    }

    return NextResponse.json(meta)
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 500 })
  }
}
