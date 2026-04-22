import { google } from 'googleapis'
import { logger } from '../../utils/logger.js'
import { ENV } from '../../config/env.js'
import fs from 'fs'
import path from 'path'

// In a real scenario, the Service Account JSON path should be injected.
const KEY_PATH = path.join(process.cwd(), 'google-credentials.json')

let calendarAuth: any = null

try {
  if (fs.existsSync(KEY_PATH)) {
    calendarAuth = new google.auth.GoogleAuth({
      keyFile: KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'],
    })
  } else {
    logger.warn('google-credentials.json not found. Calendar integration disabled.')
  }
} catch (err) {
  logger.error({ err }, 'Failed to init Google Auth')
}

const calendar = google.calendar({ version: 'v3', auth: calendarAuth })
const CALENDAR_ID = ENV.GOOGLE_CALENDAR_ID || 'primary'

export const calendarService = {
  /**
   * Get available 30-minute slots for the next 7 days.
   */
  async getAvailableSlots(): Promise<string[]> {
    if (!calendarAuth) return []

    try {
      const now = new Date()
      const timeMin = now.toISOString()
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 7)
      const timeMax = maxDate.toISOString()

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin,
          timeMax,
          items: [{ id: CALENDAR_ID }],
        },
      })

      const busySlots = response.data.calendars?.[CALENDAR_ID]?.busy || []
      
      // Calculate 30-min free slots between 10 AM and 6 PM Cairo time (approx UTC+3)
      const freeSlots: string[] = []
      
      // We will generate the next 3 working days (skip weekends if needed)
      let currentDay = new Date(now)
      currentDay.setHours(10, 0, 0, 0) // start at 10 AM

      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        if (freeSlots.length >= 5) break // Only return about 5 options

        currentDay.setDate(now.getDate() + dayOffset)
        
        // Skip Friday and Saturday
        if (currentDay.getDay() === 5 || currentDay.getDay() === 6) {
          continue
        }

        // Check slots from 10:00 to 18:00
        for (let hour = 10; hour < 18; hour++) {
          const slotStart = new Date(currentDay)
          slotStart.setHours(hour, 0, 0, 0)
          
          const slotEnd = new Date(slotStart)
          slotEnd.setMinutes(slotStart.getMinutes() + 30)

          // Is it in the past?
          if (slotStart.getTime() <= now.getTime()) continue

          // Does it conflict with any busy slot?
          const isBusy = busySlots.some(busy => {
            const bStart = new Date(busy.start!).getTime()
            const bEnd = new Date(busy.end!).getTime()
            // Conflict if (StartA < EndB) and (EndA > StartB)
            return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart
          })

          if (!isBusy) {
            // Format naturally in Arabic: "يوم الإثنين الساعة 2:00 مساءً"
            const dateOpts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Africa/Cairo' }
            const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Africa/Cairo' }
            
            const formatterDate = new Intl.DateTimeFormat('ar-EG', dateOpts)
            const formatterTime = new Intl.DateTimeFormat('ar-EG', timeOpts)
            
            freeSlots.push(`${formatterDate.format(slotStart)} - ${formatterTime.format(slotStart)}`)
            
            if (freeSlots.length >= 5) break
          }
        }
      }

      return freeSlots
    } catch (err) {
      logger.error({ err }, 'Failed to fetch free/busy slots')
      return []
    }
  },

  /**
   * Book an appointment
   */
  async bookAppointment(summary: string, description: string, startTimeISO: string): Promise<string | null> {
    if (!calendarAuth) return null

    try {
      const start = new Date(startTimeISO)
      const end = new Date(start)
      end.setMinutes(start.getMinutes() + 30)

      const event = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        conferenceDataVersion: 1,
        requestBody: {
          summary,
          description,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
          }
        }
      })

      return event.data.hangoutLink || null
    } catch (err) {
      logger.error({ err }, 'Failed to book appointment')
      return null
    }
  }
}
