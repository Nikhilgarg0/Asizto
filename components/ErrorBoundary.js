import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log error to console and potentially to a logging service
    console.error('ErrorBoundary caught an error:', {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorId: errorId
    });

    // You can also log the error to an error reporting service here
    // logErrorToService(error, errorInfo, errorId);
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
  };

  handleReportError = () => {
    // In a real app, you would send this to your error reporting service
    Alert.alert(
      'Error Reported',
      `Error ID: ${this.state.errorId}\n\nThis error has been reported to our team. Thank you for helping us improve the app.`,
      [{ text: 'OK' }]
    );
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          onReport={this.handleReportError}
        />
      );
    }

    return this.props.children;
  }
}

// Error fallback component
const ErrorFallback = ({ error, errorInfo, errorId, onRetry, onReport }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.errorContainer, { backgroundColor: colors.card }]}>
          {/* Error Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={80} color="#FF6B6B" />
          </View>

          {/* Error Title */}
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Oops! Something went wrong
          </Text>

          {/* Error Message */}
          <Text style={[styles.errorMessage, { color: colors.subtext }]}>
            We're sorry, but something unexpected happened. Our team has been notified and is working to fix this issue.
          </Text>

          {/* Error ID for tracking */}
          {errorId && (
            <View style={styles.errorIdContainer}>
              <Text style={[styles.errorIdLabel, { color: colors.subtext }]}>
                Error ID:
              </Text>
              <Text style={[styles.errorId, { color: colors.text, fontFamily: 'monospace' }]}>
                {errorId}
              </Text>
            </View>
          )}
          
          {/* Debug Information (only in development) */}
          {__DEV__ && error && (
            <View style={styles.debugContainer}>
              <Text style={[styles.debugTitle, { color: colors.text }]}>
                Debug Information:
              </Text>
              <Text style={[styles.debugText, { color: colors.subtext, fontFamily: 'monospace' }]}>
                {error.toString()}
              </Text>
              {errorInfo && errorInfo.componentStack && (
                <Text style={[styles.debugText, { color: colors.subtext, fontFamily: 'monospace' }]}>
                  {errorInfo.componentStack}
                </Text>
              )}
            </View>
          )}
          
          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={onRetry}
              accessibilityLabel="Try again"
              accessibilityRole="button"
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.reportButton, { borderColor: colors.primary }]}
              onPress={onReport}
              accessibilityLabel="Report error"
              accessibilityRole="button"
            >
              <Ionicons name="send" size={20} color={colors.primary} />
              <Text style={[styles.reportButtonText, { color: colors.primary }]}>
                Report Error
              </Text>
            </TouchableOpacity>
          </View>

          {/* Help Text */}
          <Text style={[styles.helpText, { color: colors.subtext }]}>
            If this problem persists, please contact our support team.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 32,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorIdContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  errorIdLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorId: {
    fontSize: 14,
    fontWeight: '600',
  },
  debugContainer: {
    width: '100%',
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    maxHeight: 200,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 11,
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 120,
    justifyContent: 'center',
    gap: 8,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 120,
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default ErrorBoundary;
