import { NextRequest, NextResponse } from 'next/server'
import { dataverseFetch } from '@/lib/borealis'

export async function GET(req: NextRequest) {
  const pid     = req.nextUrl.searchParams.get('pid')
  const token   = req.nextUrl.searchParams.get('token') || undefined
  const siteUrl = req.nextUrl.searchParams.get('siteUrl') || undefined

  if (!pid) return NextResponse.json({ message: 'Missing pid' }, { status: 400 })

  try {
    const res = await dataverseFetch(
      `/api/v1/datasets/:persistentId/versions?persistentId=${encodeURIComponent(pid)}`,
      token,
      siteUrl
    )
    if (!res.ok) return NextResponse.json([], { status: 200 })
    const json = await res.json()
    const versions = (json.data || []).map((v: {
      versionNumber?: number
      versionMinorNumber?: number
      versionState?: string
    }) => {
      const isDraft = v.versionState === 'DRAFT'
      const label = isDraft ? 'DRAFT' : `${v.versionNumber}.${v.versionMinorNumber}`
      const value = isDraft ? ':draft' : `${v.versionNumber}.${v.versionMinorNumber}`
      return { label, value }
    })
    return NextResponse.json(versions)
  } catch {
    return NextResponse.json([])
  }
}
