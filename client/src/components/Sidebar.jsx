


import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homePath } from '../context/AuthContext.jsx';
import { menuFor, roleLabel } from '../navigation/menus.js';

const iconPath = (label = '') => {
  const key = label.toLowerCase();

  if (key.includes('dashboard') || key === 'home')
    return 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z';

  if (key.includes('customer store'))
  return 'M3 3h2l2.5 12h10.8l2-8H6M9 19h.01M17 19h.01M9 8V6a3 3 0 0 1 6 0v2';

  if (key.includes('shop') || key.includes('store'))
    return 'M3 10h18M5 10V6l2-3h10l2 3v4M5 10v11h14V10M9 21v-7h6v7';

  if (key.includes('catalog') || key.includes('product') ||
      key.includes('brand') || key.includes('categor'))
    return 'M4 5h16l-1 16H5L4 5zM8 5V3h8v2M8 10h8M8 14h8';

  if (key.includes('wholesaler'))
    return 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M17 11h6';

  if (key.includes('coupon'))
    return 'M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7M4 12a3 3 0 0 0 0-6V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a3 3 0 0 0 0 6M9 8h.01M15 16h.01M15 8l-6 8';

  if (key.includes('employee') || key.includes('user') ||
      key.includes('customer'))
    return 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M17 11h6';

  if (key.includes('order') || key.includes('payment'))
    return 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5';

  if (key.includes('logout'))
    return 'M10 17l5-5-5-5M15 12H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7';

  return 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h4';
};

function Icon({ label }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={iconPath(label)} />
    </svg>
  );
}

