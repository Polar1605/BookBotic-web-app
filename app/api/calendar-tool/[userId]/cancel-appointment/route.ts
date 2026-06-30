import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { google } from 'googleapis'
import { createAdminSupabaseClient } from '@/Backend/supabase-admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const { google_event_id } = await req.json()

  if (!google_event_id) {
    return NextResponse.json({ error: 'google_event_id is required. Call get_bookings first to retrieve it.' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  // Find the booking record
  const { data: booking, error: fetchErr } = await admin
    .from('bookings')
    .select('id, customer_name, scheduled_at, status')
    .eq('google_event_id', google_event_id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  if (booking.status === 'cancelled') {
    return NextResponse.json({ result: 'This appointment is already cancelled.' })
  }

  // Delete from Google Calendar
  const clerk = await clerkClient()
  const { data: tokens } = await clerk.users.getUserOauthAccessToken(userId, 'google')
  if (!tokens.length) {
    return NextResponse.json({ error: 'Google Calendar not connected.' }, { status: 401 })
  }

  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: tokens[0].token })
  const calendar = google.calendar({ version: 'v3', auth })

  try {
    await calendar.events.delete({ calendarId: 'primary', eventId: google_event_id })
  } catch (calErr: any) {
    // If the event is already gone from Calendar, still mark it cancelled in DB
    if (calErr?.code !== 410 && calErr?.status !== 404) {
      return NextResponse.json({ error: `Failed to delete calendar event: ${calErr.message}` }, { status: 500 })
    }
  }

  // Mark as cancelled in Supabase
  const { error: updateErr } = await admin
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', booking.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({
    result: `Appointment for ${booking.customer_name} on ${booking.scheduled_at} has been cancelled.`,
  })
}
