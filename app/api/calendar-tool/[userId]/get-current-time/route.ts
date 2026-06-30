import { NextRequest, NextResponse } from 'next/server'

const TZ = 'Asia/Singapore'

export async function POST(
  _req: NextRequest,
  _ctx: { params: Promise<{ userId: string }> }
) {
  const now = new Date()

  const date = now.toLocaleDateString('en-CA', { timeZone: TZ }) // YYYY-MM-DD
  const time = now.toLocaleTimeString('en-US', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) // HH:MM

  const display = now.toLocaleString('en-SG', {
    timeZone: TZ,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return NextResponse.json({
    result: `The current Singapore time is ${display}. Use date="${date}" and time="${time}" when booking or checking availability.`,
    date,
    time,
  })
}
