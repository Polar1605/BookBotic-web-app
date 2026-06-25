import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { google } from 'googleapis'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { date } = await req.json()

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

    const timeMin = localToUtc(`${date}T00:00:00`, tz)
    const timeMax = localToUtc(`${date}T23:59:59`, tz)

    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: 'primary' }],
      },
    })

    const busy = data.calendars?.primary?.busy ?? []

    if (!busy.length) {
      return NextResponse.json({ result: `The calendar is completely free on ${date}.` })
    }

    const busyTimes = busy
      .map(b => `${fmt(b.start!, tz)} - ${fmt(b.end!, tz)}`)
      .join(', ')

    return NextResponse.json({
      result: `On ${date}, the calendar is busy during: ${busyTimes}. All other times are available.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
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

function fmt(dateStr: string, tz: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  })
}
