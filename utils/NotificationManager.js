// utils/NotificationManager.js
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Ensure notification permissions & Android channel.
 */
async function ensureNotificationSetup() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    throw new Error('Notification permission not granted.');
  }

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('medicines', {
        name: 'Medicine Reminders',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch (e) {
      console.warn('Channel create failed', e);
    }
  }
}

/**
 * Helper: build friendly first name from full name
 */
function getFirstName(displayName) {
  if (!displayName) return '';
  return displayName.split(' ')[0];
}

/**
 * Schedule medicine notifications (personalized).
 * - medicine: { id, name, times: Date[], duration: number }
 * - userName: string (displayName or firstName)
 * Returns array of scheduled notification IDs.
 */
export async function scheduleMedicineNotifications({ id, name, times, duration }, userName) {
  await ensureNotificationSetup();

  const firstName = getFirstName(userName);
  const now = new Date();
  const scheduledIds = [];
  const MAX = 500;

  const validTimes = (times || []).map(t => {
    if (t instanceof Date) return new Date(t);
    if (t && typeof t.toDate === 'function') return t.toDate();
    return new Date(t);
  }).filter(d => d instanceof Date && !isNaN(d.getTime()));

  for (let day = 0; day < duration; day++) {
    for (let i = 0; i < validTimes.length; i++) {
      const timeOfDay = validTimes[i];
      const triggerDate = new Date(now);
      triggerDate.setDate(now.getDate() + day);
      triggerDate.setHours(timeOfDay.getHours(), timeOfDay.getMinutes(), 0, 0);

      // skip past
      if (triggerDate.getTime() <= now.getTime()) continue;

      const title = firstName
        ? `💊 ${firstName}, time for ${name}`
        : `💊 Time for ${name}`;

      const body = `Dose ${i + 1} at ${timeOfDay.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Tap to mark taken.`;

      try {
        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: {
              type: 'medicine',
              medicineId: id,
              doseNumber: i + 1,
            },
            sound: 'default',
          },
          trigger: triggerDate,
        });
        scheduledIds.push(notifId);
      } catch (err) {
        console.error('Schedule fail', err);
      }

      if (scheduledIds.length >= MAX) {
        console.warn('Reached schedule cap');
        break;
      }
    }
    if (scheduledIds.length >= MAX) break;
  }

  console.log(`Scheduled ${scheduledIds.length} medicine reminders for ${name}`);
  return scheduledIds;
}

/**
 * Schedule a single appointment reminder (personalized).
 * - appointment: { id, with: 'Dr. Sharma', time: Date, location: 'Clinic', type: 'appointment' }
 * - userName: string
 * - advanceMinutes: number (e.g., 60 for 1 hour before), or 1440 for 24h
 */
export async function scheduleAppointmentNotification(appointment, userName, advanceMinutes = 60) {
  await ensureNotificationSetup();

  const firstName = getFirstName(userName);
  const when = new Date(appointment.time);
  const triggerDate = new Date(when.getTime() - advanceMinutes * 60 * 1000);

  if (triggerDate.getTime() <= Date.now()) {
    console.warn('Appointment trigger is in the past — skipping');
    return null;
  }

  const title = firstName
    ? `📅 ${firstName}, appointment with ${appointment.with}`
    : `📅 Appointment with ${appointment.with}`;

  const body = `${appointment.time ? new Date(appointment.time).toLocaleString() : ''} — ${appointment.location || ''}. Tap for details.`;

  try {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'appointment',
          appointmentId: appointment.id,
        },
        sound: 'default',
      },
      trigger: triggerDate,
    });
    return notifId;
  } catch (err) {
    console.error('Appointment schedule failed', err);
    return null;
  }
}

export default {
  scheduleMedicineNotifications,
  scheduleAppointmentNotification,
};
