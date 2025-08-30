// utils/PerformanceMonitor.js
import { InteractionManager } from 'react-native';
import logger from './Logger';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.screenLoadTimes = new Map();
    this.operationTimes = new Map();
    this.isEnabled = __DEV__; // Only enable in development by default
  }

  // Enable/disable performance monitoring
  setEnabled(enabled) {
    this.isEnabled = enabled;
    logger.info(`Performance monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Start timing an operation
  startTimer(operationName) {
    if (!this.isEnabled) return null;
    
    const timerId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.operationTimes.set(timerId, {
      operation: operationName,
      startTime: performance.now(),
      startTimestamp: Date.now()
    });
    
    return timerId;
  }

  // End timing an operation
  endTimer(timerId) {
    if (!this.isEnabled || !timerId) return null;
    
    const timer = this.operationTimes.get(timerId);
    if (!timer) {
      logger.warn(`Timer not found: ${timerId}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - timer.startTime;
    
    const metric = {
      operation: timer.operation,
      duration,
      startTime: timer.startTime,
      endTime,
      startTimestamp: timer.startTimestamp,
      endTimestamp: Date.now()
    };

    // Store metric
    this.metrics.set(timerId, metric);
    
    // Log performance data
    if (duration > 100) { // Log slow operations (>100ms)
      logger.warn(`Slow operation detected: ${timer.operation}`, {
        duration: `${duration.toFixed(2)}ms`,
        operation: timer.operation
      });
    } else {
      logger.debug(`Operation completed: ${timer.operation}`, {
        duration: `${duration.toFixed(2)}ms`,
        operation: timer.operation
      });
    }

    // Clean up timer
    this.operationTimes.delete(timerId);
    
    return metric;
  }

  // Measure screen load time
  startScreenLoad(screenName) {
    if (!this.isEnabled) return null;
    
    const timerId = this.startTimer(`screen_load_${screenName}`);
    
    // Use InteractionManager to measure when screen is fully interactive
    InteractionManager.runAfterInteractions(() => {
      if (timerId) {
        this.endTimer(timerId);
      }
    });
    
    return timerId;
  }

  // Measure API call performance
  startApiCall(endpoint, method) {
    if (!this.isEnabled) return null;
    
    return this.startTimer(`api_${method}_${endpoint}`);
  }

  // End API call measurement
  endApiCall(timerId, statusCode, success = true) {
    if (!this.isEnabled || !timerId) return null;
    
    const metric = this.endTimer(timerId);
    if (metric) {
      metric.statusCode = statusCode;
      metric.success = success;
      
      // Log API performance
      logger.info(`API call completed`, {
        duration: `${metric.duration.toFixed(2)}ms`,
        statusCode,
        success,
        operation: metric.operation
      });
    }
    
    return metric;
  }

  // Measure component render time
  startComponentRender(componentName) {
    if (!this.isEnabled) return null;
    
    return this.startTimer(`render_${componentName}`);
  }

  // End component render measurement
  endComponentRender(timerId) {
    if (!this.isEnabled || !timerId) return null;
    
    return this.endTimer(timerId);
  }

  // Measure database operation
  startDbOperation(operation, collection) {
    if (!this.isEnabled) return null;
    
    return this.startTimer(`db_${operation}_${collection}`);
  }

  // End database operation measurement
  endDbOperation(timerId, success = true, recordCount = 0) {
    if (!this.isEnabled || !timerId) return null;
    
    const metric = this.endTimer(timerId);
    if (metric) {
      metric.success = success;
      metric.recordCount = recordCount;
      
      // Log database performance
      logger.info(`Database operation completed`, {
        duration: `${metric.duration.toFixed(2)}ms`,
        success,
        recordCount,
        operation: metric.operation
      });
    }
    
    return metric;
  }

  // Get performance summary
  getPerformanceSummary() {
    if (!this.isEnabled) return null;
    
    const metrics = Array.from(this.metrics.values());
    const summary = {
      totalOperations: metrics.length,
      averageDuration: 0,
      slowOperations: [],
      operationsByType: {},
      totalDuration: 0
    };

    if (metrics.length > 0) {
      metrics.forEach(metric => {
        summary.totalDuration += metric.duration;
        
        // Categorize operations
        const operationType = metric.operation.split('_')[0];
        if (!summary.operationsByType[operationType]) {
          summary.operationsByType[operationType] = [];
        }
        summary.operationsByType[operationType].push(metric);
        
        // Track slow operations (>100ms)
        if (metric.duration > 100) {
          summary.slowOperations.push(metric);
        }
      });
      
      summary.averageDuration = summary.totalDuration / summary.totalOperations;
    }

    return summary;
  }

  // Get slow operations
  getSlowOperations(threshold = 100) {
    if (!this.isEnabled) return [];
    
    const metrics = Array.from(this.metrics.values());
    return metrics.filter(metric => metric.duration > threshold)
      .sort((a, b) => b.duration - a.duration);
  }

  // Get operations by type
  getOperationsByType(type) {
    if (!this.isEnabled) return [];
    
    const metrics = Array.from(this.metrics.values());
    return metrics.filter(metric => metric.operation.startsWith(type));
  }

  // Clear all metrics
  clearMetrics() {
    this.metrics.clear();
    this.operationTimes.clear();
    logger.info('Performance metrics cleared');
  }

  // Export performance data for analysis
  exportPerformanceData() {
    if (!this.isEnabled) return null;
    
    const summary = this.getPerformanceSummary();
    const slowOperations = this.getSlowOperations();
    
    return {
      timestamp: new Date().toISOString(),
      summary,
      slowOperations,
      allMetrics: Array.from(this.metrics.values()),
      recommendations: this.generateRecommendations(summary, slowOperations)
    };
  }

  // Generate performance recommendations
  generateRecommendations(summary, slowOperations) {
    const recommendations = [];
    
    if (summary.averageDuration > 200) {
      recommendations.push('Average operation time is high. Consider optimizing database queries and component rendering.');
    }
    
    if (slowOperations.length > 5) {
      recommendations.push('Multiple slow operations detected. Review API endpoints and database queries.');
    }
    
    const apiOperations = this.getOperationsByType('api');
    const slowApiCalls = apiOperations.filter(op => op.duration > 500);
    if (slowApiCalls.length > 0) {
      recommendations.push('Slow API calls detected. Consider implementing caching or optimizing backend.');
    }
    
    const renderOperations = this.getOperationsByType('render');
    const slowRenders = renderOperations.filter(op => op.duration > 100);
    if (slowRenders.length > 0) {
      recommendations.push('Slow component renders detected. Consider using React.memo or optimizing component logic.');
    }
    
    return recommendations;
  }

  // Monitor memory usage (if available)
  getMemoryInfo() {
    if (!this.isEnabled) return null;
    
    // This would integrate with React Native's memory monitoring
    // For now, return basic info
    return {
      timestamp: Date.now(),
      available: 'Not available',
      used: 'Not available'
    };
  }

  // Set performance thresholds
  setThresholds(thresholds) {
    this.thresholds = {
      slowOperation: 100,
      verySlowOperation: 500,
      criticalOperation: 1000,
      ...thresholds
    };
    
    logger.info('Performance thresholds updated', this.thresholds);
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export both the class and the instance
export { PerformanceMonitor };
export default performanceMonitor;
