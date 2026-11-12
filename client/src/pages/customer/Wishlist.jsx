// import { useEffect, useState } from 'react';
// import { Link } from 'react-router-dom';
// import { api } from '../../services/api.js';
// import { Alert, Card, Spinner } from '../../components/ui.jsx';

// export default function CustomerWishlist() {
//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [removingId, setRemovingId] = useState(null);
//   const [addingId, setAddingId] = useState(null);
//   const [notice, setNotice] = useState('');

//   const loadWishlist = () => {
//     setLoading(true);
//     api
//       .get('/customer/wishlist')
//       .then((res) => setItems(res.items || []))
//       .catch((err) => setError(err.message))
//       .finally(() => setLoading(false));
//   };

//   useEffect(() => {
//     loadWishlist();
//   }, []);

//   const handleRemove = async (productId) => {
//     setRemovingId(productId);
//     setError(null);
//     try {
//       await api.delete(`/customer/wishlist/${productId}`);
//       setItems(items.filter((it) => it.productId !== productId));
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setRemovingId(null);
//     }
//   };

//   const handleAddToCart = async (product) => {
//     const option = (product.variants || []).flatMap((variant) => (variant.listings || []).filter((listing) => listing.stock > 0).map((listing) => ({ variant, listing }))).sort((a, b) => Number(a.listing.retailPrice) - Number(b.listing.retailPrice))[0];
//     if (!option) { setError('This product is currently unavailable from an active store.'); return; }
//     setAddingId(product.id); setError(''); setNotice('');
//     try { await api.post('/customer/cart', { shopId: option.listing.shopId, productId: product.id, productVariantId: option.variant.id, quantity: 1 }); window.dispatchEvent(new Event('customer:cart-updated')); setNotice(`${product.name} was added to your cart.`); }
//     catch (err) { setError(err.message); }
//     finally { setAddingId(null); }
//   };

//   if (loading) return <Spinner />;

//   return (
//     <div className="space-y-6">
//       <div>
//         <h1 className="text-2xl font-bold text-slate-900">My Saved Wishlist</h1>
//         <p className="mt-1 text-sm text-slate-600">Items you saved for later purchases.</p>
//       </div>

//       {error && <Alert variant="error">{error}</Alert>}
//       {notice && <Alert kind="success">{notice} <Link to="/customer/cart" className="font-semibold underline">View cart</Link></Alert>}

//       {items.length === 0 ? (
//         <Card>
//           <div className="py-12 text-center space-y-3">
//             <div className="text-4xl">❤️</div>
//             <p className="text-base font-semibold text-slate-700">Your wishlist is currently empty.</p>
//             <p className="text-xs text-slate-500">Explore products and click &quot;Add to Wishlist&quot; to save them here.</p>
//             <Link
//               to="/customer/products"
//               className="inline-block mt-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
//             >
//               Browse Products
//             </Link>
//           </div>
//         </Card>
//       ) : (
//         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
//           {items.map((it) => {
//             const p = it.product;
//             if (!p) return null;
//             const img = p.images?.[0]?.imageUrl;
//             const bestChoice = (p.variants || []).flatMap((variant) => (variant.listings || []).map((listing) => ({ variant, listing }))).filter((choice) => choice.listing.stock > 0).sort((a, b) => Number(a.listing.retailPrice) - Number(b.listing.retailPrice))[0];

//             return (
//               <div
//                 key={it.id}
//                 className="flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
//               >
//                 <div className="aspect-square w-full overflow-hidden bg-slate-100 flex items-center justify-center">
//                   {img ? (
//                     <img src={img} alt={p.name} className="h-full w-full object-cover" />
//                   ) : (
//                     <span className="text-xs text-slate-400">No Image</span>
//                   )}
//                 </div>

//                 <div className="p-4 flex flex-col justify-between flex-1">
//                   <div>
//                     <h3 className="font-bold text-slate-900 line-clamp-1">{p.name}</h3>
//                     <div className="mt-1 text-sm font-extrabold text-slate-900">{bestChoice ? `₹${Number(bestChoice.listing.retailPrice).toFixed(2)}` : 'Currently unavailable'}</div>
//                   </div>

//                   <div className="mt-4 flex gap-2 border-t pt-3">
//                     <Link
//                       to={`/customer/products/${p.id}`}
//                       className="flex-1 rounded-md bg-indigo-50 py-1.5 text-center text-xs font-bold text-indigo-700 hover:bg-indigo-100"
//                     >
//                       View Options
//                     </Link>
//                     <button
//                       type="button"
//                       disabled={removingId === p.id}
//                       onClick={() => handleRemove(p.id)}
//                       className="rounded-md border border-slate-200 px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
//                     >
//                       Remove
//                     </button>
//                   </div>
//                   <button type="button" disabled={addingId === p.id || !bestChoice} onClick={() => handleAddToCart(p)} className="mt-2 w-full rounded-md bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">{addingId === p.id ? 'Adding…' : bestChoice ? `Add ${bestChoice.variant.variantName} to cart · ₹${Number(bestChoice.listing.retailPrice).toFixed(2)}` : 'Currently unavailable'}</button>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }


