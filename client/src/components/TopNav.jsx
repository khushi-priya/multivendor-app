import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homePath } from '../context/AuthContext.jsx';
import { menuFor, roleLabel } from '../navigation/menus.js';

const linkCls = ({ isActive }) =>
  `block rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
  }`;

// Desktop breakpoint is `xl` because the shop-owner menu has many entries; below it, a hamburger panel is used.
export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = menuFor(user);
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [location.pathname]);

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header ref={wrapRef} className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <Link to={homePath(user)} className="mr-2 text-lg font-bold text-indigo-700">
          {user && user.shop ? user.shop.name : 'Multivendor'}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden flex-1 items-center gap-1 xl:flex" aria-label="Main">
          {items.map((item) =>
            item.children ? (
              <div key={item.label} className="relative">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  aria-expanded={openMenu === item.label}
                  onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
                >
                  {item.label} <span className="text-xs">▾</span>
                </button>
                {openMenu === item.label && (
                  <div className="absolute left-0 top-full mt-1 min-w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                    {item.children.map((c) => (
                      <NavLink key={c.to} to={c.to} className={linkCls}>
                        {c.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkCls}>
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="flex-1 xl:hidden" />

        {user ? (
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100"
              aria-expanded={openMenu === '__user'}
              onClick={() => setOpenMenu(openMenu === '__user' ? null : '__user')}
            >
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight text-slate-800">{user.name}</span>
                <span className="block text-xs leading-tight text-slate-500">{roleLabel(user)}</span>
              </span>
              <span className="text-xs">▾</span>
            </button>
            {openMenu === '__user' && (
              <div className="absolute right-0 top-full mt-1 min-w-44 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                <div className="px-3 py-2 text-xs text-slate-500">{user.email}</div>
                <button type="button" onClick={onLogout} className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50">
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Sign In
            </Link>
            <Link to="/register" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
              Register
            </Link>
          </div>
        )}

        {/* Hamburger */}
        {items.length > 0 && (
          <button
            type="button"
            className="rounded-md p-2 text-slate-700 hover:bg-slate-100 xl:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <nav className="max-h-[75vh] overflow-y-auto border-t border-slate-200 px-4 py-2 xl:hidden" aria-label="Mobile">
          {items.map((item) =>
            item.children ? (
              <div key={item.label} className="py-1">
                <div className="px-3 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</div>
                {item.children.map((c) => (
                  <NavLink key={c.to} to={c.to} className={linkCls}>
                    {c.label}
                  </NavLink>
                ))}
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkCls}>
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
      )}
    </header>
  );
}
