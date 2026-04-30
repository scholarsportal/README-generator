import { NextRequest, NextResponse } from 'next/server'
import { borealisFetch } from '@/lib/borealis'
import { MOCK_VARIABLES } from '@/lib/mock'
import type { Variable } from '@/lib/types'

const USE_MOCK = process.env.USE_MOCK === 'true'

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get('fileId')
  if (!fileId) return NextResponse.json({ message: 'Missing fileId' }, { status: 400 })

  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 100))
    const vars = MOCK_VARIABLES[Number(fileId)] || null
    return NextResponse.json(vars)
  }

  try {
    const res = await borealisFetch(`/api/v1/datafiles/${fileId}/dataTables`)
    if (!res.ok) return NextResponse.json(null)

    const json = await res.json()
    const rawVars = json.data?.[0]?.dataVariables || []
    const variables: Variable[] = rawVars.map(
      (v: { name: string; label?: string; variableFormatType?: { name: string }; type?: string }) => ({
        name:  v.name,
        label: v.label || '',
        type:  v.variableFormatType?.name || v.type || '',
      })
    )

    return NextResponse.json(variables.length ? variables : null)
  } catch {
    return NextResponse.json(null)
  }
}
