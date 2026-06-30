import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { google } from 'googleapis'
import { createAdminSupabaseClient } from '@/Backend/supabase-admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const body = await req.json()
  const { date, time, customer_name, phone_number, service_id } = body

  if (!service_id) {
    return NextResponse.json({ error: 'service_id is required. Please ask the customer which service they want.' }, { status: 400 })
  }
  if (!date || !time || !customer_name || !phone_number) {
    return NextResponse.json({ error: 'date, time, customer_name, and phone_number are all required.' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  // Fetch tenant to get elevenlabs_agent_id
  const { data: tenant, error: tenantErr } = await admin
    .from('tenants')
    .select('elevenlabs_agent_id')
    .eq('id', userId)
    .maybeSingle()
  if (tenantErr) return NextResponse.json({ error: tenantErr.message }, { status: 500 })
  if (!tenant?.elevenlabs_agent_id) {
    return NextResponse.json({ error: 'Agent not found for this user' }, { status: 404 })
  }

  // Fetch service to get duration
  const { data: service, error: serviceErr } = await admin
    .from('services')
    .select('id, name, duration')
    .eq('id', service_id)
    .maybeSingle()
  if (serviceErr) return NextResponse.json({ error: serviceErr.message }, { status: 500 })
  if (!service) {
    return NextResponse.json({ error: 'Service not found. Please call get_services and use a valid service ID.' }, { status: 404 })
  }

  const duration_minutes: number = service.duration ?? 60

  // Connect to Google Calendar
  const clerk = await clerkClient()
  const { data: tokens } = await clerk.users.getUserOauthAccessToken(userId, 'google')
  if (!tokens.length) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 401 })
  }

  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: tokens[0].token })
  const calendar = google.calendar({ version: 'v3', auth })

  const calInfo = await calendar.calendars.get({ calendarId: 'primary' })
  const tz = calInfo.data.timeZone ?? 'UTC'

  const scheduledAtUtc = localToUtc(`${date}T${time}:00`, tz)
  const startUtc = new Date(scheduledAtUtc)
  const endUtc = new Date(startUtc.getTime() + duration_minutes * 60000)

  const eventRes = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: `${service.name} - ${customer_name}`,
      start: { dateTime: startUtc.toISOString() },
      end: { dateTime: endUtc.toISOString() },
    },
  })

  const googleEventId = eventRes.data.id ?? null

  // Insert booking record into Supabase
  const { error: bookingErr } = await admin
    .from('bookings')
    .insert({
      elevenlabs_agent_id: tenant.elevenlabs_agent_id,
      service_id: service.id,
      customer_name,
      scheduled_at: startUtc.toISOString(),
      phone_numer: parseInt(phone_number.replace(/\D/g, ''), 10) || null,
      google_event_id: googleEventId,
      status: 'confirmed',
    })

  if (bookingErr) {
    console.error('Failed to save booking record:', bookingErr)
    // Calendar event already created — return success but note the DB issue
    return NextResponse.json({
      result: `Appointment booked for ${customer_name} on ${date} at ${time} for ${service.name} (${duration_minutes} min). Note: booking record could not be saved: ${bookingErr.message}`,
    })
  }

  return NextResponse.json({
    result: `Appointment booked for ${customer_name} on ${date} at ${time} for ${service.name} (${duration_minutes} min).`,
  })
}

// Convert a local datetime string (no tz suffix) into a UTC ISO string,
// treating the input as being in the given IANA timezone.
function localToUtc(localStr: string, tz: string): string {
  const asIfUtc = new Date(localStr + 'Z')
  const localRepr = new Date(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).format(asIfUtc)
  )
  const offsetMs = asIfUtc.getTime() - localRepr.getTime()
  return new Date(asIfUtc.getTime() + offsetMs).toISOString()
}
