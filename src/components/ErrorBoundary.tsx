import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-coffee-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-coffee-200 p-6">
            <h2 className="text-lg font-semibold text-coffee-800 mb-2">页面出现问题</h2>
            <p className="text-sm text-coffee-600 mb-4">
              {this.state.error?.message || '发生了未知错误'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 rounded-xl bg-coffee-600 text-white text-sm font-medium hover:bg-coffee-700 transition-colors"
              >
                重试
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-coffee-100 text-coffee-700 text-sm font-medium hover:bg-coffee-200 transition-colors"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
