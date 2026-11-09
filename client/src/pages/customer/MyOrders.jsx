


// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import { Link } from 'react-router-dom';
// import { api } from '../../services/api.js';
// import { Alert, Button, Card, Spinner } from '../../components/ui.jsx';

// const statusBadgeClasses = {
//   pending_payment: 'bg-[#F5EBDD] text-[#9A713B]',
//   confirmed: 'bg-[#E5EBE0] text-[#526B50]',
//   processing: 'bg-[#E8EAE0] text-[#526B50]',
//   dispatched: 'bg-[#EDE7DA] text-[#806A48]',
//   out_for_delivery: 'bg-[#F0DDD2] text-[#A55740]',
//   delivered: 'bg-[#E9EDE4] text-[#526B50]',
//   cancelled: 'bg-[#F8EAE4] text-[#A55740]',
//   returned: 'bg-[#F0DDD2] text-[#A55740]',
// };

// const returnStatusLabels = {
//   requested: 'Return Requested',
//   approved: 'Return Approved',
//   rejected: 'Return Rejected',
//   received: 'Return Received',
//   item_received: 'Return Received',
//   refund_processing: 'Refund Processing',
//   refunded: 'Refunded',
// };

// const formatDate = (value) =>
//   value
//     ? new Date(value).toLocaleDateString('en-IN', {
//         day: 'numeric',
//         month: 'short',
//         year: 'numeric',
//       })
//     : '—';

// const formatReturnDate = (value) =>
//   value ? new Date(value).toLocaleString('en-IN') : null;

// const label = (value = '') =>
//   String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// const getOrderItems = (order) => order.items || order.OrderItems || [];

// const getProductId = (item) =>
//   item.productId ??
//   item.product_id ??
//   item.product?.id ??
//   item.product?.productId ??
//   null;

// const getProductName = (item) =>
//   item.productName ||
//   item.product_name ||
//   item.product?.name ||
//   'Product';

// const getProductImage = (item) =>
//   item.product?.images?.[0]?.imageUrl ||
//   item.product?.imageUrl ||
//   item.product?.image ||
//   item.imageUrl ||
//   null;

// const getReview = (item) =>
//   item.review || item.productReview || null;

// const isDelivered = (order) =>
//   order.status === 'delivered' ||
//   order.deliveryStatus === 'delivered' ||
//   order.delivery_status === 'delivered';

// const hasReviewed = (item) =>
//   item.reviewed === true || getReview(item) != null;

// const getOrderNumber = (order) =>
//   order.orderNumber || order.order_number || order.id;

// const getTotal = (order) =>
//   Number(order.totalAmount ?? order.total_amount ?? 0);

// const getDisplayStatus = (order) =>
//   isDelivered(order) ? 'delivered' : order.status || 'unknown';

// const getTabForOrder = (order) => {
//   const status = order.status;
//   const hasReturn = order.returns?.length > 0;

//   if (status === 'cancelled') return 'cancelled';
//   if (status === 'returned' || hasReturn) return 'returned';
//   if (isDelivered(order)) return 'delivered';

//   if (['dispatched', 'out_for_delivery'].includes(status)) {
//     return 'to_receive';
//   }

//   if (['pending_payment', 'confirmed', 'processing'].includes(status)) {
//     return 'to_ship';
//   }

//   return 'all';
// };

// const tabs = [
//   { id: 'all', label: 'All' },
//   { id: 'to_ship', label: 'To Ship' },
//   { id: 'to_receive', label: 'To Receive' },
//   { id: 'delivered', label: 'Delivered' },
//   { id: 'cancelled', label: 'Cancelled' },
//   { id: 'returned', label: 'Returned' },
// ];

// export default function CustomerOrders() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [activeTab, setActiveTab] = useState('all');
//   const [search, setSearch] = useState('');

//   const [cancellingOrder, setCancellingOrder] = useState(null);
//   const [cancelReason, setCancelReason] = useState('');
//   const [returningOrder, setReturningOrder] = useState(null);
//   const [returnReason, setReturnReason] = useState('');
//   const [returnItemsState, setReturnItemsState] = useState({});
//   const [actionLoading, setActionLoading] = useState(false);

//   const [reviewingItem, setReviewingItem] = useState(null);
//   const [reviewRating, setReviewRating] = useState(5);
//   const [reviewTitle, setReviewTitle] = useState('');
//   const [reviewBody, setReviewBody] = useState('');
//   const [reviewLoading, setReviewLoading] = useState(false);
//   const [reviewError, setReviewError] = useState('');
//   const [reviewSuccess, setReviewSuccess] = useState('');

//   const fetchOrders = useCallback(async () => {
//     setLoading(true);
//     setError(null);

//     try {
//       const res = await api.get('/customer/orders');
//       setOrders(res.items || res.orders || []);
//     } catch (err) {
//       setError(err.message || 'Failed to load orders');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchOrders();
//   }, [fetchOrders]);

//   const filteredOrders = useMemo(() => {
//     const query = search.trim().toLowerCase();

//     return orders.filter((order) => {
//       const matchesTab =
//         activeTab === 'all' || getTabForOrder(order) === activeTab;

//       const searchable = [
//         getOrderNumber(order),
//         order.shop?.name,
//         ...getOrderItems(order).map(getProductName),
//       ]
//         .filter(Boolean)
//         .join(' ')
//         .toLowerCase();

//       return matchesTab && (!query || searchable.includes(query));
//     });
//   }, [orders, activeTab, search]);

//   const tabCounts = useMemo(() => {
//     const counts = { all: orders.length };

//     tabs.forEach(({ id }) => {
//       if (id !== 'all') {
//         counts[id] = orders.filter(
//           (order) => getTabForOrder(order) === id
//         ).length;
//       }
//     });

//     return counts;
//   }, [orders]);

//   const handleOpenReview = (order, item, editing = false) => {
//     if (!getProductId(item)) {
//       setError('Product information is missing for this order item.');
//       return;
//     }

//     const review = getReview(item);

//     setError(null);
//     setReviewSuccess('');
//     setReviewingItem({ order, item });
//     setReviewRating(editing ? Number(review?.rating || 5) : 5);
//     setReviewTitle(editing ? review?.title || '' : '');
//     setReviewBody(editing ? review?.body || '' : '');
//     setReviewError('');
//   };

//   const closeReviewModal = () => {
//     if (reviewLoading) return;

//     setReviewingItem(null);
//     setReviewRating(5);
//     setReviewTitle('');
//     setReviewBody('');
//     setReviewError('');
//   };

//   const handleSubmitReview = async (e) => {
//     e.preventDefault();
//     if (!reviewingItem || reviewLoading) return;

//     const { order, item } = reviewingItem;
//     const productId = getProductId(item);
//     const review = getReview(item);

//     if (!productId || !order.id) {
//       setReviewError('Order or product information is missing.');
//       return;
//     }

