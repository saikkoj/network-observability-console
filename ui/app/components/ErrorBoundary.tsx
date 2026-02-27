import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Paragraph } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Flex
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={16}
          style={{ padding: 64, minHeight: '60vh' }}
        >
          <Heading level={2}>⚠️ Something went wrong</Heading>
          <Paragraph style={{ opacity: 0.7, maxWidth: 480, textAlign: 'center' }}>
            An unexpected error occurred in the Network Observability Console.
          </Paragraph>
          {this.state.error && (
            <pre
              style={{
                fontSize: 12,
                fontFamily: 'monospace',
                padding: 16,
                borderRadius: 8,
                background: 'rgba(220,23,42,0.08)',
                border: '1px solid rgba(220,23,42,0.2)',
                maxWidth: 600,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <Button variant="emphasized" onClick={this.handleReset}>
            Try Again
          </Button>
        </Flex>
      );
    }

    return this.props.children;
  }
}
