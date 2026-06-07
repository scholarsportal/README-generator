import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get('url')
  if (!callbackUrl) {
    return NextResponse.json({ message: 'Missing url' }, { status: 400 })
  }

  try {
    console.log('[callback] fetching:', callbackUrl)
    const res = await fetch(callbackUrl)
    console.log('[callback] response status:', res.status)

    if (!res.ok) {
      const body = await res.text()
      console.log('[callback] error body:', body)
      return NextResponse.json(
        { message: `Callback fetch failed: HTTP ${res.status} — ${body}` },
        { status: res.status }
      )
    }

    const json = await res.json()
    console.log('[callback] success, keys:', Object.keys(json))
    return NextResponse.json(json)
  } catch (e) {
    console.log('[callback] exception:', e)
    return NextResponse.json({ message: String(e) }, { status: 500 })
  }
}
