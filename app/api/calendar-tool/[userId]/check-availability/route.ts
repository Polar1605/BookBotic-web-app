import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { google } from 'googleapis'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

  const timeMin = new Date(`${date}T00:00:00`)
  const timeMax = new Date(`${date}T23:59:59`)

  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: 'primary' }],
    },
  })

  const busy = data.calendars?.primary?.busy ?? []

  if (!busy.length) {
    return NextResponse.json({ result: `The calendar is completely free on ${date}.` })
  }

  const busyTimes = busy
    .map(b => `${fmt(b.start!)} - ${fmt(b.end!)}`)
    .join(', ')

  return NextResponse.json({
    result: `On ${date}, the calendar is busy during: ${busyTimes}. All other times are available.`,
  })
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  })
}
