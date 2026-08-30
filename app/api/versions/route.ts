import { NextRequest, NextResponse } from 'next/server'
import { dataverseFetch } from '@/lib/borealis'
import { parseVersion, parseFiles, versionLabel, versionValue } from '@/lib/parseVersion'

export async function GET(req: NextRequest) {
  const pid = req.nextUrl.searchParams.get('pid')
  const token = req.nextUrl.searchParams.get('token') || undefined
  const siteUrl = req.nextUrl.searchParams.get('siteUrl') || undefined
  const signedUrl = req.headers.get('x-signed-url')

  if (!pid && !signedUrl) {
    return NextResponse.json({ message: 'Missing pid or signed URL' }, { status: 400 })
  }

  try {
    // Signed URL is opaque: fetch exactly as received, never rebuild or re-encode.
    const res = signedUrl
      ? await fetch(signedUrl)
      : await dataverseFetch(
          `/api/v1/datasets/:persistentId/versions?persistentId=${encodeURIComponent(pid!)}`,
          token,
          siteUrl
        )

    // Fail loudly. The previous version returned [] with a 200 here, which made
    // a 404 from the wrong host look like a dataset with no versions.
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return NextResponse.json(
        { message: `Could not load versions (HTTP ${res.status}). ${body.slice(0, 200)}` },
        { status: res.status }
      )
    }

    const json = await res.json()
    const raw = json.data || []

    const versions = raw.map((v: any) => ({
      label: versionLabel(v),
      value: versionValue(v),
      state: v.versionState,
      meta: parseVersion(v),
      // Each version carries its own file list, so switching versions updates
      // files as well as metadata without another request.
      files: parseFiles(v.files),
    }))

    return NextResponse.json(versions)
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 500 })
  }
}
