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

  const start = new Date(`${date}T${time}:00`)
  const end = new Date(start.getTime() + duration_minutes * 60000)

  await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: `Appointment with ${customer_name}`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  })

  return NextResponse.json({
    result: `Appointment booked for ${customer_name} on ${date} at ${time} for ${duration_minutes} minutes.`,
  })
}
