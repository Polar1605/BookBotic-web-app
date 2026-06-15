import { Webhook } from 'svix'
import { createAdminSupabaseClient } from '@/Backend/supabase-admin'

type ClerkUserCreatedEvent = {
  type: 'user.created'
  data: {
    id: string
    email_addresses: { email_address: string }[]
  }
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) return Response.json({ error: 'Webhook secret not configured' }, { status: 500 })

  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await req.text()

  let event: ClerkUserCreatedEvent
  try {
    event = new Webhook(secret).verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserCreatedEvent
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'user.created') {
    const supabase = createAdminSupabaseClient()
    await supabase.from('tenants').insert({
      id: event.data.id,
      business_name: 'My business',
      contact_email: event.data.email_addresses[0]?.email_address ?? null,
    })
  }

  return Response.json({ ok: true })
}