//     if (!isDelivered(order)) {
//       setReviewError('You can review a product only after delivery.');
//       return;
//     }

//     if (
//       !Number.isInteger(Number(reviewRating)) ||
//       Number(reviewRating) < 1 ||
//       Number(reviewRating) > 5
//     ) {
//       setReviewError('Please select a rating between 1 and 5.');
//       return;
//     }

//     if (!reviewBody.trim()) {
//       setReviewError('Please write your review.');
//       return;
//     }

//     if (reviewBody.trim().length > 1500) {
//       setReviewError('Your review must be 1500 characters or fewer.');
//       return;
//     }

//     setReviewLoading(true);
//     setReviewError('');

//     try {
//       const payload = {
//         rating: Number(reviewRating),
//         title: reviewTitle.trim() || null,
//         body: reviewBody.trim(),
//       };

//       const isEditing = Boolean(review?.id);

//       if (isEditing) {
//         await api.put(`/customer/reviews/${review.id}`, payload);
//       } else {
//         await api.post(`/customer/products/${productId}/reviews`, {
//           ...payload,
//           orderId: order.id,
//         });
//       }

//       setReviewingItem(null);
//       setReviewRating(5);
//       setReviewTitle('');
//       setReviewBody('');

//       await fetchOrders();

//       setReviewSuccess(
//         isEditing
//           ? 'Your review has been updated successfully.'
//           : 'Your review has been submitted successfully.'
//       );
//     } catch (err) {
//       setReviewError(err.message || 'Failed to submit review.');
//     } finally {
//       setReviewLoading(false);
//     }
//   };

//   const handleCancelOrder = async (e) => {
//     e.preventDefault();
//     if (!cancellingOrder) return;

//     setActionLoading(true);

//     try {
//       await api.post(`/customer/orders/${cancellingOrder.id}/cancel`, {
//         reason: cancelReason || 'Customer requested cancellation',
//       });

