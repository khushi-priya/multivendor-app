import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error, info) {
    console.error('Application render failed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><section role="alert" className="w-full max-w-xl rounded-2xl border border-rose-200 bg-white p-8 shadow-xl"><div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-rose-50 text-xl font-bold text-rose-700">!</div><h1 className="text-xl font-bold text-slate-900">This page could not be displayed</h1><p className="mt-2 text-sm leading-6 text-slate-600">A rendering error occurred. You can reload the application and try again.</p><pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{this.state.error.message}</pre><button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Reload application</button></section></main>;
  }
}
