import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Lighthouse render error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: '#0b0b0b',
            color: '#f1f1ee',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '32px', letterSpacing: '-0.04em', fontWeight: 400, margin: '0 0 16px' }}>
            LIGHTHOUSE — CINEMA
          </h1>
          <p style={{ color: '#aaa', fontSize: '15px', maxWidth: '480px', marginBottom: '24px' }}>
            화면을 불러오는 중 문제가 발생했습니다. 아래 버튼을 눌러 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: '#f1f1ee',
              color: '#111',
              border: 0,
              padding: '12px 28px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              cursor: 'pointer',
            }}
          >
            페이지 새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
