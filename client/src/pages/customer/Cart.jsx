// import { useEffect, useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { api } from '../../services/api.js';
// import { Alert, Button, Card, Spinner } from '../../components/ui.jsx';

// export default function CustomerCart() {
//   const navigate = useNavigate();
//   const [carts, setCarts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [updatingId, setUpdatingId] = useState(null);

//   const loadCart = () => {
//     setLoading(true);
//     setError(null);
//     api
//       .get('/customer/cart')
//       .then((res) => setCarts(res.carts || []))
//       .catch((err) => setError(err.message))
//       .finally(() => setLoading(false));
//   };

//   useEffect(() => {
//     loadCart();
//   }, []);

//   const handleUpdateQty = async (cart, item, delta) => {
//   const currentQty = Number(item.quantity);
//   const nextQty = currentQty + delta;

//   if (nextQty <= 0) {
//     await handleRemoveItem(item.id);
//     return;
//   }

//   if (nextQty > Number(item.currentStock)) {
//     setError(`Only ${item.currentStock} units are available in stock.`);
//     return;
//   }

//   setUpdatingId(item.id);
//   setError(null);

//   try {
//     await api.patch(`/customer/cart/${item.id}`, {
//       quantity: nextQty,
//     });

//     window.dispatchEvent(new Event('customer:cart-updated'));
//     await loadCart();
//   } catch (err) {
//     setError(err.message || 'Unable to update cart quantity.');
//   } finally {
//     setUpdatingId(null);
//   }
// };


//   const handleRemoveItem = async (itemId) => {
//     setUpdatingId(itemId);
//     setError(null);
//     try {
//       await api.delete(`/customer/cart/${itemId}`);
//       window.dispatchEvent(new Event('customer:cart-updated'));
//       loadCart();
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setUpdatingId(null);
//     }
//   };

//   const handleClearCart = async () => {
//     if (!window.confirm('Are you sure you want to clear your shopping cart?')) return;
//     setLoading(true);
//     try {
//       await api.delete('/customer/cart');
//       window.dispatchEvent(new Event('customer:cart-updated'));
//       loadCart();
//     } catch (err) {
//       setError(err.message);
//       setLoading(false);
//     }
//   };

//   if (loading) return <Spinner />;

//   const totalItemsCount = carts.reduce(
//     (total, c) => total + c.items.reduce((sum, it) => sum + it.quantity, 0),
//     0,
//   );

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">Shopping Cart</h1>
//           <p className="mt-1 text-sm text-slate-600">
//             Review your selected items grouped by fulfilling local store.
//           </p>
//         </div>
//         {totalItemsCount > 0 && (
//           <button
//             type="button"
//             onClick={handleClearCart}
//             className="text-xs text-rose-600 hover:text-rose-800 underline font-medium"
//           >
//             Clear All Items
//           </button>
//         )}
//       </div>

//       {error && <Alert variant="error">{error}</Alert>}

//       {carts.length === 0 || totalItemsCount === 0 ? (
//         <Card>
//           <div className="py-12 text-center space-y-3">
//             <div className="text-4xl">🛒</div>
//             <p className="text-base font-semibold text-slate-700">Your shopping cart is empty.</p>
//             <p className="text-xs text-slate-500">Discover great products from verified local sellers.</p>
//             <Link
//               to="/products"
//               className="inline-block mt-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
//             >
//               Start Shopping
//             </Link>
//           </div>
//         </Card>
//       ) : (
//         <div className="space-y-6">
//           {carts.map((cart) => (
//             <Card key={cart.id}>
//               {/* Store Header */}
//               <div className="flex flex-col justify-between border-b pb-3 sm:flex-row sm:items-center">
//                 <div>
//                   <span className="text-xs font-semibold uppercase text-slate-400">Store Fulfillment</span>
//                   <h2 className="text-lg font-bold text-slate-900">{cart.shop?.name}</h2>
//                   <p className="text-xs text-slate-500">{cart.shop?.address}</p>
//                 </div>
//                 <div className="mt-2 text-right sm:mt-0">
//                   <div className="text-xs text-slate-500">Store Subtotal:</div>
//                   <div className="text-xl font-bold text-slate-900">₹{Number(cart.subtotal).toFixed(2)}</div>
//                 </div>
//               </div>

