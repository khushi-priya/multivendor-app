

import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const navigationLinks = [
  { label: 'Home', to: '/customer', icon: 'home', end: true },
  { label: 'Shop', to: '/customer/products', icon: 'shopping-bag' },
  { label: 'Categories', to: '/customer/categories', icon: 'grid' },
  { label: 'Wishlist', to: '/customer/wishlist', icon: 'heart' },
  { label: 'My Orders', to: '/customer/orders', icon: 'package' },
  { label: 'Payments', to: '/customer/payments', icon: 'credit-card' },
  { label: 'Profile', to: '/customer/profile', icon: 'user' },
];

function NavIcon({ name, className = 'h-5 w-5' }) {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  };

  const paths = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9M9 20v-7h6v7" />
      </>
    ),
    'shopping-bag': (
      <>
        <path d="M5 8h14l1 13H4L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8Z" />
    ),
    package: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" />
      </>
    ),
    'credit-card': (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="2" />
        <path d="M2.5 10h19M6.5 15h4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    cart: (
      <>
        <path d="M3 3h2l2.5 12h10.8l2-8H6" />
        <circle cx="9" cy="19" r="1.4" />
        <circle cx="17" cy="19" r="1.4" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    shield: (
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
    ),
    truck: (
      <>
        <path d="M3 6h12v11H3zM15 10h4l3 4v3h-7z" />
        <circle cx="7.5" cy="19" r="1.5" />
        <circle cx="18.5" cy="19" r="1.5" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.grid}</svg>;
}

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [cartCount, setCartCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const refreshCartCount = useCallback(async () => {
    if (user?.role !== 'customer') {
      setCartCount(0);
      return;
    }

    try {
      const response = await api.get('/customer/cart');
      const data = response?.data ?? response;

      const carts = Array.isArray(data)
        ? data
        : Array.isArray(data?.carts)
          ? data.carts
          : [];

      const count = carts.reduce(
        (total, cart) =>
          total +
          (cart.items || []).reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0
          ),
        0
      );

      setCartCount(count);
    } catch (error) {
      console.error('Failed to refresh cart count:', error);
    }
  }, [user?.role]);

  useEffect(() => {
    refreshCartCount();

    window.addEventListener('customer:cart-updated', refreshCartCount);

    return () => {
      window.removeEventListener('customer:cart-updated', refreshCartCount);
    };
  }, [refreshCartCount]);

  useEffect(() => {
    setMobileOpen(false);
  }, [navigate]);

  const signOut = async () => {
    if (signingOut) return;

    setSigningOut(true);

    try {
      await logout();
      setMobileOpen(false);
      navigate('/customer');
    } catch (error) {
      console.error('Failed to sign out:', error);
    } finally {
      setSigningOut(false);
    }
  };

  const navClass = ({ isActive }) =>
    `whitespace-nowrap rounded-xl px-3 py-2.5 text-[13px] font-semibold transition duration-200 ${
      isActive
        ? 'bg-[#526B50] text-white shadow-sm'
        : 'text-[#62685D] hover:bg-[#E9EDE4] hover:text-[#34483A]'
    }`;

  const mobileNavClass = ({ isActive }) =>
    `flex items-center gap-2.5 rounded-xl border p-3 text-sm font-semibold transition duration-200 ${
      isActive
        ? 'border-[#526B50] bg-[#526B50] text-white'
        : 'border-[#E8E4DA] bg-[#FDFCF8] text-[#62685D] hover:bg-[#E9EDE4]'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F5EF] text-[#343B32]">
      {/* Announcement strip */}
      <div className="hidden bg-[#34483A] px-4 py-2 text-center text-xs font-medium tracking-wide text-[#F7F5EF] sm:block">
        A LITTLE CLOSER TO WHAT YOU LOVE
        <span className="mx-2 text-[#B9C8B4]">|</span>
        Discover something special today
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-40 border-b border-[#E8E4DA] bg-[#FDFCF8]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:gap-8 lg:px-8">
          {/* Brand */}
          <Link
            to="/customer"
            onClick={() => setMobileOpen(false)}
            className="group flex shrink-0 items-center gap-2.5"
            aria-label="Market home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#526B50] text-white shadow-sm transition group-hover:bg-[#3F563D]">
              <NavIcon name="shopping-bag" className="h-5 w-5" />
            </span>

            <span className="text-xl font-black tracking-tight text-[#34483A] sm:text-2xl">
              market<span className="text-[#C7795D]">.</span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav
            aria-label="Customer navigation"
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex"
          >
            {navigationLinks.map(({ label, to, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={navClass}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Header actions */}
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              to={
                user?.role === 'customer'
                  ? '/customer/cart'
                  : '/customer/login'
              }
              className="group relative flex h-10 items-center gap-2 rounded-xl border border-[#DEDCCF] bg-[#FDFCF8] px-3 text-sm font-semibold text-[#34483A] transition hover:border-[#526B50] hover:bg-[#EEF1E9] sm:px-4"
              aria-label={`Shopping cart, ${cartCount} items`}
            >
              <NavIcon name="cart" className="h-[19px] w-[19px]" />
              <span className="hidden sm:inline">Cart</span>

              {cartCount > 0 && (
                <span className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#C7795D] px-1 text-[10px] font-bold text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {user?.role === 'customer' ? (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  to="/customer/profile"
                  className="flex max-w-36 items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-[#E9EDE4]"
                  title="My profile"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#526B50] text-sm font-bold uppercase text-white">
                    {user.name?.trim()?.charAt(0) || 'C'}
                  </span>

                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#929184]">
                      Account
                    </span>
                    <span className="block truncate text-xs font-bold text-[#34483A]">
                      {user.name || 'Customer'}
                    </span>
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="hidden rounded-xl px-3 py-2 text-xs font-semibold text-[#77786D] transition hover:bg-[#E9EDE4] hover:text-[#34483A] disabled:cursor-not-allowed disabled:opacity-50 2xl:block"
                >
                  {signingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            ) : (
              <Link
                to="/customer/login"
                className="hidden items-center rounded-xl bg-[#526B50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3F563D] sm:inline-flex"
              >
                Sign in
                <NavIcon name="arrow" className="ml-2 h-4 w-4" />
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={
                mobileOpen
                  ? 'Close customer navigation'
                  : 'Open customer navigation'
              }
              aria-expanded={mobileOpen}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DEDCCF] bg-[#FDFCF8] text-[#34483A] transition hover:bg-[#E9EDE4] xl:hidden"
            >
              <NavIcon name={mobileOpen ? 'close' : 'menu'} />
            </button>
          </div>
        </div>

        {/* Tablet navigation */}
        <nav
          aria-label="Customer navigation"
          className="hidden overflow-x-auto border-t border-[#EEEAE0] px-4 py-2 md:flex xl:hidden"
        >
          <div className="mx-auto flex w-full max-w-[1440px] items-center gap-1 sm:px-2">
            {navigationLinks.map(({ label, to, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#526B50] text-white'
                      : 'text-[#62685D] hover:bg-[#E9EDE4] hover:text-[#34483A]'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Mobile navigation */}
        {mobileOpen && (
          <div className="border-t border-[#E8E4DA] bg-[#FDFCF8] shadow-lg xl:hidden">
            <nav
              aria-label="Mobile customer navigation"
              className="mx-auto grid max-w-[1440px] grid-cols-2 gap-2 p-4 sm:grid-cols-3"
            >
              {navigationLinks.map(({ label, to, icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={mobileNavClass}
                >
                  <NavIcon name={icon} className="h-[18px] w-[18px]" />
                  {label}
                </NavLink>
              ))}

              {user?.role === 'customer' ? (
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="flex items-center gap-2.5 rounded-xl border border-[#E8E4DA] bg-[#FDFCF8] p-3 text-left text-sm font-semibold text-[#62685D] transition hover:bg-[#E9EDE4] disabled:opacity-50"
                >
                  <NavIcon name="user" className="h-[18px] w-[18px]" />
                  {signingOut ? 'Signing out...' : 'Sign out'}
                </button>
              ) : (
                <Link
                  to="/customer/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center rounded-xl bg-[#526B50] p-3 text-sm font-semibold text-white transition hover:bg-[#3F563D]"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E8E4DA] bg-[#EEECE3]">
        <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <Link
                to="/customer"
                className="inline-flex items-center gap-2.5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#526B50] text-white">
                  <NavIcon
                    name="shopping-bag"
                    className="h-[18px] w-[18px]"
                  />
                </span>

                <span className="text-xl font-black tracking-tight text-[#34483A]">
                  market<span className="text-[#C7795D]">.</span>
                </span>
              </Link>

              <p className="mt-3 max-w-sm text-sm leading-6 text-[#77786D]">
                Your local marketplace for discovering products
                and shopping from neighborhood stores in one place.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#DCD9CD] bg-[#F7F5EF] px-3 py-2 text-xs font-medium text-[#62685D]">
                <span className="h-2 w-2 rounded-full bg-[#789477]" />
                Shop local. Find your favorites.
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#34483A]">
                Explore
              </h3>

              <div className="mt-4 flex flex-col items-start gap-3">
                <Link
                  to="/customer/products"
                  className="text-sm text-[#77786D] transition hover:text-[#526B50]"
                >
                  Browse products
                </Link>
                <Link
                  to="/customer/categories"
                  className="text-sm text-[#77786D] transition hover:text-[#526B50]"
                >
                  Categories
                </Link>
                <Link
                  to="/customer/wishlist"
                  className="text-sm text-[#77786D] transition hover:text-[#526B50]"
                >
                  My wishlist
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#34483A]">
                Your account
              </h3>

              <div className="mt-4 flex flex-col items-start gap-3">
                <Link
                  to="/customer/orders"
                  className="text-sm text-[#77786D] transition hover:text-[#526B50]"
                >
                  Track orders
                </Link>
                <Link
                  to="/customer/payments"
                  className="text-sm text-[#77786D] transition hover:text-[#526B50]"
                >
                  Payment history
                </Link>
                <Link
                  to="/customer/profile"
                  className="text-sm text-[#77786D] transition hover:text-[#526B50]"
                >
                  My profile
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-[#DCD9CD] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#77786D]">
              © {new Date().getFullYear()} Market. All rights reserved.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#77786D]">
              <span className="inline-flex items-center gap-1.5">
                <NavIcon
                  name="shield"
                  className="h-4 w-4 text-[#526B50]"
                />
                Secure account access
              </span>

              <span className="inline-flex items-center gap-1.5">
                <NavIcon
                  name="truck"
                  className="h-4 w-4 text-[#526B50]"
                />
                Local store shopping
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
