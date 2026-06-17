'use server'

import { auth } from '@clerk/nextjs/server'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { createServerSupabaseClient } from '@/Backend/supabase-server'

export async function createAgentAction() {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')

  const supabase = createServerSupabaseClient()

  const { data: tenant, error: selErr } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', userId)
    .single()
  if (selErr) throw selErr

  const elevenlabs = new ElevenLabsClient()

  if(!tenant.elevenlabs_agent_id) {
    const response = await elevenlabs.conversationalAi.agents.create({
    name: `BookBotics - ${tenant.business_name}`,
    conversationConfig: {
      tts: { voiceId: 'Gubgw9l4dtIoQA9YZHgx', modelId: 'eleven_flash_v2' },
      agent: {
        firstMessage: `Hi, this is Rachel from ${tenant}. How can I help you today?`,
        prompt: { prompt: tenant.agent_prompt },
      },
    },
  })

    const { error: updErr } = await supabase
      .from('tenants')
      .update({ elevenlabs_agent_id: response.agentId })
      .eq('id', userId)
    if (updErr) throw updErr
  }

  else {
    await elevenlabs.conversationalAi.agents.update(`${tenant}`, {
      name: `BookBotics - ${tenant}`,
      conversationConfig: {
        tts: { voiceId: 'Gubgw9l4dtIoQA9YZHgx', modelId: 'eleven_flash_v2' },
        agent: {
          firstMessage: `Hi, this is Rachel from ${tenant.business_name}. How can I help you today?`,
          prompt: { prompt: tenant.agent_prompt },
        },
      },
    });

  }
}
