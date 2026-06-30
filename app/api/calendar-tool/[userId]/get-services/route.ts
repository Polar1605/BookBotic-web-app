import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/Backend/supabase-admin'
import { createClient } from '@supabase/supabase-js'

function createAnonSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  // Admin needed here only to resolve userId → elevenlabs_agent_id (no Clerk session on webhooks)
  const admin = createAdminSupabaseClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('elevenlabs_agent_id')
    .eq('id', userId)
    .maybeSingle()

  if (!tenant?.elevenlabs_agent_id) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Anon client — RLS applies, so the services table policy controls what's visible
  const supabase = createAnonSupabaseClient()
  const { data: services, error } = await supabase
    .from('services')
    .select('name, duration, price')
    .eq('elevenlabs_agent_id', tenant.elevenlabs_agent_id)
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!services || services.length === 0) {
    return NextResponse.json({ result: 'No services are currently available.' })
  }

  const list = services
    .map((s) => `- ${s.name}: ${s.duration} min, $${Number(s.price).toFixed(2)}`)
    .join('\n')

  return NextResponse.json({
    result: `Available services:\n${list}`,
    services,
  })
}
