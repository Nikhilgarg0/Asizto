package `in`.nikhilcodes.asizto

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.bridge.Arguments

class BootTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val extras = intent?.extras
        return HeadlessJsTaskConfig(
            "background-notification-task", // Task Name registered in JS
            if (extras != null) Arguments.fromBundle(extras) else Arguments.createMap(),
            30000, // 30 seconds timeout
            true // Allow execution in the foreground (optional but helpful)
        )
    }
}