export default function Sidebar({
  collapsed = false,
  onToggleCollapse = () => {},
}) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const items = [
  ...menuFor(user),
  ...(user?.role === 'super_admin'
    ? [
        {
          label: 'Customer Store',
          to: '/customer',
          end: true,
        },
      ]
    : []),
];

  const close = () => setMobileOpen(false);

  const doLogout = async () => {
    await logout();
    close();
    navigate('/login');
  };

  const label =
    user?.shop?.name ||
    (user?.role === 'super_admin' ? 'Platform Admin' : 'Multivendor');

  // Automatically expand groups containing the active route.
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const initial = {};

    items.forEach((item) => {
      if (item.children?.some((child) =>
        location.pathname === child.to ||
        location.pathname.startsWith(child.to + '/')
      )) {
        initial[item.label] = true;
      }
    });

    return initial;
  });

  useEffect(() => {
    const activeGroups = items
      .filter((item) =>
        item.children?.some((child) =>
          location.pathname === child.to ||
          location.pathname.startsWith(child.to + '/')
        )
      )
      .map((item) => item.label);

    if (activeGroups.length) {
      setExpandedGroups((previous) => ({
        ...previous,
        ...Object.fromEntries(activeGroups.map((name) => [name, true])),
      }));
    }
  }, [location.pathname]);

  const toggleGroup = (groupName) => {
    setExpandedGroups((previous) => ({
      ...previous,
      [groupName]: !previous[groupName],
    }));
  };

  const isGroupActive = (item) =>
    item.children?.some((child) =>
      location.pathname === child.to ||
      location.pathname.startsWith(child.to + '/')
    );

  return (
    <>
      {/* Mobile header */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <Link
          to={homePath(user)}
          className="flex items-center gap-2 font-bold text-slate-900"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white">
            M
          </span>
          {label}
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
          className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={mobileOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={close}
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-slate-800 bg-slate-950 text-slate-300 transition-all duration-200 lg:translate-x-0
        ${collapsed ? 'lg:w-[88px]' : 'lg:w-[280px]'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Sidebar header */}
        <div
          className={`relative flex h-20 items-center border-b border-white/10 ${
            collapsed ? 'justify-center px-2' : 'gap-3 px-6'
          }`}
        >
          <Link
            to={homePath(user)}
            onClick={close}
            title={label}
            className={`flex min-w-0 items-center gap-3 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 text-lg font-black text-white shadow-lg shadow-indigo-950/40">
              M
            </span>

            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-white">
                  {label}
                </span>
                <span className="mt-0.5 block text-xs text-slate-400">
                  Management portal
                </span>
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden rounded-lg p-2 text-slate-400 hover:bg-white/[.08] hover:text-white lg:block ${
              collapsed
                ? 'absolute -right-3 top-7 rounded-full border border-slate-700 bg-slate-900 shadow'
                : 'ml-auto'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-transform ${
                collapsed ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m14 5-7 7 7 7" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className={`flex-1 space-y-1 overflow-y-auto py-5 ${
            collapsed ? 'px-2' : 'px-3'
          }`}
        >
          {items.map((item) =>
            item.children ? (
              <section key={item.label} className="mb-3">

                {/* Dropdown button */}
                <button
                  type="button"
                  onClick={() => toggleGroup(item.label)}
                  title={item.label}
                  aria-expanded={!!expandedGroups[item.label]}
                  className={`mb-1 flex w-full items-center gap-3 rounded-lg py-3 text-[13px] font-semibold transition
                    ${collapsed ? 'justify-center px-2' : 'px-3'}
                    ${
                      isGroupActive(item)
                        ? 'bg-indigo-500/10 text-indigo-200'
                        : 'text-slate-400 hover:bg-white/[.06] hover:text-white'
                    }`}
                >
                  <Icon label={item.label} />

                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">
                        {item.label}
                      </span>

                      <svg
                        viewBox="0 0 24 24"
                        className={`h-4 w-4 transition-transform duration-200 ${
                          expandedGroups[item.label] ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Dropdown children */}
                {expandedGroups[item.label] && (
                  <div
                    className={`space-y-1 ${
                      collapsed ? '' : 'ml-5 border-l border-white/10 pl-3'
                    }`}
                  >
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        title={collapsed ? child.label : undefined}
                        onClick={close}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg py-2.5 text-[13px] font-medium transition
                          ${collapsed ? 'justify-center px-2' : 'px-3'}
                          ${
                            isActive
                              ? 'bg-indigo-500/15 text-indigo-200 ring-1 ring-inset ring-indigo-400/20'
                              : 'text-slate-400 hover:bg-white/[.06] hover:text-white'
                          }`
                        }
                      >
                        {collapsed ? (
                          <Icon label={child.label} />
                        ) : (
                          <>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              location.pathname === child.to
                                ? 'bg-indigo-300'
                                : 'bg-slate-600'
                            }`} />
                            {child.label}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={collapsed ? item.label : undefined}
                onClick={close}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition
                  ${collapsed ? 'justify-center px-2' : 'px-3'}
                  ${
                    isActive
                      ? 'bg-indigo-500/15 text-indigo-200 ring-1 ring-inset ring-indigo-400/20'
                      : 'text-slate-400 hover:bg-white/[.06] hover:text-white'
                  }`
                }
              >
                <Icon label={item.label} />
                {!collapsed && item.label}
              </NavLink>
            )
          )}
        </nav>

        {/* User profile and logout */}
        {user ? (
          <div
            className={`border-t border-white/10 p-4 ${
              collapsed ? 'px-2' : ''
            }`}
          >
            <div
              title={user.name}
              className={`flex items-center gap-3 rounded-xl bg-white/[.04] p-3 ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-500/20 font-semibold text-indigo-200">
                {user.name?.slice(0, 1)?.toUpperCase()}
              </div>

              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {roleLabel(user)}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              title={collapsed ? 'Sign out' : undefined}
              onClick={doLogout}
              className={`mt-3 flex w-full items-center gap-3 rounded-lg py-2.5 text-sm text-slate-400 hover:bg-rose-500/10 hover:text-rose-200 ${
                collapsed ? 'justify-center px-2' : 'px-3'
              }`}
            >
              <Icon label="logout" />
              {!collapsed && 'Sign out'}
            </button>
          </div>
        ) : (
          <div className="border-t border-white/10 p-4">
            <Link
              to="/login"
              onClick={close}
              title={collapsed ? 'Sign in' : undefined}
              className={`flex rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 ${
                collapsed ? 'justify-center px-2' : 'justify-center px-4'
              }`}
            >
              {collapsed ? '↪' : 'Sign in'}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
