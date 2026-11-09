import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const titles = [
  [/\/catalog\/categories$/, 'Manage Categories'], [/\/catalog\/subcategories$/, 'Manage Subcategories'],
  [/\/catalog\/brands$/, 'Manage Brands'], [/\/catalog\/attributes$/, 'Variants & Attributes'],
  [/\/catalog\/products$/, 'Manage Products'], [/\/dashboard$/, 'Dashboard'], [/\/employees$/, 'Employees'],
  [/\/attendance$/, 'Attendance'], [/\/salary$/, 'Salary'], [/\/payroll$/, 'Payroll'], [/\/shops\/new$/, 'Create Shop'], [/\/shops$/, 'Shops'],
];

export default function AppHeader() {
  const { pathname } = useLocation(); const { user } = useAuth();
  const title = titles.find(([pattern]) => pattern.test(pathname))?.[1] || pathname.split('/').filter(Boolean).at(-1)?.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Dashboard';
  return <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur lg:flex"><div><p className="text-xs font-medium uppercase tracking-[.14em] text-slate-400">Workspace / {user?.shop?.name || (user?.role === 'super_admin' ? 'Super Admin' : 'Account')}</p><h1 className="mt-0.5 text-lg font-semibold text-slate-900">{title}</h1></div><div className="flex items-center gap-3"><div className="text-right"><p className="text-sm font-semibold text-slate-800">{user?.name || 'Guest'}</p><p className="text-xs text-slate-500">{user?.shop?.role?.replace(/_/g, ' ') || user?.role?.replace(/_/g, ' ')}</p></div><div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{user?.name?.slice(0, 1)?.toUpperCase() || '?'}</div></div></header>;
}
