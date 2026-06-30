
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

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  const calendarTools = [
    {
      type: 'webhook' as const,
      name: 'get_current_time',
      description: 'Get the current date and time in Singapore (SGT). Call this before booking or checking availability so you know what "today" and "now" mean.',
      apiSchema: {
        url: `${appUrl}/api/calendar-tool/${userId}/get-current-time`,
        method: 'POST' as const,
        requestBodySchema: {
          type: 'object' as const,
          properties: {} as Record<string, ElevenLabs.LiteralJsonSchemaProperty>,
          required: [],
        },
      },
    },
    {
      type: 'webhook' as const,
      name: 'get_services',
      description: 'Get the list of services offered by this business, including name, duration in minutes, and price. Call this when the customer asks what services are available or before booking to confirm service details.',
      apiSchema: {
        url: `${appUrl}/api/calendar-tool/${userId}/get-services`,
        method: 'POST' as const,
        requestBodySchema: {
          type: 'object' as const,
          properties: {} as Record<string, ElevenLabs.LiteralJsonSchemaProperty>,
          required: [],
        },
      },
    },
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
      description: 'Book an appointment on the calendar for a customer. You MUST ask the customer which service they want before calling this. Call get_services first if you have not already, then confirm the service with the customer before proceeding. To reschedule, call cancel_appointment first then call this tool with the new date and time.',
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
            service_id: { type: 'string' as const, description: 'UUID of the service the customer wants to book. Call get_services first to get available service IDs.' },
          } as Record<string, ElevenLabs.LiteralJsonSchemaProperty>,
          required: ['date', 'time', 'customer_name', 'phone_number', 'service_id'],
        },
      },
    },
    {
      type: 'webhook' as const,
      name: 'get_bookings',
      description: 'Look up a customer\'s upcoming confirmed bookings by their phone number. Call this before cancelling or rescheduling so you can identify which appointment the customer is referring to. If multiple bookings are returned, read them out to the customer and ask which one they mean.',
      apiSchema: {
        url: `${appUrl}/api/calendar-tool/${userId}/get-bookings`,
        method: 'POST' as const,
        requestBodySchema: {
          type: 'object' as const,
          properties: {
            phone_number: { type: 'string' as const, description: 'Phone number of the customer' },
          } as Record<string, ElevenLabs.LiteralJsonSchemaProperty>,
          required: ['phone_number'],
        },
      },
    },
    {
      type: 'webhook' as const,
      name: 'cancel_appointment',
      description: 'Cancel an appointment. Call get_bookings first to get the google_event_id, then call this tool. This removes the event from Google Calendar and marks the booking as cancelled. To reschedule, call this first then call book_appointment with the new details.',
      apiSchema: {
        url: `${appUrl}/api/calendar-tool/${userId}/cancel-appointment`,
        method: 'POST' as const,
        requestBodySchema: {
          type: 'object' as const,
          properties: {
            google_event_id: { type: 'string' as const, description: 'The Google Calendar event ID from get_bookings' },
          } as Record<string, ElevenLabs.LiteralJsonSchemaProperty>,
          required: ['google_event_id'],
        },
      },
    },
  ]

  const agentId = (tenant as any)['elevenlabs_agent_id'] ?? (tenant as any)['elevenlabs agent id'] ?? null

  if (!agentId) {
    const response = await elevenlabs.conversationalAi.agents.create({
      name: `BookBotics - ${tenant.business_name}`,
      conversationConfig: {
        tts: { voiceId: 'Gubgw9l4dtIoQA9YZHgx', modelId: 'eleven_flash_v2' },
        agent: {
          firstMessage: `Hi, this is ${tenant.ai_name} from ${tenant.business_name}. How can I help you today?`,
          prompt: { prompt: tenant.agent_prompt,  llm: 'claude-haiku-4-5', tools: calendarTools },
        },
      },
    })

    const { error: updErr } = await supabase
      .from('tenants')
      .update({ elevenlabs_agent_id: response.agentId })
      .eq('id', userId)
    if (updErr) throw updErr
  } else {
    await elevenlabs.conversationalAi.agents.update(agentId, {
      name: `BookBotics - ${tenant.business_name}`,
      conversationConfig: {
        tts: { voiceId: 'Gubgw9l4dtIoQA9YZHgx', modelId: 'eleven_flash_v2' },
        agent: {
          firstMessage: `Hi, this is ${tenant.ai_name} from ${tenant.business_name}. How can I help you today?`,
          prompt: { prompt: tenant.agent_prompt, llm: 'claude-haiku-4-5', tools: calendarTools },
        },
      },
    })
  }
}

