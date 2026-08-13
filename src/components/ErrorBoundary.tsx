import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全局错误边界：子组件渲染崩溃时显示错误信息，而不是整页白屏
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] 捕获到渲染错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>页面渲染出错</h2>
          <p style={{ color: '#737373', marginBottom: '16px' }}>
            请截图此错误信息发给开发者，然后尝试刷新页面（Ctrl+Shift+R 强制刷新）
          </p>
          <pre style={{
            background: '#f5f5f5', padding: '16px', borderRadius: '8px',
            fontSize: '12px', textAlign: 'left', overflow: 'auto',
            maxWidth: '800px', margin: '0 auto', color: '#dc2626',
          }}>
            {this.state.error?.message || '未知错误'}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              marginTop: '16px', padding: '8px 24px', background: '#6F4E37',
              color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
