package `in`.nikhilcodes.asizto

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.HeadlessJsTaskService

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Log.d("BootReceiver", "Received action: " + intent.action)
        if (Intent.ACTION_BOOT_COMPLETED == intent.action || "android.intent.action.QUICKBOOT_POWERON" == intent.action) {
            try {
                val serviceIntent = Intent(context, BootTaskService::class.java)
                HeadlessJsTaskService.acquireWakeLockNow(context)
                context.startService(serviceIntent)
                Log.d("BootReceiver", "Successfully started BootTaskService")
            } catch (e: Exception) {
                Log.e("BootReceiver", "Failed to start BootTaskService", e)
            }
        }
    }
}
