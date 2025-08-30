// utils/Logger.js
import { Platform } from 'react-native';

// Log levels
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4,
};

// Log level names for display
const LogLevelNames = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.CRITICAL]: 'CRITICAL',
};

class Logger {
  constructor() {
    this.currentLevel = this.getLogLevelFromEnvironment();
    this.logBuffer = [];
    this.maxBufferSize = 100;
    this.isProduction = !__DEV__;
  }

  getLogLevelFromEnvironment() {
    if (this.isProduction) {
      return LogLevel.ERROR; // Only show errors in production
    }
    return LogLevel.DEBUG; // Show all logs in development
  }

  shouldLog(level) {
    return level >= this.currentLevel;
  }

  formatMessage(level, message, data = null, context = null) {
    const timestamp = new Date().toISOString();
    const levelName = LogLevelNames[level];
    const platform = Platform.OS;
    
    let formattedMessage = `[${timestamp}] [${levelName}] [${platform}] ${message}`;
    
    if (context) {
      formattedMessage += ` | Context: ${JSON.stringify(context)}`;
    }
    
    if (data) {
      formattedMessage += ` | Data: ${JSON.stringify(data)}`;
    }
    
    return formattedMessage;
  }

  addToBuffer(level, message, data, context) {
    const logEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      context,
      platform: Platform.OS,
    };

    this.logBuffer.push(logEntry);

    // Keep buffer size manageable
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  debug(message, data = null, context = null) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formattedMessage = this.formatMessage(LogLevel.DEBUG, message, data, context);
      console.log(formattedMessage);
      this.addToBuffer(LogLevel.DEBUG, message, data, context);
    }
  }

  info(message, data = null, context = null) {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedMessage = this.formatMessage(LogLevel.INFO, message, data, context);
      console.info(formattedMessage);
      this.addToBuffer(LogLevel.INFO, message, data, context);
    }
  }

  warn(message, data = null, context = null) {
    if (this.shouldLog(LogLevel.WARN)) {
      const formattedMessage = this.formatMessage(LogLevel.WARN, message, data, context);
      console.warn(formattedMessage);
      this.addToBuffer(LogLevel.WARN, message, data, context);
    }
  }

  error(message, error = null, context = null) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorData = error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : null;
      
      const formattedMessage = this.formatMessage(LogLevel.ERROR, message, errorData, context);
      console.error(formattedMessage);
      this.addToBuffer(LogLevel.ERROR, message, errorData, context);
      
      // In production, you might want to send this to an error reporting service
      this.reportError(message, error, context);
    }
  }

  critical(message, error = null, context = null) {
    if (this.shouldLog(LogLevel.CRITICAL)) {
      const errorData = error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : null;
      
      const formattedMessage = this.formatMessage(LogLevel.CRITICAL, message, errorData, context);
      console.error(formattedMessage);
      this.addToBuffer(LogLevel.CRITICAL, message, errorData, context);
      
      // Critical errors should always be reported
      this.reportError(message, error, context);
    }
  }

  // Method to report errors to external services (Sentry, etc.)
  reportError(message, error, context) {
    if (this.isProduction) {
      // This would integrate with your error reporting service
      // Example: Sentry.captureException(error, { extra: { message, context } });
      console.warn('Error reporting not configured for production');
    }
  }

  // Get recent logs for debugging
  getRecentLogs(level = null, count = 50) {
    let filteredLogs = this.logBuffer;
    
    if (level !== null) {
      filteredLogs = this.logBuffer.filter(log => log.level >= level);
    }
    
    return filteredLogs.slice(-count);
  }

  // Clear log buffer
  clearBuffer() {
    this.logBuffer = [];
  }

  // Set log level dynamically
  setLogLevel(level) {
    if (Object.values(LogLevel).includes(level)) {
      this.currentLevel = level;
      this.info(`Log level changed to ${LogLevelNames[level]}`);
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }

  // Performance logging
  time(label) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(label);
    }
  }

  timeEnd(label) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(label);
    }
  }

  // Group related logs
  group(label) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd();
    }
  }

  // Log user actions for analytics
  logUserAction(action, data = null) {
    this.info(`User Action: ${action}`, data, { type: 'user_action' });
  }

  // Log API calls
  logApiCall(endpoint, method, statusCode, responseTime, data = null) {
    this.info(`API Call: ${method} ${endpoint}`, {
      statusCode,
      responseTime,
      data
    }, { type: 'api_call' });
  }

  // Log navigation events
  logNavigation(from, to, params = null) {
    this.debug(`Navigation: ${from} → ${to}`, params, { type: 'navigation' });
  }

  // Log medicine-related events
  logMedicineEvent(event, medicineId, data = null) {
    this.info(`Medicine Event: ${event}`, { medicineId, ...data }, { type: 'medicine_event' });
  }

  // Log appointment-related events
  logAppointmentEvent(event, appointmentId, data = null) {
    this.info(`Appointment Event: ${event}`, { appointmentId, ...data }, { type: 'appointment_event' });
  }

  // Export logs for debugging (useful for support)
  exportLogs() {
    return {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      logs: this.logBuffer,
      summary: {
        total: this.logBuffer.length,
        byLevel: this.logBuffer.reduce((acc, log) => {
          acc[LogLevelNames[log.level]] = (acc[LogLevelNames[log.level]] || 0) + 1;
          return acc;
        }, {})
      }
    };
  }
}

// Create singleton instance
const logger = new Logger();

// Export both the class and the instance
export { Logger };
export default logger;
