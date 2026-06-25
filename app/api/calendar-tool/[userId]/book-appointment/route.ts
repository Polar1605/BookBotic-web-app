import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { google } from 'googleapis'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const { date, time, customer_name, duration_minutes = 60 } = await req.json()

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

  const startUtc = new Date(localToUtc(`${date}T${time}:00`, tz))
  const endUtc = new Date(startUtc.getTime() + duration_minutes * 60000)

  await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: `Appointment with ${customer_name}`,
      start: { dateTime: startUtc.toISOString() },
      end: { dateTime: endUtc.toISOString() },
    },
  })

  return NextResponse.json({
    result: `Appointment booked for ${customer_name} on ${date} at ${time} for ${duration_minutes} minutes.`,
  })
}

// Convert a local datetime string (no tz suffix) into a UTC ISO string,
// treating the input as being in the given IANA timezone.
// Relies on the server running in UTC (Vercel default).
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
