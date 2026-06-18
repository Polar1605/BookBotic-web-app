
import { auth } from '@clerk/nextjs/server'
import { type ElevenLabs, ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { createServerSupabaseClient } from '@/Backend/supabase-server'

const aiNameFields = [
  'ai name',
  'ai_name',
  'assistant name',
  'assistant_name',
  'agent name',
  'agent_name',
  'name',
] as const

const agentPromptFields = ['agent prompt', 'agent_prompt', 'prompt'] as const

function getStringField(data: Record<string, unknown>, fields: readonly string[]) {
  return fields
    .map((field) => data[field])
    .find((value): value is string => typeof value === 'string')
}

function resolveAiName(data: Record<string, unknown>) {
  return getStringField(data, aiNameFields) ?? ''
}

function resolveAgentPrompt(data: Record<string, unknown>) {
  return getStringField(data, agentPromptFields) ?? ''
}

export async function createAgentAction() {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')

  const supabase = createServerSupabaseClient()

  const { data: tenant, error: selErr } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (selErr) throw selErr
  if (!tenant) throw new Error('Tenant record not found during agent creation')

  const elevenlabs = new ElevenLabsClient()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const calendarTools = [
    {
      type: 'webhook' as const,
      name: 'check_availability',
      description: 'Check the calendar for available time slots on a specific date.',
      apiSchema: {
        url: `${appUrl}/api/calendar-tool/${userId}/check-availability`,
        method: 'POST' as const,
        requestBodySchema: {
          type: 'object' as const,
          properties: {
            date: { type: 'string' as const, description: 'Date to check in YYYY-MM-DD format' },
          } as Record<string, ElevenLabs.LiteralJsonSchemaProperty>,
          required: ['date'],
        },
      },
    },
    {
      type: 'webhook' as const,
      name: 'book_appointment',
      description: 'Book an appointment on the calendar for a customer.',
      apiSchema: {
        url: `${appUrl}/api/calendar-tool/${userId}/book-appointment`,
        method: 'POST' as const,
        requestBodySchema: {
          type: 'object' as const,
          properties: {
            date: { type: 'string' as const, description: 'Date in YYYY-MM-DD format' },
            time: { type: 'string' as const, description: 'Time in HH:MM 24-hour format' },
            customer_name: { type: 'string' as const, description: 'Full name of the customer' },
            phone_number: { type: 'string' as const, description: 'Phone number of the customer' },
            duration_minutes: { type: 'number' as const, description: 'Duration in minutes, default 60' },
          } as Record<string, ElevenLabs.LiteralJsonSchemaProperty>,
          required: ['date', 'time', 'customer_name'],
        },
      },
    },
  ]

  const aiName = resolveAiName(tenant as Record<string, unknown>)
  const agentPrompt = resolveAgentPrompt(tenant as Record<string, unknown>)
  const agentId = (tenant as any)['elevenlabs_agent_id'] ?? (tenant as any)['elevenlabs agent id'] ?? null

  if (!agentId) {
    const response = await elevenlabs.conversationalAi.agents.create({
      name: aiName ? `BookBotics - ${aiName}` : `BookBotics - ${tenant.business_name}`,
      conversationConfig: {
        tts: { voiceId: 'Gubgw9l4dtIoQA9YZHgx', modelId: 'eleven_flash_v2' },
        agent: {
          firstMessage: `Hi, this is Rachel from ${tenant.business_name}. How can I help you today?`,
          prompt: { prompt: agentPrompt, tools: calendarTools },
        },
      },
    })

    const { error: updErr } = await supabase
      .from('tenants')
      .update({ elevenlabs_agent_id: response.agentId })
      .eq('id', userId)
    if (updErr) throw updErr
    return response.agentId
  }

  await elevenlabs.conversationalAi.agents.update(agentId, {
    name: aiName ? `BookBotics - ${aiName}` : `BookBotics - ${tenant.business_name}`,
    conversationConfig: {
      tts: { voiceId: 'Gubgw9l4dtIoQA9YZHgx', modelId: 'eleven_flash_v2' },
      agent: {
        firstMessage: `Hi, this is Rachel from ${tenant.business_name}. How can I help you today?`,
        prompt: { prompt: agentPrompt, tools: calendarTools },
      },
    },
  })

  return agentId
}