//       setCancellingOrder(null);
//       setCancelReason('');
//       await fetchOrders();
//     } catch (err) {
//       setError(err.message || 'Failed to cancel order');
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const handleOpenReturnModal = (order) => {
//     setReturningOrder(order);

//     const selections = {};

//     getOrderItems(order).forEach((item) => {
//       selections[item.id] = {
//         selected: true,
//         quantity: item.quantity,
//       };
//     });

//     setReturnItemsState(selections);
//     setReturnReason('');
//   };

//   const handleReturnOrder = async (e) => {
//     e.preventDefault();
//     if (!returningOrder) return;

//     const itemsToReturn = Object.entries(returnItemsState)
//       .filter(([, value]) => value.selected && Number(value.quantity) > 0)
//       .map(([itemId, value]) => ({
//         orderItemId: Number(itemId),
//         quantity: Number(value.quantity),
//       }));

//     if (!itemsToReturn.length) {
//       setError('Please select at least one item to return.');
//       return;
//     }

//     setActionLoading(true);

//     try {
//       await api.post(`/customer/orders/${returningOrder.id}/return`, {
//         reason: returnReason || 'Return requested by customer',
//         items: itemsToReturn,
//       });

//       setReturningOrder(null);
//       setReturnReason('');
//       await fetchOrders();
//     } catch (err) {
//       setError(err.message || 'Failed to submit return request');
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   if (loading) return <Spinner />;

//   const inputClass =
//     'w-full rounded-xl border border-[#E8E4DA] bg-[#F7F5EF] px-3 py-2.5 text-sm text-[#34483A] outline-none transition placeholder:text-[#A19E91] focus:border-[#8A9A80] focus:bg-white focus:ring-2 focus:ring-[#E9EDE4]';

//   const modalClass =
//     'max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#E8E4DA] bg-[#FDFCF8] p-6 shadow-2xl';

//   return (
//     <div className="min-h-screen space-y-8 bg-[#F7F5EF] px-1 py-4 sm:px-3">
//       {/* Header */}
//       <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
//         <div>
//           <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A907F]">
//             Your shopping journey
//           </p>

//           <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#34483A] sm:text-4xl">
//             My Orders
//           </h1>

//           <p className="mt-2 text-sm text-[#77786D]">
//             Track your orders, manage returns and share your reviews.
//           </p>
//         </div>

//         <Link
//           to="/products"
//           className="inline-flex items-center justify-center self-start rounded-xl border border-[#D9DFD2] bg-[#FDFCF8] px-4 py-3 text-sm font-bold text-[#526B50] transition hover:bg-[#E9EDE4]"
//         >
//           ← Continue Shopping
//         </Link>
//       </div>

//       {error && <Alert variant="error">{error}</Alert>}
//       {reviewSuccess && <Alert variant="success">{reviewSuccess}</Alert>}

//       {/* Search and filters */}
//       <Card className="space-y-4 border border-[#E8E4DA] bg-[#FDFCF8] p-4 shadow-sm">
//         <div className="relative">
//           <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#929184]">
//             🔍
//           </span>

//           <input
//             type="search"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Search by order number or product name"
//             className={`${inputClass} pl-10`}
//           />
//         </div>

//         <div className="flex gap-2 overflow-x-auto pb-1">
//           {tabs.map((tab) => (
//             <button
//               key={tab.id}
//               type="button"
//               onClick={() => setActiveTab(tab.id)}
//               className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
//                 activeTab === tab.id
//                   ? 'bg-[#526B50] text-white shadow-sm'
//                   : 'border border-[#E8E4DA] bg-[#FDFCF8] text-[#77786D] hover:border-[#BFC9B7] hover:bg-[#E9EDE4] hover:text-[#34483A]'
//               }`}
//             >
//               {tab.label}
//               <span className="ml-1.5 opacity-75">
//                 {tabCounts[tab.id] ?? 0}
//               </span>
//             </button>
//           ))}
//         </div>
//       </Card>

//       {/* Order list */}
//       {filteredOrders.length === 0 ? (
//         <Card className="border border-[#E8E4DA] bg-[#FDFCF8] p-10 text-center shadow-sm sm:p-14">
//           <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E9EDE4] text-[#526B50]">
//             <span className="text-3xl">📦</span>
//           </div>

//           <h2 className="text-lg font-bold text-[#34483A]">
//             {orders.length === 0
//               ? 'No orders placed yet'
//               : 'No matching orders found'}
//           </h2>

//           <p className="mx-auto mt-2 max-w-sm text-sm text-[#77786D]">
//             {orders.length === 0
//               ? 'Your orders will appear here after you place your first order.'
//               : 'Try another search or select a different order category.'}
//           </p>

//           <Link
//             to="/products"
//             className="mt-6 inline-flex rounded-xl bg-[#526B50] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3F563D]"
//           >
//             Explore Products
//           </Link>
//         </Card>
//       ) : (
//         <div className="space-y-5">
//           {filteredOrders.map((order) => {
//             const items = getOrderItems(order);
//             const displayStatus = getDisplayStatus(order);
//             const delivered = isDelivered(order);

//             const canCancel = [
//               'pending_payment',
//               'confirmed',
//               'processing',
//             ].includes(order.status);

//             const returnRequest = order.returns?.[0] || null;
//             const canReturn =
//               delivered &&
//               !returnRequest &&
//               order.status !== 'cancelled';

//             return (
//               <Card
//                 key={order.id}
//                 className="overflow-hidden border border-[#E8E4DA] bg-[#FDFCF8] p-0 shadow-sm transition hover:shadow-md"
//               >
//                 {/* Card header */}
//                 <div className="flex flex-col justify-between gap-3 border-b border-[#E8E4DA] bg-[#E9EDE4]/60 p-4 sm:flex-row sm:items-center sm:p-5">
//                   <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:gap-7">
//                     <div>
//                       <p className="text-[10px] font-bold uppercase tracking-wider text-[#929184]">
//                         Order ID
//                       </p>
//                       <Link
//                         to={`/customer/orders/${order.id}`}
//                         className="mt-1 inline-block font-mono text-sm font-bold text-[#34483A] hover:text-[#526B50]"
//                       >
//                         #{getOrderNumber(order)}
//                       </Link>
//                     </div>

//                     <div>
//                       <p className="text-[10px] font-bold uppercase tracking-wider text-[#929184]">
//                         Order Date
//                       </p>
//                       <p className="mt-1 text-sm font-medium text-[#62685D]">
//                         {formatDate(order.createdAt || order.created_at)}
//                       </p>
//                     </div>

//                     <div>
//                       <p className="text-[10px] font-bold uppercase tracking-wider text-[#929184]">
//                         Store
//                       </p>
//                       <p className="mt-1 text-sm font-medium text-[#62685D]">
//                         {order.shop?.name || 'Local Store'}
//                       </p>
//                     </div>

//                     <div>
//                       <p className="text-[10px] font-bold uppercase tracking-wider text-[#929184]">
//                         Payment
//                       </p>
//                       <p className="mt-1 text-sm font-medium text-[#62685D]">
//                         {label(order.paymentMethod || '—')}
//                       </p>
//                       <p
//                         className={`text-xs font-semibold ${
//                           order.paymentStatus === 'paid'
//                             ? 'text-[#526B50]'
//                             : 'text-[#A57A42]'
//                         }`}
//                       >
//                         {label(order.paymentStatus || '—')}
//                       </p>
//                     </div>
//                   </div>

//                   <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
//                     <span
//                       className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
//                         statusBadgeClasses[displayStatus] ||
//                         'bg-[#EEECE3] text-[#77786D]'
//                       }`}
//                     >
//                       {label(displayStatus)}
//                     </span>

//                     <p className="text-xl font-bold text-[#34483A]">
//                       ₹{getTotal(order).toFixed(2)}
//                     </p>
//                   </div>
//                 </div>

//                 {/* Product items */}
//                 <div className="divide-y divide-[#EEEAE0] px-4">
//                   {items.map((item) => {
//                     const review = getReview(item);
//                     const alreadyReviewed = hasReviewed(item);
//                     const image = getProductImage(item);

//                     return (
//                       <div
//                         key={item.id}
//                         className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
//                       >
//                         <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E8E4DA] bg-[#F0EEE5]">
//                           {image ? (
//                             <img
//                               src={image}
//                               alt={getProductName(item)}
//                               className="h-full w-full object-cover"
//                             />
//                           ) : (
//                             <div className="flex h-full items-center justify-center text-3xl text-[#8A907F]">
//                               📦
//                             </div>
//                           )}
//                         </div>

//                         <div className="min-w-0 flex-1">
//                           <h3 className="font-bold text-[#34483A]">
//                             {getProductName(item)}
//                           </h3>

//                           <p className="mt-1 text-xs text-[#77786D]">
//                             {item.variantName || item.sku
//                               ? `${item.variantName || item.sku} · `
//                               : ''}
//                             Qty: {item.quantity}
//                           </p>

//                           <p className="mt-1 text-xs text-[#77786D]">
//                             ₹{Number(item.unitPrice ?? item.unit_price ?? 0).toFixed(2)} × {item.quantity}
//                           </p>

//                           {delivered && (
//                             <div className="mt-2">
//                               {alreadyReviewed ? (
//                                 <div className="text-xs">
//                                   <p className="font-bold text-[#526B50]">
//                                     ✓ Review Submitted
//                                   </p>

//                                   {review && (
//                                     <>
//                                       <p className="mt-1 text-[#C7795D]">
//                                         {'★'.repeat(Math.min(5, Math.max(0, Number(review.rating || 0))))}
//                                         {'☆'.repeat(5 - Math.min(5, Math.max(0, Number(review.rating || 0))))}
//                                       </p>

//                                       {review.title && (
//                                         <p className="font-semibold text-[#34483A]">
//                                           {review.title}
//                                         </p>
//                                       )}

//                                       {review.body && (
//                                         <p className="mt-1 text-[#77786D]">
//                                           {review.body}
//                                         </p>
//                                       )}
//                                     </>
//                                   )}

//                                   {review?.id && (
//                                     <button
//                                       type="button"
//                                       onClick={() => handleOpenReview(order, item, true)}
//                                       className="mt-1 font-bold text-[#526B50] hover:underline"
//                                     >
//                                       Edit Review
//                                     </button>
//                                   )}
//                                 </div>
//                               ) : (
//                                 <button
//                                   type="button"
//                                   disabled={!getProductId(item)}
//                                   onClick={() => handleOpenReview(order, item)}
//                                   className="text-xs font-bold text-[#526B50] hover:underline disabled:opacity-50"
//                                 >
//                                   ★ Write a Review
//                                 </button>
//                               )}
//                             </div>
//                           )}
//                         </div>

//                         <div className="text-left sm:text-right">
//                           <p className="text-sm font-bold text-[#34483A]">
//                             ₹{Number(item.totalPrice ?? item.total_price ?? 0).toFixed(2)}
//                           </p>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>

//                 {/* Return progress */}
//                 {returnRequest && (
//                   <div className="border-t border-[#E8E4DA] bg-[#F0DDD2]/30 p-4">
//                     <div className="flex flex-wrap items-center justify-between gap-2">
//                       <h3 className="text-sm font-bold text-[#34483A]">
//                         Return &amp; Refund Progress
//                       </h3>

//                       <span className="rounded-full bg-[#F0DDD2] px-3 py-1 text-xs font-bold text-[#A55740]">
//                         {returnStatusLabels[returnRequest.status] || label(returnRequest.status)}
//                       </span>
//                     </div>

//                     <p className="mt-3 text-xs text-[#77786D]">
//                       Reason: {returnRequest.reason || '—'}
//                     </p>

//                     <div className="mt-3 grid gap-2 text-xs text-[#77786D] sm:grid-cols-2">
//                       <p>Requested: {formatReturnDate(returnRequest.createdAt) || '—'}</p>
//                       {returnRequest.approvedAt && <p>Approved: {formatReturnDate(returnRequest.approvedAt)}</p>}
//                       {returnRequest.rejectedAt && <p>Rejected: {formatReturnDate(returnRequest.rejectedAt)}</p>}
//                       {returnRequest.receivedAt && <p>Product received: {formatReturnDate(returnRequest.receivedAt)}</p>}
//                       {returnRequest.refundProcessingAt && <p>Refund processing: {formatReturnDate(returnRequest.refundProcessingAt)}</p>}
//                       {returnRequest.refundedAt && <p>Refunded: {formatReturnDate(returnRequest.refundedAt)}</p>}

//                       <p className="font-bold text-[#34483A]">
//                         Refund amount: ₹{Number(returnRequest.refundAmount || 0).toFixed(2)}
//                       </p>
//                     </div>

//                     {returnRequest.status === 'rejected' && returnRequest.rejectionReason && (
//                       <p className="mt-3 rounded-xl bg-[#F8EAE4] p-3 text-xs text-[#A55740]">
//                         Rejection reason: {returnRequest.rejectionReason}
//                       </p>
//                     )}

//                     {returnRequest.refundReference && (
//                       <p className="mt-2 text-xs text-[#77786D]">
//                         Refund reference: {returnRequest.refundReference}
//                       </p>
//                     )}

//                     {returnRequest.items?.length > 0 && (
//                       <ul className="mt-2 list-inside list-disc text-xs text-[#77786D]">
//                         {returnRequest.items.map((returnItem) => (
//                           <li key={returnItem.id}>
//                             {returnItem.orderItem?.productName || 'Product'} · Qty {returnItem.quantity}
//                           </li>
//                         ))}
//                       </ul>
//                     )}
//                   </div>
//                 )}

//                 {/* Footer actions */}
//                 <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E4DA] bg-[#F7F5EF] p-4">
//                   <Link
//                     to={`/customer/orders/${order.id}`}
//                     className="text-sm font-bold text-[#526B50] hover:text-[#34483A] hover:underline"
//                   >
//                     View Order Details →
//                   </Link>

//                   <div className="flex flex-wrap gap-2">
//                     {canCancel && (
//                       <Button
//                         variant="secondary"
//                         onClick={() => setCancellingOrder(order)}
//                         className="border border-[#E8CFC5] py-2 text-xs text-[#A55740] hover:bg-[#F8EAE4]"
//                       >
//                         Cancel Order
//                       </Button>
//                     )}

//                     {canReturn && (
//                       <Button
//                         variant="secondary"
//                         onClick={() => handleOpenReturnModal(order)}
//                         className="border border-[#D9DFD2] py-2 text-xs text-[#526B50] hover:bg-[#E9EDE4]"
//                       >
//                         Request Return
//                       </Button>
//                     )}
//                   </div>
//                 </div>
//               </Card>
//             );
//           })}
//         </div>
//       )}

//       {/* Review modal */}
//       {reviewingItem && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#34483A]/60 p-4 backdrop-blur-sm">
//           <div className={modalClass}>
//             <h3 className="text-lg font-bold text-[#34483A]">
//               {getReview(reviewingItem.item)?.id
//                 ? 'Edit Product Review'
//                 : 'Write a Product Review'}
//             </h3>

//             <p className="mb-5 mt-1 text-sm text-[#77786D]">
//               {getProductName(reviewingItem.item)}
//             </p>

//             {reviewError && (
//               <div className="mb-4">
//                 <Alert variant="error">{reviewError}</Alert>
//               </div>
//             )}

//             <form onSubmit={handleSubmitReview} className="space-y-4">
//               <div>
//                 <label className="mb-2 block text-sm font-semibold text-[#34483A]">
//                   Your Rating
//                 </label>

//                 <div className="flex items-center gap-2">
//                   {[1, 2, 3, 4, 5].map((star) => (
//                     <button
//                       key={star}
//                       type="button"
//                       onClick={() => setReviewRating(star)}
//                       aria-label={`Rate ${star} out of 5 stars`}
//                       aria-pressed={star === reviewRating}
//                       className={`text-3xl transition hover:scale-110 ${
//                         star <= reviewRating ? 'text-[#C7795D]' : 'text-[#D8D5C9]'
//                       }`}
//                     >
//                       ★
//                     </button>
//                   ))}

//                   <span className="ml-2 text-sm font-bold text-[#34483A]">
//                     {reviewRating}/5
//                   </span>
//                 </div>
//               </div>

//               <div>
//                 <label className="mb-1 block text-sm font-medium text-[#34483A]">
//                   Review Title (Optional)
//                 </label>

//                 <input
//                   type="text"
//                   maxLength={150}
//                   value={reviewTitle}
//                   onChange={(e) => setReviewTitle(e.target.value)}
//                   placeholder="Summarize your experience"
//                   className={inputClass}
//                 />
//               </div>

//               <div>
//                 <label className="mb-1 block text-sm font-medium text-[#34483A]">
//                   Your Review
//                 </label>

//                 <textarea
//                   required
//                   rows={4}
//                   maxLength={1500}
//                   value={reviewBody}
//                   onChange={(e) => setReviewBody(e.target.value)}
//                   placeholder="Share your experience with this product..."
//                   className={inputClass}
//                 />

//                 <p className="mt-1 text-right text-xs text-[#929184]">
//                   {reviewBody.length}/1500
//                 </p>
//               </div>

//               <div className="flex justify-end gap-2 pt-2">
//                 <Button
//                   type="button"
//                   variant="secondary"
//                   disabled={reviewLoading}
//                   onClick={closeReviewModal}
//                   className="py-2 text-xs"
//                 >
//                   Cancel
//                 </Button>

//                 <Button
//                   type="submit"
//                   disabled={reviewLoading || !reviewBody.trim()}
//                   className="bg-[#526B50] py-2 text-xs text-white hover:bg-[#3F563D]"
//                 >
//                   {reviewLoading ? 'Saving...' : 'Submit Review'}
//                 </Button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Cancel modal */}
//       {cancellingOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#34483A]/60 p-4 backdrop-blur-sm">
//           <div className="w-full max-w-md rounded-2xl border border-[#E8E4DA] bg-[#FDFCF8] p-6 shadow-2xl">
//             <h3 className="text-lg font-bold text-[#34483A]">
//               Cancel Order
//             </h3>

//             <p className="mb-4 mt-2 text-sm text-[#77786D]">
//               Are you sure you want to cancel order{' '}
//               <b>#{getOrderNumber(cancellingOrder)}</b>?
//             </p>

//             <form onSubmit={handleCancelOrder}>
//               <label className="mb-2 block text-sm font-medium text-[#34483A]">
//                 Cancellation Reason
//               </label>

//               <textarea
//                 required
//                 rows={3}
//                 value={cancelReason}
//                 onChange={(e) => setCancelReason(e.target.value)}
//                 placeholder="Reason for cancellation..."
//                 className={inputClass}
//               />

//               <div className="mt-5 flex justify-end gap-2">
//                 <Button
//                   type="button"
//                   variant="secondary"
//                   disabled={actionLoading}
//                   onClick={() => {
//                     setCancellingOrder(null);
//                     setCancelReason('');
//                   }}
//                   className="py-2 text-xs"
//                 >
//                   Keep Order
//                 </Button>

//                 <Button
//                   type="submit"
//                   disabled={actionLoading || !cancelReason.trim()}
//                   className="bg-[#C7795D] py-2 text-xs text-white hover:bg-[#AE654B]"
//                 >
//                   {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
//                 </Button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Return modal */}
//       {returningOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#34483A]/60 p-4 backdrop-blur-sm">
//           <div className={modalClass}>
//             <h3 className="text-lg font-bold text-[#34483A]">
//               Request Return / Refund
//             </h3>

//             <p className="mb-4 mt-1 text-sm text-[#77786D]">
//               Order #{getOrderNumber(returningOrder)}
//             </p>

//             <form onSubmit={handleReturnOrder} className="space-y-4">
//               <div>
//                 <label className="mb-2 block text-sm font-semibold text-[#34483A]">
//                   Select Items to Return
//                 </label>

//                 <div className="max-h-48 divide-y divide-[#EEEAE0] overflow-y-auto rounded-xl border border-[#E8E4DA] bg-white">
//                   {getOrderItems(returningOrder).map((item) => (
//                     <div
//                       key={item.id}
//                       className="flex items-center justify-between gap-2 p-3 text-xs"
//                     >
//                       <label className="flex min-w-0 cursor-pointer items-center gap-2">
//                         <input
//                           type="checkbox"
//                           checked={returnItemsState[item.id]?.selected || false}
//                           onChange={(e) =>
//                             setReturnItemsState((current) => ({
//                               ...current,
//                               [item.id]: {
//                                 ...current[item.id],
//                                 selected: e.target.checked,
//                               },
//                             }))
//                           }
//                           className="rounded border-[#BFC9B7] text-[#526B50] focus:ring-[#8A9A80]"
//                         />

//                         <span className="font-medium text-[#34483A]">
//                           {getProductName(item)}
//                         </span>
//                       </label>

//                       <div className="flex shrink-0 items-center gap-2">
//                         <span className="text-[#77786D]">Qty:</span>

//                         <input
//                           type="number"
//                           min="1"
//                           max={item.quantity}
//                           value={returnItemsState[item.id]?.quantity || 1}
//                           onChange={(e) =>
//                             setReturnItemsState((current) => ({
//                               ...current,
//                               [item.id]: {
//                                 ...current[item.id],
//                                 quantity: Math.min(
//                                   Number(item.quantity),
//                                   Math.max(1, parseInt(e.target.value, 10) || 1)
//                                 ),
//                               },
//                             }))
//                           }
//                           className="w-14 rounded-lg border border-[#E8E4DA] px-2 py-1 text-center text-[#34483A] outline-none focus:border-[#8A9A80]"
//                         />
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               <div>
//                 <label className="mb-1 block text-sm font-medium text-[#34483A]">
//                   Reason for Return
//                 </label>

//                 <textarea
//                   required
//                   rows={3}
//                   value={returnReason}
//                   onChange={(e) => setReturnReason(e.target.value)}
//                   placeholder="E.g. Item defective, wrong item, or transit damage..."
//                   className={inputClass}
//                 />
//               </div>

//               <div className="flex justify-end gap-2 pt-2">
//                 <Button
//                   type="button"
//                   variant="secondary"
//                   disabled={actionLoading}
//                   onClick={() => {
//                     setReturningOrder(null);
//                     setReturnReason('');
//                   }}
//                   className="py-2 text-xs"
//                 >
//                   Cancel
//                 </Button>

//                 <Button
//                   type="submit"
//                   disabled={actionLoading || !returnReason.trim()}
//                   className="bg-[#526B50] py-2 text-xs text-white hover:bg-[#3F563D]"
//                 >
//                   {actionLoading ? 'Submitting...' : 'Submit Return'}
//                 </Button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Alert, Button, Card, Spinner } from '../../components/ui.jsx';

const statusBadgeClasses = {
  pending_payment: 'bg-[#F5EBDD] text-[#9A713B]',
  confirmed: 'bg-[#E5EBE0] text-[#526B50]',
  processing: 'bg-[#E8EAE0] text-[#526B50]',
  dispatched: 'bg-[#EDE7DA] text-[#806A48]',
  out_for_delivery: 'bg-[#F0DDD2] text-[#A55740]',
  delivered: 'bg-[#E9EDE4] text-[#526B50]',
  cancelled: 'bg-[#F8EAE4] text-[#A55740]',
  returned: 'bg-[#F0DDD2] text-[#A55740]',
};

const returnStatusLabels = {
  requested: 'Return Requested',
  approved: 'Return Approved',
  rejected: 'Return Rejected',
  received: 'Return Received',
  item_received: 'Return Received',
  refund_processing: 'Refund Processing',
  refunded: 'Refunded',
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const formatReturnDate = (value) =>
  value ? new Date(value).toLocaleString('en-IN') : null;

const label = (value = '') =>
  String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const getOrderItems = (order) => order.items || order.OrderItems || [];

const getProductId = (item) =>
  item.productId ??
  item.product_id ??
  item.product?.id ??
  item.product?.productId ??
  null;

const getProductName = (item) =>
  item.productName ||
  item.product_name ||
  item.product?.name ||
  'Product';

const getProductImage = (item) =>
  item.product?.images?.[0]?.imageUrl ||
  item.product?.imageUrl ||
  item.product?.image ||
  item.imageUrl ||
  null;

const getReview = (item) =>
  item.review || item.productReview || null;

const isDelivered = (order) =>
  order.status === 'delivered' ||
  order.deliveryStatus === 'delivered' ||
  order.delivery_status === 'delivered';

const hasReviewed = (item) =>
  item.reviewed === true || getReview(item) != null;

const getOrderNumber = (order) =>
  order.orderNumber || order.order_number || order.id;

const getTotal = (order) =>
  Number(order.totalAmount ?? order.total_amount ?? 0);

const getDisplayStatus = (order) =>
  isDelivered(order) ? 'delivered' : order.status || 'unknown';

const getTabForOrder = (order) => {
  const status = order.status;
  const hasReturn = order.returns?.length > 0;

  if (status === 'cancelled') return 'cancelled';
  if (status === 'returned' || hasReturn) return 'returned';
  if (isDelivered(order)) return 'delivered';

  if (['dispatched', 'out_for_delivery'].includes(status)) {
    return 'to_receive';
  }

  if (['pending_payment', 'confirmed', 'processing'].includes(status)) {
    return 'to_ship';
  }

  return 'all';
};

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'to_ship', label: 'To Ship' },
  { id: 'to_receive', label: 'To Receive' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'returned', label: 'Returned' },
];

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [returningOrder, setReturningOrder] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnItemsState, setReturnItemsState] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  // Product review
  const [reviewingItem, setReviewingItem] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get('/customer/orders');
      setOrders(res.items || res.orders || []);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesTab =
        activeTab === 'all' || getTabForOrder(order) === activeTab;

      const searchable = [
        getOrderNumber(order),
        order.shop?.name,
        ...getOrderItems(order).map(getProductName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesTab && (!query || searchable.includes(query));
    });
  }, [orders, activeTab, search]);

  const tabCounts = useMemo(() => {
    const counts = { all: orders.length };

    tabs.forEach(({ id }) => {
      if (id !== 'all') {
        counts[id] = orders.filter(
          (order) => getTabForOrder(order) === id
        ).length;
      }
    });

    return counts;
  }, [orders]);

  const handleOpenReview = (order, item, editing = false) => {
    if (!getProductId(item)) {
      setError('Product information is missing for this order item.');
      return;
    }

    const review = getReview(item);

    setError(null);
    setReviewSuccess('');
    setReviewingItem({ order, item });
    setReviewRating(editing ? Number(review?.rating || 5) : 5);
    setReviewTitle(editing ? review?.title || '' : '');
    setReviewBody(editing ? review?.body || '' : '');
    setReviewError('');
  };

  const closeReviewModal = () => {
    if (reviewLoading) return;

    setReviewingItem(null);
    setReviewRating(5);
    setReviewTitle('');
    setReviewBody('');
    setReviewError('');
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!reviewingItem || reviewLoading) return;

    const { order, item } = reviewingItem;
    const productId = getProductId(item);
    const review = getReview(item);

    if (!productId || !order.id) {
      setReviewError('Order or product information is missing.');
      return;
    }

    if (!isDelivered(order)) {
      setReviewError('You can review a product only after delivery.');
      return;
    }

    if (
      !Number.isInteger(Number(reviewRating)) ||
      Number(reviewRating) < 1 ||
      Number(reviewRating) > 5
    ) {
      setReviewError('Please select a rating between 1 and 5.');
      return;
    }

    if (!reviewBody.trim()) {
      setReviewError('Please write your review.');
      return;
    }

    if (reviewBody.trim().length > 1500) {
      setReviewError('Your review must be 1500 characters or fewer.');
      return;
    }

    setReviewLoading(true);
    setReviewError('');

    try {
      const payload = {
        rating: Number(reviewRating),
        title: reviewTitle.trim() || null,
        body: reviewBody.trim(),
      };

      const isEditing = Boolean(review?.id);

      if (isEditing) {
        await api.put(`/customer/reviews/${review.id}`, payload);
      } else {
        await api.post(`/customer/products/${productId}/reviews`, {
          ...payload,
          orderId: order.id,
        });
      }

      setReviewingItem(null);
      setReviewRating(5);
      setReviewTitle('');
      setReviewBody('');

      await fetchOrders();

      setReviewSuccess(
        isEditing
          ? 'Your review has been updated successfully.'
          : 'Your review has been submitted successfully.'
      );
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleCancelOrder = async (e) => {
    e.preventDefault();
    if (!cancellingOrder) return;

    setActionLoading(true);

    try {
      await api.post(`/customer/orders/${cancellingOrder.id}/cancel`, {
        reason: cancelReason || 'Customer requested cancellation',
      });

      setCancellingOrder(null);
      setCancelReason('');
      await fetchOrders();
    } catch (err) {
      setError(err.message || 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReturnModal = (order) => {
    setReturningOrder(order);

    const selections = {};

    getOrderItems(order).forEach((item) => {
      selections[item.id] = {
        selected: true,
        quantity: item.quantity,
      };
    });

    setReturnItemsState(selections);
    setReturnReason('');
  };

  const handleReturnOrder = async (e) => {
    e.preventDefault();
    if (!returningOrder) return;

    const itemsToReturn = Object.entries(returnItemsState)
      .filter(([, value]) => value.selected && Number(value.quantity) > 0)
      .map(([itemId, value]) => ({
        orderItemId: Number(itemId),
        quantity: Number(value.quantity),
      }));

    if (!itemsToReturn.length) {
      setError('Please select at least one item to return.');
      return;
    }

    setActionLoading(true);

    try {
      await api.post(`/customer/orders/${returningOrder.id}/return`, {
        reason: returnReason || 'Return requested by customer',
        items: itemsToReturn,
      });

      setReturningOrder(null);
      setReturnReason('');
      await fetchOrders();
    } catch (err) {
      setError(err.message || 'Failed to submit return request');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Spinner />;

  const inputClass =
    'w-full rounded-xl border border-[#E8E4DA] bg-[#F7F5EF] px-3 py-2.5 text-sm text-[#34483A] outline-none transition placeholder:text-[#A19E91] focus:border-[#8A9A80] focus:bg-white focus:ring-2 focus:ring-[#E9EDE4]';

  const modalClass =
    'max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#E8E4DA] bg-[#FDFCF8] p-6 shadow-2xl';

  return (
    <div className="min-h-screen space-y-8 bg-[#F7F5EF] px-1 py-4 sm:px-3">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A907F]">
            Your shopping journey
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#34483A] sm:text-4xl">
            My Orders
          </h1>

          <p className="mt-2 text-sm text-[#77786D]">
            Track your orders, manage returns and share your reviews.
          </p>
        </div>

        <Link
          to="/products"
          className="inline-flex items-center justify-center self-start rounded-xl border border-[#D9DFD2] bg-[#FDFCF8] px-4 py-3 text-sm font-bold text-[#526B50] transition hover:bg-[#E9EDE4]"
        >
          ← Continue Shopping
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {reviewSuccess && <Alert variant="success">{reviewSuccess}</Alert>}

      {/* Search and filters */}
      <Card className="space-y-4 border border-[#E8E4DA] bg-[#FDFCF8] p-4 shadow-sm">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#929184]">
            🔍
          </span>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number or product name"
            className={`${inputClass} pl-10`}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'bg-[#526B50] text-white shadow-sm'
                  : 'border border-[#E8E4DA] bg-[#FDFCF8] text-[#77786D] hover:border-[#BFC9B7] hover:bg-[#E9EDE4] hover:text-[#34483A]'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 opacity-75">
                {tabCounts[tab.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Order list */}
      {filteredOrders.length === 0 ? (
        <Card className="border border-[#E8E4DA] bg-[#FDFCF8] p-10 text-center shadow-sm sm:p-14">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E9EDE4] text-[#526B50]">
            <span className="text-3xl">📦</span>
          </div>

          <h2 className="text-lg font-bold text-[#34483A]">
            {orders.length === 0
              ? 'No orders placed yet'
              : 'No matching orders found'}
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-sm text-[#77786D]">
            {orders.length === 0
              ? 'Your orders will appear here after you place your first order.'
              : 'Try another search or select a different order category.'}
          </p>

          <Link
            to="/products"
            className="mt-6 inline-flex rounded-xl bg-[#526B50] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3F563D]"
          >
            Explore Products
          </Link>
        </Card>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const items = getOrderItems(order);
            const displayStatus = getDisplayStatus(order);
            const delivered = isDelivered(order);

            const canCancel = [
              'pending_payment',
              'confirmed',
              'processing',
            ].includes(order.status);

            const returnRequest = order.returns?.[0] || null;
            const canReturn =
              delivered &&
              !returnRequest &&
              order.status !== 'cancelled';

            return (
              <Card
                key={order.id}
                className="overflow-hidden border border-[#E8E4DA] bg-[#FDFCF8] p-0 shadow-sm transition hover:shadow-md"
              >
                {/* Card header */}
                <div className="flex flex-col justify-between gap-3 border-b border-[#E8E4DA] bg-[#E9EDE4]/60 p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:gap-7">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#929184]">
                        Order ID
                      </p>
                      <Link
                        to={`/customer/orders/${order.id}`}
                        className="mt-1 inline-block font-mono text-sm font-bold text-[#34483A] hover:text-[#526B50]"
                      >
                        #{getOrderNumber(order)}
                      </Link>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#929184]">
                        Order Date
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#62685D]">
                        {formatDate(order.createdAt || order.created_at)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#929184]">
                        Store
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#62685D]">
                        {order.shop?.name || 'Local Store'}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#929184]">
                        Payment
                      </p>
                      <p className="mt-1 text-sm font-medium text-[#62685D]">
                        {label(order.paymentMethod || '—')}
                      </p>
                      <p
                        className={`text-xs font-semibold ${
                          order.paymentStatus === 'paid'
                            ? 'text-[#526B50]'
                            : 'text-[#A57A42]'
                        }`}
                      >
                        {label(order.paymentStatus || '—')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <span
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                        statusBadgeClasses[displayStatus] ||
                        'bg-[#EEECE3] text-[#77786D]'
                      }`}
                    >
                      {label(displayStatus)}
                    </span>

                    <p className="text-xl font-bold text-[#34483A]">
                      ₹{getTotal(order).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Product items */}
                <div className="divide-y divide-[#EEEAE0] px-4">
                  {items.map((item) => {
                    const review = getReview(item);
                    const alreadyReviewed = hasReviewed(item);
                    const image = getProductImage(item);

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
                      >
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E8E4DA] bg-[#F0EEE5]">
                          {image ? (
                            <img
                              src={image}
                              alt={getProductName(item)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-3xl text-[#8A907F]">
                              📦
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-[#34483A]">
                            {getProductName(item)}
                          </h3>

                          <p className="mt-1 text-xs text-[#77786D]">
                            {item.variantName || item.sku
                              ? `${item.variantName || item.sku} · `
                              : ''}
                            Qty: {item.quantity}
                          </p>

                          <p className="mt-1 text-xs text-[#77786D]">
                            ₹{Number(item.unitPrice ?? item.unit_price ?? 0).toFixed(2)} × {item.quantity}
                          </p>

                          {delivered && (
                            <div className="mt-2">
                              {alreadyReviewed ? (
                                <div className="text-xs">
                                  <p className="font-bold text-[#526B50]">
                                    ✓ Review Submitted
                                  </p>

                                  {review && (
                                    <>
                                      <p className="mt-1 text-[#C7795D]">
                                        {'★'.repeat(Math.min(5, Math.max(0, Number(review.rating || 0))))}
                                        {'☆'.repeat(5 - Math.min(5, Math.max(0, Number(review.rating || 0))))}
                                      </p>

                                      {review.title && (
                                        <p className="font-semibold text-[#34483A]">
                                          {review.title}
                                        </p>
                                      )}

                                      {review.body && (
                                        <p className="mt-1 text-[#77786D]">
                                          {review.body}
                                        </p>
                                      )}
                                    </>
                                  )}

                                  {review?.id && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReview(order, item, true)}
                                      className="mt-1 font-bold text-[#526B50] hover:underline"
                                    >
                                      Edit Review
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!getProductId(item)}
                                  onClick={() => handleOpenReview(order, item)}
                                  className="text-xs font-bold text-[#526B50] hover:underline disabled:opacity-50"
                                >
                                  ★ Write a Review
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-sm font-bold text-[#34483A]">
                            ₹{Number(item.totalPrice ?? item.total_price ?? 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Return progress */}
                {returnRequest && (
                  <div className="border-t border-[#E8E4DA] bg-[#F0DDD2]/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-[#34483A]">
                        Return &amp; Refund Progress
                      </h3>

                      <span className="rounded-full bg-[#F0DDD2] px-3 py-1 text-xs font-bold text-[#A55740]">
                        {returnStatusLabels[returnRequest.status] || label(returnRequest.status)}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-[#77786D]">
                      Reason: {returnRequest.reason || '—'}
                    </p>

                    <div className="mt-3 grid gap-2 text-xs text-[#77786D] sm:grid-cols-2">
                      <p>Requested: {formatReturnDate(returnRequest.createdAt) || '—'}</p>
                      {returnRequest.approvedAt && <p>Approved: {formatReturnDate(returnRequest.approvedAt)}</p>}
                      {returnRequest.rejectedAt && <p>Rejected: {formatReturnDate(returnRequest.rejectedAt)}</p>}
                      {returnRequest.receivedAt && <p>Product received: {formatReturnDate(returnRequest.receivedAt)}</p>}
                      {returnRequest.refundProcessingAt && <p>Refund processing: {formatReturnDate(returnRequest.refundProcessingAt)}</p>}
                      {returnRequest.refundedAt && <p>Refunded: {formatReturnDate(returnRequest.refundedAt)}</p>}

                      <p className="font-bold text-[#34483A]">
                        Refund amount: ₹{Number(returnRequest.refundAmount || 0).toFixed(2)}
                      </p>
                    </div>

                    {returnRequest.status === 'rejected' && returnRequest.rejectionReason && (
                      <p className="mt-3 rounded-xl bg-[#F8EAE4] p-3 text-xs text-[#A55740]">
                        Rejection reason: {returnRequest.rejectionReason}
                      </p>
                    )}

                    {returnRequest.refundReference && (
                      <p className="mt-2 text-xs text-[#77786D]">
                        Refund reference: {returnRequest.refundReference}
                      </p>
                    )}

                    {returnRequest.items?.length > 0 && (
                      <ul className="mt-2 list-inside list-disc text-xs text-[#77786D]">
                        {returnRequest.items.map((returnItem) => (
                          <li key={returnItem.id}>
                            {returnItem.orderItem?.productName || 'Product'} · Qty {returnItem.quantity}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Footer actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E4DA] bg-[#F7F5EF] p-4">
                  <Link
                    to={`/customer/orders/${order.id}`}
                    className="text-sm font-bold text-[#526B50] hover:text-[#34483A] hover:underline"
                  >
                    View Order Details →
                  </Link>

                  <div className="flex flex-wrap gap-2">
                    {canCancel && (
                      <Button
                        variant="secondary"
                        onClick={() => setCancellingOrder(order)}
                        className="border border-[#E8CFC5] py-2 text-xs text-[#A55740] hover:bg-[#F8EAE4]"
                      >
                        Cancel Order
                      </Button>
                    )}

                    {canReturn && (
                      <Button
                        variant="secondary"
                        onClick={() => handleOpenReturnModal(order)}
                        className="border border-[#D9DFD2] py-2 text-xs text-[#526B50] hover:bg-[#E9EDE4]"
                      >
                        Request Return
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review modal */}
      {reviewingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#34483A]/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeReviewModal();
          }}
        >
          <div
            className={modalClass}
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-modal-title"
          >
            {/* Modal heading and close button */}
            <div className="mb-1 flex items-start justify-between gap-4">
              <h3
                id="review-modal-title"
                className="text-lg font-bold text-[#34483A]"
              >
                {getReview(reviewingItem.item)?.id
                  ? 'Edit Product Review'
                  : 'Write a Product Review'}
              </h3>

              <button
                type="button"
                onClick={closeReviewModal}
                disabled={reviewLoading}
                aria-label="Close review form"
                title="Close"
                className="-mr-2 -mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-[#77786D] transition hover:bg-[#E9EDE4] hover:text-[#34483A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <p className="mb-5 mt-1 text-sm text-[#77786D]">
              {getProductName(reviewingItem.item)}
            </p>

            {reviewError && (
              <div className="mb-4">
                <Alert variant="error">{reviewError}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#34483A]">
                  Your Rating
                </label>

                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      aria-label={`Rate ${star} out of 5 stars`}
                      aria-pressed={star === reviewRating}
                      className={`text-3xl transition hover:scale-110 ${
                        star <= reviewRating
                          ? 'text-[#C7795D]'
                          : 'text-[#D8D5C9]'
                      }`}
                    >
                      ★
                    </button>
                  ))}

                  <span className="ml-2 text-sm font-bold text-[#34483A]">
                    {reviewRating}/5
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#34483A]">
                  Review Title (Optional)
                </label>

                <input
                  type="text"
                  maxLength={150}
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="Summarize your experience"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#34483A]">
                  Your Review
                </label>

                <textarea
                  required
                  rows={4}
                  maxLength={1500}
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  placeholder="Share your experience with this product..."
                  className={inputClass}
                />

                <p className="mt-1 text-right text-xs text-[#929184]">
                  {reviewBody.length}/1500
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={reviewLoading}
                  onClick={closeReviewModal}
                  className="py-2 text-xs"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={reviewLoading || !reviewBody.trim()}
                  className="bg-[#526B50] py-2 text-xs text-white hover:bg-[#3F563D]"
                >
                  {reviewLoading ? 'Saving...' : 'Submit Review'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#34483A]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#E8E4DA] bg-[#FDFCF8] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#34483A]">
              Cancel Order
            </h3>

            <p className="mb-4 mt-2 text-sm text-[#77786D]">
              Are you sure you want to cancel order{' '}
              <b>#{getOrderNumber(cancellingOrder)}</b>?
            </p>

            <form onSubmit={handleCancelOrder}>
              <label className="mb-2 block text-sm font-medium text-[#34483A]">
                Cancellation Reason
              </label>

              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className={inputClass}
              />

              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={actionLoading}
                  onClick={() => {
                    setCancellingOrder(null);
                    setCancelReason('');
                  }}
                  className="py-2 text-xs"
                >
                  Keep Order
                </Button>

                <Button
                  type="submit"
                  disabled={actionLoading || !cancelReason.trim()}
                  className="bg-[#C7795D] py-2 text-xs text-white hover:bg-[#AE654B]"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return modal */}
      {returningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#34483A]/60 p-4 backdrop-blur-sm">
          <div className={modalClass}>
            <h3 className="text-lg font-bold text-[#34483A]">
              Request Return / Refund
            </h3>

            <p className="mb-4 mt-1 text-sm text-[#77786D]">
              Order #{getOrderNumber(returningOrder)}
            </p>

            <form onSubmit={handleReturnOrder} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#34483A]">
                  Select Items to Return
                </label>

                <div className="max-h-48 divide-y divide-[#EEEAE0] overflow-y-auto rounded-xl border border-[#E8E4DA] bg-white">
                  {getOrderItems(returningOrder).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 p-3 text-xs"
                    >
                      <label className="flex min-w-0 cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={returnItemsState[item.id]?.selected || false}
                          onChange={(e) =>
                            setReturnItemsState((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                selected: e.target.checked,
                              },
                            }))
                          }
                          className="rounded border-[#BFC9B7] text-[#526B50] focus:ring-[#8A9A80]"
                        />

                        <span className="font-medium text-[#34483A]">
                          {getProductName(item)}
                        </span>
                      </label>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[#77786D]">Qty:</span>

                        <input
                          type="number"
                          min="1"
                          max={item.quantity}
                          value={returnItemsState[item.id]?.quantity || 1}
                          onChange={(e) =>
                            setReturnItemsState((current) => ({
                              ...current,
                              [item.id]: {
                                ...current[item.id],
                                quantity: Math.min(
                                  Number(item.quantity),
                                  Math.max(
                                    1,
                                    parseInt(e.target.value, 10) || 1
                                  )
                                ),
                              },
                            }))
                          }
                          className="w-14 rounded-lg border border-[#E8E4DA] px-2 py-1 text-center text-[#34483A] outline-none focus:border-[#8A9A80]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#34483A]">
                  Reason for Return
                </label>

                <textarea
                  required
                  rows={3}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="E.g. Item defective, wrong item, or transit damage..."
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={actionLoading}
                  onClick={() => {
                    setReturningOrder(null);
                    setReturnReason('');
                  }}
                  className="py-2 text-xs"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={actionLoading || !returnReason.trim()}
                  className="bg-[#526B50] py-2 text-xs text-white hover:bg-[#3F563D]"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Return'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
