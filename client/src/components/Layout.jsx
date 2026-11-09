import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import AppHeader from './AppHeader.jsx';

// Authenticated and public app content shares the responsive role-aware sidebar.
export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((value) => !value)} />
      <main className={`min-h-screen pt-16 lg:pt-0 ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-[280px]'}`}>
        <AppHeader />
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
