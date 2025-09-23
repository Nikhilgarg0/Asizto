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
      
      await Notifications.setNotificationChannelAsync('appointments', {
        name: 'Appointment Reminders',
        importance: Notifications.AndroidImportance.HIGH,
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
 * Calculate remaining doses for a medicine
 */
function calculateRemainingDoses(medicine) {
  const totalDoses = medicine.quantity || 0;
  const dosesTaken = medicine.takenTimestamps?.length || 0;
  return Math.max(0, totalDoses - dosesTaken);
}

/**
 * Schedule medicine notifications with proper quantity validation.
 * - medicine: { id, name, times: Date[], quantity: number, takenTimestamps: Date[] }
 * - userName: string (displayName or firstName)
 * Returns array of scheduled notification IDs.
 */
export async function scheduleMedicineNotifications(medicine, userName) {
  try {
    await ensureNotificationSetup();

    const firstName = getFirstName(userName);
    const now = new Date();
    const scheduledIds = [];

    // Validate medicine data
    if (!medicine.quantity || medicine.quantity <= 0) {
      console.warn(`Medicine ${medicine.name} has no quantity specified`);
      return [];
    }

    if (!medicine.times || medicine.times.length === 0) {
      console.warn(`Medicine ${medicine.name} has no schedule times`);
      return [];
    }

    // Calculate remaining doses
    const dosesRemaining = calculateRemainingDoses(medicine);
    
    if (dosesRemaining <= 0) {
      console.log(`No medicine left for ${medicine.name}`);
      return [];
    }

    const validTimes = (medicine.times || []).map(t => {
      if (t instanceof Date) return new Date(t);
      if (t && typeof t.toDate === 'function') return t.toDate();
      return new Date(t);
    }).filter(d => d instanceof Date && !isNaN(d.getTime()));

    if (validTimes.length === 0) {
      console.warn(`No valid times found for medicine ${medicine.name}`);
      return [];
    }

    // Calculate how many days we need to schedule
    const dosesPerDay = validTimes.length;
    const daysNeeded = Math.ceil(dosesRemaining / dosesPerDay);

    // Schedule notifications for remaining doses
    let doseCount = 0;
    for (let day = 0; day < daysNeeded && doseCount < dosesRemaining; day++) {
      for (let timeIndex = 0; timeIndex < validTimes.length && doseCount < dosesRemaining; timeIndex++) {
        const timeOfDay = validTimes[timeIndex];
        const triggerDate = new Date(now);
        triggerDate.setDate(now.getDate() + day);
        triggerDate.setHours(timeOfDay.getHours(), timeOfDay.getMinutes(), 0, 0);

        // Skip past times
        if (triggerDate.getTime() <= now.getTime()) continue;

        const title = firstName
          ? `💊 ${firstName}, time for ${medicine.name}`
          : `💊 Time for ${medicine.name}`;

        const body = `Dose ${doseCount + 1} of ${dosesRemaining} remaining. Tap to mark taken.`;

        try {
          const notifId = await Notifications.scheduleNotificationAsync({
              content: {
                title,
                body,
                data: {
                  type: 'medicine',
                  medicineId: medicine.id,
                  doseNumber: doseCount + 1,
                  totalRemaining: dosesRemaining,
                  medicineName: medicine.name,
                },
                sound: 'default',
              },
              trigger: { date: triggerDate },
            });
          scheduledIds.push(notifId);
          doseCount++;
        } catch (err) {
          console.error('Failed to schedule notification:', err);
        }
      }
    }

    console.log(`Scheduled ${scheduledIds.length} medicine reminders for ${medicine.name} (${dosesRemaining} doses remaining)`);
    return scheduledIds;
  } catch (error) {
    console.error('Error scheduling medicine notifications:', error);
    return [];
  }
}

/**
 * Cancel all notifications for a specific medicine
 */
export async function cancelMedicineNotifications(medicineId) {
  try {
    // Get all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Find and cancel notifications for this medicine
    const medicineNotifications = scheduledNotifications.filter(notification => 
      notification.content.data?.medicineId === medicineId
    );

    for (const notification of medicineNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }

    console.log(`Cancelled ${medicineNotifications.length} notifications for medicine ${medicineId}`);
    return medicineNotifications.length;
  } catch (error) {
    console.error('Error cancelling medicine notifications:', error);
    return 0;
  }
}

/**
 * Schedule a single appointment reminder with better error handling.
 * - appointment: { id, with: string, time: Date, location: string, type: string }
 * - userName: string
 * - advanceMinutes: number (e.g., 60 for 1 hour before), or 1440 for 24h
 */
export async function scheduleAppointmentNotification(appointment, userName, advanceMinutes = 60) {
  try {
    await ensureNotificationSetup();

    // Validate appointment data
    if (!appointment.time || !appointment.with) {
      console.warn('Invalid appointment data for notification');
      return null;
    }

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

    const body = `${when.toLocaleString()} — ${appointment.location || 'Location not specified'}. Tap for details.`;

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'appointment',
          appointmentId: appointment.id,
          appointmentTime: appointment.time,
          appointmentWith: appointment.with,
          appointmentLocation: appointment.location,
        },
        sound: 'default',
      },
      trigger: { date: triggerDate },
    });

    console.log(`Scheduled appointment reminder for ${appointment.with} at ${when.toLocaleString()}`);
    return notifId;
  } catch (err) {
    console.error('Appointment schedule failed:', err);
    return null;
  }
}

/**
 * Cancel appointment notification
 */
export async function cancelAppointmentNotification(notificationId) {
  try {
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Appointment notification cancelled');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error cancelling appointment notification:', error);
    return false;
  }
}

/**
 * Get all scheduled notifications for debugging
 */
export async function getAllScheduledNotifications() {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Clear all scheduled notifications (use with caution)
 */
export async function clearAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All notifications cleared');
    return true;
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return false;
  }
}

export default {
  scheduleMedicineNotifications,
  scheduleAppointmentNotification,
  cancelMedicineNotifications,
  cancelAppointmentNotification,
  getAllScheduledNotifications,
  clearAllNotifications,
};
