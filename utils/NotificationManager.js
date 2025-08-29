import * as Notifications from 'expo-notifications';

// This function will schedule all notifications for a given medicine course
export const scheduleMedicineNotifications = async (medicine) => {
  const { name, dosage, times, duration } = medicine;
  const notificationIds = [];

  const now = new Date();

  // Loop for the number of days in the course
  for (let day = 0; day < duration; day++) {
    // Loop through each dose time the user selected
    for (const time of times) {
      const triggerDate = new Date(now);
      triggerDate.setDate(now.getDate() + day);
      triggerDate.setHours(time.getHours());
      triggerDate.setMinutes(time.getMinutes());
      triggerDate.setSeconds(0);

      // If the calculated time is in the past for today, skip it
      if (triggerDate < now) {
        continue;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "💊 Time for your medicine!",
          body: `Remember to take ${name} (${dosage}).`,
        },
        trigger: triggerDate, // Schedule for the specific future date and time
      });
      notificationIds.push(notificationId);
    }
  }

  console.log(`Scheduled ${notificationIds.length} notifications.`);
  return notificationIds;
};