import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { AlertTriangle, RefreshCcw } from 'lucide-react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView contentContainerStyle={styles.container}>
          <Card style={styles.card}>
            <Card.Content style={styles.content}>
              <AlertTriangle size={60} color="#FF5252" />
              <Text variant="headlineSmall" style={styles.title}>Something went wrong</Text>
              <Text variant="bodyMedium" style={styles.errorText}>
                {this.state.error?.toString()}
              </Text>
              <Button 
                mode="contained" 
                onPress={this.handleReset}
                icon={() => <RefreshCcw size={20} color="#FFF" />}
                style={styles.button}
              >
                Try Again
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  card: {
    borderRadius: 20,
    elevation: 4,
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginTop: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  errorText: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    borderRadius: 12,
    backgroundColor: '#1A73E8',
  },
});

export default ErrorBoundary;
