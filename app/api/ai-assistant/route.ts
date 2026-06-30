import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/Backend/supabase-server'
import { createAdminSupabaseClient } from '@/Backend/supabase-admin'
import { createAgentAction } from '@/Backend/create-agent'

type TenantRow = Record<string, unknown>

type ServiceRow = { id: string; name: string; duration: number; price: number }

function getStringField(data: TenantRow, keys: string[]) {
  return keys
    .map((key) => data[key])
    .find((value): value is string => typeof value === 'string')
}

function normalizeTenant(data: TenantRow) {
  return {
    business_name: getStringField(data, ['business_name', 'business name']) ?? null,
    ai_name: getStringField(data, ['ai name', 'ai_name']) ?? null,
    agent_prompt: getStringField(data, ['agent prompt', 'agent_prompt']) ?? null,
    elevenlabs_agent_id: getStringField(data, ['elevenlabs_agent_id', 'elevenlabs agent id']) ?? null,
  }
}

async function fetchServices(agentId: string): Promise<ServiceRow[]> {
  const admin = createAdminSupabaseClient()
  const { data } = await admin
    .from('services')
    .select('id, name, duration, price')
    .eq('elevenlabs_agent_id', agentId)
    .order('created_at', { ascending: true })
  return data ?? []
}

async function replaceServices(
  agentId: string,
  services: Array<{ name: string; duration: number; price: number }>
): Promise<ServiceRow[]> {
  const admin = createAdminSupabaseClient()

  await admin.from('services').delete().eq('elevenlabs_agent_id', agentId)

  if (services.length === 0) return []

  const { data } = await admin
    .from('services')
    .insert(services.map((s) => ({ elevenlabs_agent_id: agentId, ...s })))
    .select('id, name, duration, price')

  return data ?? []
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
  }

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!data) {
    return new Response(JSON.stringify({ error: 'Tenant record not found' }), { status: 404 })
  }

  const tenant = normalizeTenant(data)
  const services = tenant.elevenlabs_agent_id
    ? await fetchServices(tenant.elevenlabs_agent_id)
    : []

  return new Response(JSON.stringify({ ...tenant, services }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
  }

  let body: {
    business_name?: string
    ai_name?: string
    agent_prompt?: string
    services?: Array<{ name: string; duration: number; price: number }>
  }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const fieldsToUpdate: Record<string, string> = {}
  if (typeof body.business_name === 'string') fieldsToUpdate['business_name'] = body.business_name
  if (typeof body.ai_name === 'string') fieldsToUpdate['ai_name'] = body.ai_name
  if (typeof body.agent_prompt === 'string') fieldsToUpdate['agent_prompt'] = body.agent_prompt

  if (Object.keys(fieldsToUpdate).length === 0 && !body.services) {
    return new Response(JSON.stringify({ error: 'No fields provided for update' }), { status: 400 })
  }

  const supabase = createServerSupabaseClient()

  if (Object.keys(fieldsToUpdate).length > 0) {
    const { error } = await supabase
      .from('tenants')
      .update(fieldsToUpdate)
      .eq('id', userId)

    if (error) {
      console.error(error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
  }

  try {
    await createAgentAction()
  } catch (agentError) {
    console.error(agentError)
    return new Response(
      JSON.stringify({ error: (agentError as Error).message ?? 'Agent creation failed' }),
      { status: 500 }
    )
  }

  const { data: refreshed, error: refreshError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (refreshError) {
    console.error(refreshError)
    return new Response(JSON.stringify({ error: refreshError.message }), { status: 500 })
  }

  if (!refreshed) {
    return new Response(JSON.stringify({ error: 'Tenant record not found after refresh' }), { status: 404 })
  }

  const tenant = normalizeTenant(refreshed)

  let services: ServiceRow[] = []
  if (tenant.elevenlabs_agent_id && Array.isArray(body.services)) {
    services = await replaceServices(tenant.elevenlabs_agent_id, body.services)
  } else if (tenant.elevenlabs_agent_id) {
    services = await fetchServices(tenant.elevenlabs_agent_id)
  }

  return new Response(JSON.stringify({ ...tenant, services }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