//               {/* Items List */}
//               <div className="divide-y divide-slate-100">
//                 {cart.items.map((it) => (
//                   <div key={it.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
//                     <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center">
//                       {it.product?.images?.[0] ? (
//                         <img src={it.product.images[0].imageUrl} alt="" className="h-full w-full object-cover" />
//                       ) : (
//                         <span className="text-[10px] text-slate-400">No Image</span>
//                       )}
//                     </div>

//                     <div className="flex-1">
//                       <h3 className="font-semibold text-slate-900">{it.product?.name}</h3>
//                       <div className="text-xs text-slate-500">{it.variant?.variantName}</div>
//                       <div className="mt-1 text-xs">
//                         {it.isAvailable ? (
//                           <span className="text-emerald-700 font-medium">In Stock</span>
//                         ) : (
//                           <span className="text-rose-600 font-bold">Insufficient stock ({it.currentStock} left)</span>
//                         )}
//                       </div>
//                     </div>

//                     <div className="flex items-center gap-3">
//                       <div className="flex items-center rounded-md border border-slate-300 bg-white">
//                         <button
//                           type="button"
//                           disabled={updatingId === it.id}
//                           onClick={() => handleUpdateQty(cart, it, -1)}
//                           className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
//                         >
//                           -
//                         </button>
//                         <span className="w-8 text-center text-xs font-bold text-slate-900">{it.quantity}</span>
//                         <button
//                           type="button"
//                           disabled={updatingId === it.id || it.quantity >= it.currentStock}
//                           onClick={() => handleUpdateQty(cart, it, 1)}
//                           className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
//                         >
//                           +
//                         </button>
//                       </div>

//                       <div className="w-24 text-right">
//                         <div className="font-bold text-slate-900">₹{Number(it.lineTotal).toFixed(2)}</div>
//                         <div className="text-[11px] text-slate-500">₹{Number(it.currentPrice).toFixed(2)} each</div>
//                       </div>

//                       <button
//                         type="button"
//                         disabled={updatingId === it.id}
//                         onClick={() => handleRemoveItem(it.id)}
//                         className="rounded p-1 text-slate-400 hover:text-rose-600 text-sm"
//                         title="Remove Item"
//                       >
//                         🗑️
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               {/* Store Checkout Footer */}
//               <div className="mt-4 flex flex-col justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
//                 <div className="text-xs text-slate-500">
//                   {cart.subtotal >= 500 ? (
//                     <span className="text-emerald-700 font-semibold">🎉 Eligible for Free Delivery!</span>
//                   ) : (
//                     <span>Add ₹{(500 - cart.subtotal).toFixed(2)} more for Free Delivery (Standard fee: ₹40.00)</span>
//                   )}
//                 </div>

//                 <Button
//                   onClick={() =>
//                     navigate(
//                       `/checkout?shopId=${cart.shopId}&items=${encodeURIComponent(
//                         JSON.stringify(cart.items.map((i) => ({ productVariantId: i.productVariantId, quantity: i.quantity }))),
//                       )}`,
//                     )
//                   }
//                   className="px-6 py-2.5"
//                 >
//                   Checkout from {cart.shop?.name} &rarr;
//                 </Button>
//               </div>
//             </Card>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }


import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Alert, Button, Card, Spinner } from '../../components/ui.jsx';

const colors = {
  green: '#526B50',
  greenDark: '#34483A',
  greenLight: '#E9EDE4',
  ivory: '#F7F5EF',
  card: '#FDFCF8',
  terracotta: '#C7795D',
  muted: '#77786D',
  border: '#E8E4DA',
};