import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Alert, Card, Spinner } from '../../components/ui.jsx';

export default function CustomerWishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [notice, setNotice] = useState('');

  const loadWishlist = () => {
    setLoading(true);
    api
      .get('/customer/wishlist')
      .then((res) => setItems(res.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const handleRemove = async (productId) => {
    setRemovingId(productId);
    setError(null);

    try {
      await api.delete(`/customer/wishlist/${productId}`);
      setItems((currentItems) =>
        currentItems.filter((it) => it.productId !== productId)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (product) => {
    const option = (product.variants || [])
      .flatMap((variant) =>
        (variant.listings || [])
          .filter((listing) => listing.stock > 0)
          .map((listing) => ({ variant, listing }))
      )
      .sort(
        (a, b) =>
          Number(a.listing.retailPrice) - Number(b.listing.retailPrice)
      )[0];

    if (!option) {
      setError('This product is currently unavailable from an active store.');
      return;
    }

    setAddingId(product.id);
    setError('');
    setNotice('');

    try {
      await api.post('/customer/cart', {
        shopId: option.listing.shopId,
        sellerListingId: Number(option.listing.id),
        productId: product.id,
        productVariantId: option.variant.id,
        quantity: 1,
      });

      window.dispatchEvent(new Event('customer:cart-updated'));
      setNotice(`${product.name} was added to your cart.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingId(null);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          My Saved Wishlist
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Items you saved for later purchases.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {notice && (
        <Alert kind="success">
          {notice}{' '}
          <Link
            to="/customer/cart"
            className="font-semibold underline"
          >
            View cart
          </Link>
        </Alert>
      )}

      {/* Empty Wishlist */}
      {items.length === 0 ? (
        <Card>
          <div className="space-y-3 py-12 text-center">
            <div className="text-4xl">❤️</div>

            <p className="text-base font-semibold text-slate-800">
              Your wishlist is currently empty.
            </p>

            <p className="text-xs text-slate-500">
              Explore products and click "Add to Wishlist" to save them here.
            </p>

            <Link
              to="/customer/products"
              className="mt-2 inline-block rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Browse Products
            </Link>
          </div>
        </Card>
      ) : (
        /* Wishlist Products */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((it) => {
            const p = it.product;

            if (!p) return null;

            const img = p.images?.[0]?.imageUrl;

            const bestChoice = (p.variants || [])
              .flatMap((variant) =>
                (variant.listings || []).map((listing) => ({
                  variant,
                  listing,
                }))
              )
              .filter((choice) => choice.listing.stock > 0)
              .sort(
                (a, b) =>
                  Number(a.listing.retailPrice) -
                  Number(b.listing.retailPrice)
              )[0];

            return (
              <div
                key={it.id}
                className="flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Product Image */}
                <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-slate-50">
                  {img ? (
                    <img
                      src={img}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">
                      No Image
                    </span>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h3 className="line-clamp-1 font-bold text-slate-900">
                      {p.name}
                    </h3>

                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {bestChoice
                        ? `₹${Number(
                            bestChoice.listing.retailPrice
                          ).toFixed(2)}`
                        : 'Currently unavailable'}
                    </div>
                  </div>

                  {/* Product Actions */}
                  <div className="mt-4 flex gap-2 border-t border-slate-200 pt-3">
                    <Link
                      to={`/customer/products/${p.id}`}
                      className="flex-1 rounded-lg bg-slate-100 py-1.5 text-center text-xs font-bold text-slate-800 transition hover:bg-slate-200"
                    >
                      View Options
                    </Link>

                    <button
                      type="button"
                      disabled={removingId === p.id}
                      onClick={() => handleRemove(p.id)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {removingId === p.id ? 'Removing…' : 'Remove'}
                    </button>
                  </div>

                  {/* Add to Cart */}
                  <button
                    type="button"
                    disabled={addingId === p.id || !bestChoice}
                    onClick={() => handleAddToCart(p)}
                    className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {addingId === p.id
                      ? 'Adding…'
                      : bestChoice
                        ? `Add ${bestChoice.variant.variantName} to cart · ₹${Number(
                            bestChoice.listing.retailPrice
                          ).toFixed(2)}`
                        : 'Currently unavailable'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
