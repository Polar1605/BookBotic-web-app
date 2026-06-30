import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/Backend/supabase-admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const { phone_number } = await req.json()

  if (!phone_number) {
    return NextResponse.json({ error: 'phone_number is required.' }, { status: 400 })
  }

  const phoneInt = parseInt(String(phone_number).replace(/\D/g, ''), 10)
  if (isNaN(phoneInt)) {
    return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  const { data: bookings, error } = await admin
    .from('bookings')
    .select('id, google_event_id, customer_name, scheduled_at, status, services(name)')
    .eq('phone_numer', phoneInt)
    .eq('status', 'confirmed')
    .order('scheduled_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ result: 'No upcoming bookings found for that phone number.' })
  }

  const list = bookings.map((b: any) => ({
    google_event_id: b.google_event_id,
    customer_name: b.customer_name,
    service: b.services?.name ?? 'Unknown service',
    scheduled_at: b.scheduled_at,
  }))

  return NextResponse.json({ bookings: list })
}