function BagIcon({ className = 'h-6 w-6' }) {
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

function TrashIcon({ className = 'h-4 w-4' }) {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}

export default function CustomerCart() {
  const navigate = useNavigate();

  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadCart = () => {
    setLoading(true);
    setError(null);

    api
      .get('/customer/cart')
      .then((res) => setCarts(res.carts || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleUpdateQty = async (cart, item, delta) => {
    const currentQty = Number(item.quantity);
    const nextQty = currentQty + delta;

    if (nextQty <= 0) {
      await handleRemoveItem(item.id);
      return;
    }

    if (nextQty > Number(item.currentStock)) {
      setError(`Only ${item.currentStock} units are available in stock.`);
      return;
    }

    setUpdatingId(item.id);
    setError(null);

    try {
      await api.patch(`/customer/cart/${item.id}`, {
        quantity: nextQty,
      });

      window.dispatchEvent(new Event('customer:cart-updated'));
      await loadCart();
    } catch (err) {
      setError(err.message || 'Unable to update cart quantity.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setUpdatingId(itemId);
    setError(null);

    try {
      await api.delete(`/customer/cart/${itemId}`);
      window.dispatchEvent(new Event('customer:cart-updated'));
      loadCart();
    } catch (err) {
      setError(err.message || 'Unable to remove item from cart.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('Are you sure you want to clear your shopping cart?')) {
      return;
    }

    setLoading(true);

    try {
      await api.delete('/customer/cart');
      window.dispatchEvent(new Event('customer:cart-updated'));
      loadCart();
    } catch (err) {
      setError(err.message || 'Unable to clear your cart.');
      setLoading(false);
    }
  };

  if (loading) return <Spinner />;

  const totalItemsCount = carts.reduce(
    (total, cart) =>
      total +
      cart.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    0
  );

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A907F]">
            Your selected finds
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#34483A] sm:text-4xl">
            Shopping Cart
          </h1>

          <p className="mt-2 text-sm text-[#77786D]">
            Review your selected items grouped by fulfilling local store.
          </p>

          {totalItemsCount > 0 && (
            <span className="mt-3 inline-flex items-center rounded-full bg-[#E9EDE4] px-3 py-1.5 text-xs font-bold text-[#526B50]">
              {totalItemsCount} item{totalItemsCount === 1 ? '' : 's'} in your cart
            </span>
          )}
        </div>

        {totalItemsCount > 0 && (
          <button
            type="button"
            onClick={handleClearCart}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-[#E8CFC5] bg-[#FDFCF8] px-4 py-2.5 text-xs font-bold text-[#A55740] transition hover:bg-[#F8EAE4]"
          >
            <TrashIcon />
            Clear All Items
          </button>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Empty cart */}
      {carts.length === 0 || totalItemsCount === 0 ? (
        <Card>
          <div className="rounded-2xl bg-[#FDFCF8] px-6 py-14 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E9EDE4] text-[#526B50]">
              <BagIcon className="h-9 w-9" />
            </div>

            <h2 className="mt-6 text-xl font-bold text-[#34483A]">
              Your shopping cart is empty.
            </h2>

            <p className="mt-2 text-sm text-[#77786D]">
              Discover great products from verified local sellers.
            </p>

            <Link
              to="/products"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#526B50] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3F563D]"
            >
              Start Shopping
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {carts.map((cart) => (
            <Card key={cart.id}>
              <div className="overflow-hidden rounded-2xl border border-[#E8E4DA] bg-[#FDFCF8]">
                {/* Store header */}
                <div className="flex flex-col justify-between gap-3 border-b border-[#E8E4DA] bg-[#E9EDE4]/60 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A907F]">
                      Store Fulfillment
                    </span>

                    <h2 className="mt-1 text-lg font-bold text-[#34483A]">
                      {cart.shop?.name}
                    </h2>

                    <p className="mt-1 text-xs text-[#77786D]">
                      {cart.shop?.address}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-xs font-medium text-[#77786D]">
                      Store Subtotal
                    </div>

                    <div className="mt-1 text-2xl font-bold text-[#34483A]">
                      ₹{Number(cart.subtotal).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-[#EEEAE0] px-5 sm:px-6">
                  {cart.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center"
                    >
                      {/* Product image */}
                      <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E8E4DA] bg-[#F0EEE5]">
                        {it.product?.images?.[0]?.imageUrl ? (
                          <img
                            src={it.product.images[0].imageUrl}
                            alt={it.product?.name || 'Product'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <BagIcon className="h-8 w-8 text-[#8A907F]" />
                        )}
                      </div>

                      {/* Product information */}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-[#34483A]">
                          {it.product?.name}
                        </h3>

                        <p className="mt-1 text-xs text-[#77786D]">
                          {it.variant?.variantName}
                        </p>

                        <div className="mt-2">
                          {it.isAvailable ? (
                            <span className="inline-flex items-center rounded-full bg-[#E9EDE4] px-2.5 py-1 text-[10px] font-bold text-[#526B50]">
                              In Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-[#F8EAE4] px-2.5 py-1 text-[10px] font-bold text-[#A55740]">
                              Insufficient stock ({it.currentStock} left)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity and price */}
                      <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
                        <div className="flex items-center overflow-hidden rounded-xl border border-[#D9DFD2] bg-white">
                          <button
                            type="button"
                            disabled={updatingId === it.id}
                            onClick={() => handleUpdateQty(cart, it, -1)}
                            className="px-3 py-2 text-sm font-bold text-[#526B50] transition hover:bg-[#E9EDE4] disabled:opacity-50"
                          >
                            −
                          </button>

                          <span className="w-9 text-center text-sm font-bold text-[#34483A]">
                            {it.quantity}
                          </span>

                          <button
                            type="button"
                            disabled={
                              updatingId === it.id ||
                              Number(it.quantity) >= Number(it.currentStock)
                            }
                            onClick={() => handleUpdateQty(cart, it, 1)}
                            className="px-3 py-2 text-sm font-bold text-[#526B50] transition hover:bg-[#E9EDE4] disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>

                        <div className="min-w-24 text-right">
                          <div className="font-bold text-[#34483A]">
                            ₹{Number(it.lineTotal).toFixed(2)}
                          </div>

                          <div className="mt-1 text-[11px] text-[#929184]">
                            ₹{Number(it.currentPrice).toFixed(2)} each
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={updatingId === it.id}
                          onClick={() => handleRemoveItem(it.id)}
                          className="rounded-xl p-2 text-[#A69D91] transition hover:bg-[#F8EAE4] hover:text-[#A55740] disabled:opacity-50"
                          title="Remove Item"
                          aria-label={`Remove ${it.product?.name || 'item'}`}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Store checkout footer */}
                <div className="flex flex-col justify-between gap-4 border-t border-[#E8E4DA] bg-[#F7F5EF] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                  <div className="text-xs text-[#77786D]">
                    {Number(cart.subtotal) >= 500 ? (
                      <span className="font-bold text-[#526B50]">
                        🎉 Eligible for Free Delivery!
                      </span>
                    ) : (
                      <span>
                        Add ₹{(500 - Number(cart.subtotal)).toFixed(2)} more
                        for Free Delivery (Standard fee: ₹40.00)
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() =>
                      navigate(
                        `/checkout?shopId=${cart.shopId}&items=${encodeURIComponent(
                          JSON.stringify(
                            cart.items.map((item) => ({
                              productVariantId: item.productVariantId,
                              quantity: item.quantity,
                            }))
                          )
                        )}`
                      )
                    }
                    className="rounded-xl bg-[#526B50] px-6 py-3 font-bold text-white transition hover:bg-[#3F563D]"
                  >
                    Checkout from {cart.shop?.name} →
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
