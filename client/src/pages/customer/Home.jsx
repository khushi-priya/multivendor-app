
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Alert, Card, Spinner } from '../../components/ui.jsx';

function HeartIcon({ filled = false, className = 'h-5 w-5' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.7"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"
      />
    </svg>
  );
}

function StarIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="m12 2.5 2.9 5.88 6.49.94-4.7 4.58 1.11 6.47L12 17.31l-5.8 3.06 1.11-6.47-4.7-4.58 6.49-.94L12 2.5Z" />
    </svg>
  );
}

function ArrowIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function BagIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 8h14l1 13H4L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export default function StoreHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [wishlistBusyIds, setWishlistBusyIds] = useState(new Set());
  const [wishlistError, setWishlistError] = useState('');

  const [cartBusyIds, setCartBusyIds] = useState(new Set());
  const [cartMessage, setCartMessage] = useState('');
  const [cartError, setCartError] = useState('');

  // Load storefront data.
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get('/store/categories'),
      api.get('/store/shops'),
      api.get('/store/products?pageSize=8'),
    ])
      .then(([catRes, shopRes, prodRes]) => {
        if (cancelled) return;

        setCategories(catRes.items || []);
        setShops(shopRes.items || []);
        setProducts(prodRes.items || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Could not load store products.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load the signed-in customer's wishlist.
  useEffect(() => {
    let cancelled = false;

    if (user?.role !== 'customer') {
      setWishlistIds(new Set());

      return () => {
        cancelled = true;
      };
    }

    api
      .get('/customer/wishlist')
      .then((res) => {
        if (cancelled) return;

        const ids = (res.items || [])
          .map((item) => item.productId ?? item.product?.id)
          .filter((id) => id != null)
          .map(String);

        setWishlistIds(new Set(ids));
      })
      .catch(() => {
        // Keep the storefront available if wishlist loading fails.
      });

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  // Add or remove a product from the wishlist.
  const handleWishlistToggle = async (event, product) => {
    event.preventDefault();
    event.stopPropagation();

    if (user?.role !== 'customer') {
      if (!user) {
        navigate('/customer/login', {
          state: { from: location.pathname },
        });
      } else {
        setWishlistError(
          'Please sign in with a customer account to manage your wishlist.'
        );
      }

      return;
    }

    const productId = String(product.id);

    if (wishlistBusyIds.has(productId)) return;

    const alreadySaved = wishlistIds.has(productId);

    setWishlistBusyIds((previous) => {
      const next = new Set(previous);
      next.add(productId);
      return next;
    });

    setWishlistError('');

    try {
      if (alreadySaved) {
        await api.delete(`/customer/wishlist/${product.id}`);

        setWishlistIds((previous) => {
          const next = new Set(previous);
          next.delete(productId);
          return next;
        });
      } else {
        await api.post('/customer/wishlist', {
          productId: product.id,
        });

        setWishlistIds((previous) => {
          const next = new Set(previous);
          next.add(productId);
          return next;
        });
      }
    } catch (err) {
      setWishlistError(
        err.message ||
          'Could not update your wishlist. Please try again.'
      );
    } finally {
      setWishlistBusyIds((previous) => {
        const next = new Set(previous);
        next.delete(productId);
        return next;
      });
    }
  };

  // Add a product to the customer's cart.
  const handleAddToCart = async (event, product) => {
    event.preventDefault();
    event.stopPropagation();

    setCartMessage('');
    setCartError('');

    if (user?.role !== 'customer') {
      if (!user) {
        navigate('/customer/login', {
          state: { from: location.pathname },
        });
      } else {
        setCartError(
          'Please sign in with a customer account to add products to your cart.'
        );
      }

      return;
    }

    const productId = String(product.id);

    if (cartBusyIds.has(productId)) return;

    // Find an active variant with a shop listing and available stock.
    const availableOption = (product.variants || [])
      .flatMap((variant) =>
        (variant.listings || []).map((listing) => ({
          variant,
          listing,
        }))
      )
      .find(
        ({ variant, listing }) =>
          variant.isActive !== false &&
          listing.shopId &&
          Number(listing.stock) > 0
      );

    if (!availableOption) {
      setCartError(
        `${product.name} is currently unavailable or out of stock.`
      );
      return;
    }

    const { variant, listing } = availableOption;

    setCartBusyIds((previous) => {
      const next = new Set(previous);
      next.add(productId);
      return next;
    });

    try {
      await api.post('/customer/cart', {
        shopId: Number(listing.shopId),
        productId: Number(product.id),
        productVariantId: Number(variant.id),
        quantity: 1,
      });

      setCartMessage(`${product.name} added to your cart.`);
      window.dispatchEvent(new Event('customer:cart-updated'));
    } catch (err) {
      const data = err?.response?.data;
      const details = data?.errors;

      setCartError(
        (Array.isArray(details) && details.length
          ? details.map((item) => item.message || item).join(', ')
          : null) ||
          data?.message ||
          err.message ||
          'Could not add this product to your cart. Please try again.'
      );
    } finally {
      setCartBusyIds((previous) => {
        const next = new Set(previous);
        next.delete(productId);
        return next;
      });
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* Alerts and feedback */}
      {error && <Alert variant="error">{error}</Alert>}
      {wishlistError && <Alert variant="error">{wishlistError}</Alert>}
      {cartError && <Alert variant="error">{cartError}</Alert>}

      {cartMessage && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-2xl border border-[#CFDDC9] bg-[#E9EDE4] px-5 py-4 text-sm text-[#34483A] sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="font-medium">{cartMessage}</span>
          <Link
            to="/customer/cart"
            className="inline-flex items-center gap-2 font-bold text-[#526B50] hover:text-[#34483A]"
          >
            View cart <ArrowIcon />
          </Link>
        </div>
      )}

      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#E8E9DD]">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#E8E9DD] via-[#E4E8DA] to-[#F1DDD1]" />

        <div className="absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-[#C7795D]/15 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute -bottom-24 left-1/3 -z-10 h-64 w-64 rounded-full bg-white/60 blur-3xl" />

        <div className="grid items-center gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.2fr_0.8fr] lg:px-14 lg:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C9D3C1] bg-white/60 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#526B50] sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-[#789477]" />
              Your neighborhood marketplace
            </div>

            <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight text-[#34483A] sm:text-5xl lg:text-6xl">
              Good finds.
              <br />
              <span className="font-serif italic font-normal text-[#C7795D]">
                Closer to home.
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-sm leading-7 text-[#62685D] sm:text-base">
              Discover everyday essentials and special finds from
              local stores, all in one convenient place.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#526B50] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#3F563D] hover:shadow-md"
              >
                Explore products <ArrowIcon />
              </Link>

              <Link
                to="/categories"
                className="inline-flex items-center justify-center rounded-xl border border-[#BFC9B7] bg-white/70 px-5 py-3.5 text-sm font-bold text-[#34483A] transition hover:bg-white"
              >
                Browse categories
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-medium text-[#62685D]">
              <span className="inline-flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-[#526B50]">
                  ✓
                </span>
                Local stores
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-[#526B50]">
                  ✓
                </span>
                Convenient shopping
              </span>
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-sm lg:block">
            <div className="absolute -right-3 top-8 h-56 w-56 rounded-full border border-white/70" />
            <div className="absolute -left-5 bottom-2 h-28 w-28 rounded-full bg-[#C7795D]/20" />

            <div className="relative rounded-[2rem] border border-white/70 bg-white/55 p-4 shadow-xl shadow-[#526B50]/10 backdrop-blur-sm">
              <div className="rounded-[1.5rem] bg-[#F7F5EF] p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#77786D]">
                    The little things
                  </span>
                  <span className="rounded-full bg-[#E9EDE4] p-2 text-[#526B50]">
                    <BagIcon />
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="flex min-h-32 flex-col justify-between rounded-2xl bg-[#E5E9DB] p-4">
                    <span className="text-3xl">✿</span>
                    <span className="text-sm font-bold text-[#34483A]">
                      Everyday
                      <br />
                      essentials
                    </span>
                  </div>
                  <div className="mt-6 flex min-h-32 flex-col justify-between rounded-2xl bg-[#F0DDD2] p-4">
                    <span className="text-3xl">♡</span>
                    <span className="text-sm font-bold text-[#774B3B]">
                      Things to
                      <br />
                      love
                    </span>
                  </div>
                  <div className="flex min-h-28 flex-col justify-between rounded-2xl bg-[#EDE4D3] p-4">
                    <span className="text-2xl">✳</span>
                    <span className="text-sm font-bold text-[#62543F]">
                      Thoughtful
                      <br />
                      finds
                    </span>
                  </div>
                  <div className="mt-3 flex min-h-28 flex-col justify-between rounded-2xl bg-[#DDE7D8] p-4">
                    <span className="text-2xl">⌂</span>
                    <span className="text-sm font-bold text-[#34483A]">
                      Shop
                      <br />
                      local
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-8 rounded-2xl border border-[#E8E4DA] bg-[#FDFCF8] px-4 py-3 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E9EDE4] text-[#526B50]">
                  <BagIcon />
                </span>
                <span>
                  <span className="block text-xs font-bold text-[#34483A]">
                    A better way to shop
                  </span>
                  <span className="mt-1 block text-[10px] text-[#77786D]">
                    All your finds, in one place
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category discovery */}
      {categories.length > 0 && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A907F]">
                Find your favorites
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#34483A] sm:text-3xl">
                Shop by category
              </h2>
              <p className="mt-2 text-sm text-[#77786D]">
                A little something for every part of your day.
              </p>
            </div>

            <Link
              to="/categories"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-[#526B50] transition hover:bg-[#E9EDE4]"
            >
              View all <ArrowIcon />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.slice(0, 6).map((category, index) => {
              const backgrounds = [
                'bg-[#E5E9DB]',
                'bg-[#F0DDD2]',
                'bg-[#EDE4D3]',
                'bg-[#E1E8E5]',
                'bg-[#EEE6DF]',
                'bg-[#E7E6D9]',
              ];

              return (
                <Link
                  key={category.id}
                  to={`/products?categoryId=${category.id}`}
                  className="group flex min-h-36 flex-col items-center justify-center rounded-2xl border border-[#E8E4DA] bg-[#FDFCF8] p-4 text-center transition duration-300 hover:-translate-y-1 hover:border-[#C8D4C1] hover:shadow-lg hover:shadow-[#526B50]/5"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${backgrounds[index % backgrounds.length]} text-2xl font-semibold text-[#526B50] transition duration-300 group-hover:rotate-3 group-hover:scale-105`}
                  >
                    {category.name?.charAt(0)?.toUpperCase() || 'C'}
                  </span>

                  <span className="mt-4 line-clamp-2 text-sm font-bold text-[#34483A] transition group-hover:text-[#526B50]">
                    {category.name}
                  </span>

                  <span className="mt-1 text-[11px] text-[#929184]">
                    {category.subcategories?.length || 0} subcategories
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A907F]">
              Selected for you
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#34483A] sm:text-3xl">
              Products worth discovering
            </h2>
            <p className="mt-2 text-sm text-[#77786D]">
              Explore picks from our marketplace.
            </p>
          </div>

          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-[#526B50] transition hover:bg-[#E9EDE4]"
          >
            See all products <ArrowIcon />
          </Link>
        </div>

        {products.length === 0 ? (
          <Card>
            <div className="rounded-2xl bg-[#FDFCF8] px-6 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E9EDE4] text-[#526B50]">
                <BagIcon className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#34483A]">
                Your next favorite is on its way
              </h3>
              <p className="mt-2 text-sm text-[#77786D]">
                No products are available right now. Please check back soon.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product, index) => {
              const primaryVariant = product.variants?.[0];
              const bestListing = primaryVariant?.listings?.[0];

              const price =
                bestListing?.retailPrice ??
                product.basePrice ??
                0;

              const productId = String(product.id);
              const isSaved = wishlistIds.has(productId);
              const wishlistBusy = wishlistBusyIds.has(productId);
              const cartBusy = cartBusyIds.has(productId);

              const imageUrl = product.images?.[0]?.imageUrl;

              const productBackgrounds = [
                'bg-[#F0EEE5]',
                'bg-[#E7EBDD]',
                'bg-[#F0E2D9]',
                'bg-[#E7E8DF]',
              ];

              return (
                <article
                  key={product.id}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E8E4DA] bg-[#FDFCF8] transition duration-300 hover:-translate-y-1 hover:border-[#D4DACA] hover:shadow-lg hover:shadow-[#34483A]/[0.07]"
                >
                  {/* Wider product image */}
                  <div
                    className={`relative aspect-[4/3] w-full overflow-hidden ${productBackgrounds[index % productBackgrounds.length]}`}
                  >
                    <Link
                      to={`/products/${product.id}`}
                      aria-label={`View ${product.name}`}
                      className="absolute inset-0 block h-full w-full"
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          loading="lazy"
                          className="block h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[#8A907F]">
                          <BagIcon className="h-9 w-9" />
                          <span className="text-xs font-medium">
                            Image coming soon
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* Featured label */}
                    <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/60 bg-[#FDFCF8]/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#526B50] shadow-sm backdrop-blur-sm">
                      <StarIcon className="h-3 w-3 text-[#C7795D]" />
                      Featured
                    </div>

                    {/* Rating */}
                    {Number(product.reviewCount) > 0 && (
                      <Link
                        to={`/products/${product.id}`}
                        aria-label={`View ${product.reviewCount} reviews for ${product.name}`}
                        title={`View ${Number(product.reviewCount).toLocaleString('en-IN')} reviews`}
                        className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-lg border border-white/70 bg-[#FDFCF8]/95 px-2.5 py-1.5 text-xs font-bold text-[#526B50] shadow-sm backdrop-blur-sm transition hover:bg-[#E9EDE4] hover:scale-105"
                      >
                        {Number(product.ratingAverage).toFixed(1)}
                        <span className="text-amber-600">★</span>
                        <span className="text-[#77786D]">
                          ({Number(product.reviewCount).toLocaleString('en-IN')})
                        </span>
                      </Link>
                    )}

                    {/* Wishlist */}
                    <button
                      type="button"
                      onClick={(event) => handleWishlistToggle(event, product)}
                      disabled={wishlistBusy}
                      aria-label={
                        isSaved
                          ? `Remove ${product.name} from wishlist`
                          : `Add ${product.name} to wishlist`
                      }
                      aria-pressed={isSaved}
                      title={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
                      className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-[#FDFCF8]/95 text-[#526B50] shadow-sm backdrop-blur-sm transition hover:scale-105 hover:bg-[#F0DDD2] hover:text-[#A55740] disabled:cursor-wait disabled:opacity-60"
                    >
                      <HeartIcon
                        filled={isSaved}
                        className={`h-4 w-4 ${isSaved ? 'text-[#C7795D]' : ''}`}
                      />
                    </button>
                  </div>

                  {/* Product information */}
                  <div className="flex flex-1 flex-col p-5">
                    {product.category?.name?.trim().toLowerCase() !==
                      product.name?.trim().toLowerCase() && (
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A907F]">
                        {product.category?.name || 'Everyday finds'}
                      </p>
                    )}

                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <Link
                        to={`/products/${product.id}`}
                        className="min-w-0 flex-1"
                      >
                        <h3 className="line-clamp-2 text-base font-bold leading-6 text-[#34483A] transition group-hover:text-[#526B50]">
                          {product.name}
                        </h3>
                      </Link>

                      <p className="shrink-0 text-right text-base font-bold tracking-tight text-[#34483A]">
                        ₹{Number(price).toFixed(2)}
                      </p>
                    </div>

                    <p className="mt-2 text-xs text-[#929184]">
                      {product.variants?.length || 1} available option
                      {product.variants?.length === 1 ? '' : 's'}
                    </p>

                    <div className="mt-4 border-t border-[#EEEAE0] pt-3">
                      <Link
                        to={`/products/${product.id}`}
                        className="inline-flex items-center gap-1 text-sm font-bold text-[#526B50] transition hover:text-[#34483A]"
                      >
                        View details <ArrowIcon />
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => handleAddToCart(event, product)}
                      disabled={cartBusy}
                      className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#526B50] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#3F563D] disabled:cursor-wait disabled:opacity-60"
                    >
                      <BagIcon className="h-4 w-4" />
                      {cartBusy ? 'Adding...' : 'Add to cart'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {user?.role === 'customer' && (
          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <Link
              to="/customer/cart"
              className="inline-flex items-center gap-2 rounded-full border border-[#DEDCCF] bg-[#FDFCF8] px-4 py-2.5 text-sm font-semibold text-[#526B50] transition hover:bg-[#E9EDE4]"
            >
              <BagIcon className="h-4 w-4" />
              View my cart
            </Link>

            <Link
              to="/customer/wishlist"
              className="inline-flex items-center gap-2 rounded-full border border-[#DEDCCF] bg-[#FDFCF8] px-4 py-2.5 text-sm font-semibold text-[#526B50] transition hover:bg-[#E9EDE4]"
            >
              <HeartIcon className="h-4 w-4" />
              View my wishlist
            </Link>
          </div>
        )}
      </section>

      {/* Local shopping note */}
      <section className="overflow-hidden rounded-2xl border border-[#E2E1D5] bg-[#EEECE3] px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A907F]">
              Your community, your marketplace
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#34483A] sm:text-2xl">
              Find something lovely today.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#77786D]">
              Browse available products and discover what your local stores have to offer.
            </p>
          </div>

          <Link
            to="/products"
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[#C7795D] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#AE654B] sm:self-center"
          >
            Start exploring <ArrowIcon />
          </Link>
        </div>
      </section>
    </div>
  );
}
