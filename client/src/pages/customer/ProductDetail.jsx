


// import { useEffect, useMemo, useState } from 'react';
// import { useNavigate, useParams, Link } from 'react-router-dom';
// import { api } from '../../services/api.js';
// import { useAuth } from '../../context/AuthContext.jsx';
// import { Alert, Button, Card, Spinner } from '../../components/ui.jsx';

// const normalizeAttributeName = (name = '') =>
//   String(name).toLowerCase().replace(/[\s_-]/g, '');

// const getVariantAttribute = (variant, names) => {
//   const values = variant?.variantValues || [];

//   const match = values.find((item) =>
//     names.includes(normalizeAttributeName(item.attribute?.name))
//   );

//   return match?.attributeValue?.value ?? null;
// };

// const getVariantSize = (variant) =>
//   getVariantAttribute(variant, ['size', 'packsize', 'weight']) ||
//   variant?.variantName ||
//   null;

// const getVariantColor = (variant) =>
//   getVariantAttribute(variant, ['color', 'colour']);

// const getVariantOptionPrice = (variant) => {
//   const listings = (variant?.listings || []).filter(
//     (item) =>
//       item.retailPrice != null &&
//       Number(item.retailPrice) > 0 &&
//       Number(item.availableStock ?? item.stock ?? 0) > 0
//   );

//   return listings.length
//     ? Math.min(...listings.map((item) => Number(item.retailPrice)))
//     : null;
// };

// export default function CustomerProductDetail() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const { user } = useAuth();

//   const [product, setProduct] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');

//   const [selectedVariantId, setSelectedVariantId] = useState(null);
//   const [selectedShopId, setSelectedShopId] = useState(null);
//   const [sellerListings, setSellerListings] = useState([]);
//   const [sellersLoading, setSellersLoading] = useState(false);
//   const [quantity, setQuantity] = useState(1);

//   const [addingToCart, setAddingToCart] = useState(false);
//   const [togglingWishlist, setTogglingWishlist] = useState(false);
//   const [isInWishlist, setIsInWishlist] = useState(false);

//   const [reviews, setReviews] = useState([]);
//   const [reviewAverage, setReviewAverage] = useState(0);
//   const [reviewCount, setReviewCount] = useState(0);
//   const [ratingDistribution, setRatingDistribution] = useState([]);
//   const [reviewPage, setReviewPage] = useState(1);
//   const [hasMoreReviews, setHasMoreReviews] = useState(false);
//   const [reviewsLoading, setReviewsLoading] = useState(false);
//   const [reviewsError, setReviewsError] = useState('');

//   const [reviewForm, setReviewForm] = useState({
//     rating: 5,
//     title: '',
//     body: '',
//   });

//   const [reviewMessage, setReviewMessage] = useState('');
//   const [reviewError, setReviewError] = useState('');
//   const [reviewBusy, setReviewBusy] = useState(false);
//   const [reviewEditing, setReviewEditing] = useState(false);

//   const [reviewEligibility, setReviewEligibility] = useState({
//     loading: false,
//     eligible: false,
//     orderId: null,
//     review: null,
//     reason: '',
//   });

//   const [activeImage, setActiveImage] = useState(null);

//   // Related products
//   const [relatedProducts, setRelatedProducts] = useState([]);
//   const [relatedRatings, setRelatedRatings] = useState({});
//   const [relatedLoading, setRelatedLoading] = useState(false);

//   const [descriptionExpanded, setDescriptionExpanded] = useState(false);

//   // Check review eligibility
//   useEffect(() => {
//     let mounted = true;

//     if (!user || user.role !== 'customer') {
//       setReviewEligibility({
//         loading: false,
//         eligible: false,
//         orderId: null,
//         review: null,
//         reason: '',
//       });

//       return () => {
//         mounted = false;
//       };
//     }

//     setReviewEligibility((current) => ({
//       ...current,
//       loading: true,
//     }));

//     api.get(`/customer/products/${id}/review-eligibility`)
//       .then((result) => {
//         if (mounted) {
//           setReviewEligibility({
//             loading: false,
//             ...result,
//           });
//         }
//       })
//       .catch((err) => {
//         if (mounted) {
//           setReviewEligibility({
//             loading: false,
//             eligible: false,
//             orderId: null,
//             review: null,
//             reason:
//               err.message || 'Unable to check review eligibility.',
//           });
//         }
//       });

//     return () => {
//       mounted = false;
//     };
//   }, [id, user]);

//   // Load product, reviews and wishlist
//   useEffect(() => {
//     let mounted = true;

//     async function loadProduct() {
//       setLoading(true);
//       setError('');

//       try {
//         const res = await api.get(`/store/products/${id}`);

//         if (!mounted) return;

//         const prod = res.product;
//         setProduct(prod);

//         const sortedImages = [...(prod.images || [])].sort(
//           (a, b) =>
//             Number(Boolean(b.isPrimary)) -
//               Number(Boolean(a.isPrimary)) ||
//             Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
//         );

//         setActiveImage(sortedImages[0]?.imageUrl || null);

//         if (prod.variants?.length) {
//           const firstVariant =
//             prod.variants.find((variant) => variant.listings?.length) ||
//             prod.variants[0];

//           setSelectedVariantId(firstVariant.id);

//           setSelectedShopId(
//             firstVariant.listings?.[0]?.shopId || null
//           );
//         } else {
//           setSelectedVariantId(null);
//           setSelectedShopId(null);
//         }

//         setQuantity(1);
//       } catch (err) {
//         if (mounted) {
//           setError(err.message || 'Unable to load product.');
//         }
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     }

//     async function loadReviews() {
//       setReviewsLoading(true);
//       setReviewsError('');

//       try {
//         const data = await api.get(
//           `/store/products/${id}/reviews?page=1&pageSize=10`
//         );

//         if (mounted) {
//           setReviews(data.items || []);
//           setReviewAverage(Number(data.average || 0));
//           setReviewCount(Number(data.count || 0));
//           setRatingDistribution(data.distribution || []);
//           setReviewPage(Number(data.page || 1));

//           setHasMoreReviews(
//             (data.items || []).length < Number(data.count || 0)
//           );
//         }
//       } catch (err) {
//         if (mounted) {
//           setReviews([]);
//           setReviewAverage(0);
//           setReviewCount(0);
//           setRatingDistribution([]);
//           setReviewsError(
//             err.message || 'Unable to load product reviews.'
//           );
//         }
//       } finally {
//         if (mounted) setReviewsLoading(false);
//       }
//     }

//     loadProduct();
//     loadReviews();

//     if (user) {
//       api.get('/customer/wishlist')
//         .then((res) => {
//           if (!mounted) return;

//           setIsInWishlist(
//             (res.items || []).some(
//               (item) => Number(item.productId) === Number(id)
//             )
//           );
//         })
//         .catch(() => {});
//     } else {
//       setIsInWishlist(false);
//     }

//     return () => {
//       mounted = false;
//     };
//   }, [id, user]);

//   // Automatically select the first available seller for the selected variant.
//   // No seller dropdown is displayed to the customer.
//   useEffect(() => {
//     let mounted = true;

//     if (!selectedVariantId) {
//       setSellerListings([]);
//       setSelectedShopId(null);
//       setSellersLoading(false);

//       return () => {
//         mounted = false;
//       };
//     }

//     setSellerListings([]);
//     setSelectedShopId(null);
//     setSellersLoading(true);

//     api.get(
//       `/store/products/${id}?variantId=${encodeURIComponent(selectedVariantId)}`
//     )
//       .then((response) => {
//         if (!mounted) return;

//         const items = (response.sellers || []).map((listing) => ({
//           ...listing,
//           id: listing.listingId ?? listing.id,
//           retailPrice: Number(
//             listing.sellingPrice ?? listing.retailPrice
//           ),
//           stock: Number(
//             listing.availableStock ?? listing.stock
//           ),
//           availableStock: Number(
//             listing.availableStock ?? listing.stock
//           ),
//           gstRate: Number(
//             listing.gstPercentage ?? listing.gstRate ?? 0
//           ),
//         }));

//         // Automatically choose the first available seller.
//         setSellerListings(items);
//         setSelectedShopId(
//           items[0] ? Number(items[0].shopId) : null
//         );
//       })
//       .catch((err) => {
//         if (mounted) {
//           setSellerListings([]);
//           setSelectedShopId(null);
//           setError(
//             err.message || 'Unable to load available seller.'
//           );
//         }
//       })
//       .finally(() => {
//         if (mounted) setSellersLoading(false);
//       });

//     return () => {
//       mounted = false;
//     };
//   }, [id, selectedVariantId]);

//   // Sort gallery images: primary image first
//   const productImages = useMemo(() => {
//     return [...(product?.images || [])].sort(
//       (a, b) =>
//         Number(Boolean(b.isPrimary)) -
//           Number(Boolean(a.isPrimary)) ||
//         Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
//     );
//   }, [product]);

//   const activeImageIndex = productImages.findIndex(
//     (image) => image.imageUrl === activeImage
//   );

//   const changeGalleryImage = (direction) => {
//     if (productImages.length < 2) return;

//     const currentIndex =
//       activeImageIndex >= 0 ? activeImageIndex : 0;

//     const nextIndex =
//       (currentIndex + direction + productImages.length) %
//       productImages.length;

//     setActiveImage(productImages[nextIndex].imageUrl);
//   };

//   // Load related products when the current product changes
//   useEffect(() => {
//     let mounted = true;

//     async function loadRelatedProducts() {
//       if (!product?.id || !product?.categoryId) {
//         setRelatedProducts([]);
//         return;
//       }

//       setRelatedLoading(true);

//       try {
//         const response = await api.get(
//           `/store/products?categoryId=${encodeURIComponent(
//             product.categoryId
//           )}&page=1&pageSize=9`
//         );

//         if (!mounted) return;

//         const items = Array.isArray(response)
//           ? response
//           : response.items ||
//             response.products ||
//             response.rows ||
//             response.data?.items ||
//             response.data?.products ||
//             [];

//         const filtered = items
//           .filter(
//             (item) =>
//               Number(item.id) !== Number(product.id) &&
//               item.isActive !== false
//           )
//           .slice(0, 8);

//         setRelatedProducts(filtered);

//         const ratingResults = await Promise.allSettled(
//           filtered.map(async (item) => {
//             const result = await api.get(
//               `/store/products/${item.id}/reviews`
//             );

//             return {
//               id: item.id,
//               average: Number(result.average || 0),
//               count: Number(
//                 result.count ?? result.items?.length ?? 0
//               ),
//             };
//           })
//         );

//         if (!mounted) return;

//         const ratingMap = {};

//         ratingResults.forEach((result) => {
//           if (result.status === 'fulfilled') {
//             ratingMap[result.value.id] = {
//               average: result.value.average,
//               count: result.value.count,
//             };
//           }
//         });

//         setRelatedRatings(ratingMap);
//       } catch {
//         if (mounted) {
//           setRelatedProducts([]);
//           setRelatedRatings({});
//         }
//       } finally {
//         if (mounted) setRelatedLoading(false);
//       }
//     }

//     loadRelatedProducts();

//     return () => {
//       mounted = false;
//     };
//   }, [product?.id, product?.categoryId]);

//   const selectedVariant = product?.variants?.find(
//     (variant) => Number(variant.id) === Number(selectedVariantId)
//   );

//   const selectedListing =
//     sellerListings.find(
//       (listing) => Number(listing.shopId) === Number(selectedShopId)
//     ) || sellerListings[0] || null;

//   const price = selectedListing
//     ? Number(selectedListing.retailPrice)
//     : null;

//   const currentStock = Number(
//     selectedListing?.availableStock ??
//     selectedListing?.stock ??
//     0
//   );

//   // Derive available sizes from product variants.
//   const sizeOptions = useMemo(() => {
//     const variants = product?.variants || [];
//     const values = [];

//     variants.forEach((variant) => {
//       const size = getVariantSize(variant);

//       if (
//         size != null &&
//         !values.some(
//           (item) =>
//             String(item).toLowerCase() ===
//             String(size).toLowerCase()
//         )
//       ) {
//         values.push(size);
//       }
//     });

//     return values;
//   }, [product]);

//   // Derive available colors from product variants.
//   const colorOptions = useMemo(() => {
//     const variants = product?.variants || [];
//     const values = [];

//     variants.forEach((variant) => {
//       const color = getVariantColor(variant);

//       if (
//         color != null &&
//         !values.some(
//           (item) =>
//             String(item).toLowerCase() ===
//             String(color).toLowerCase()
//         )
//       ) {
//         values.push(color);
//       }
//     });

//     return values;
//   }, [product]);

//   const selectedSize = selectedVariant
//     ? getVariantSize(selectedVariant)
//     : null;

//   const selectedColor = selectedVariant
//     ? getVariantColor(selectedVariant)
//     : null;

//   // Find the correct variant for selected size and color.
//   const findMatchingVariant = ({ size, color }) => {
//     const variants = product?.variants || [];

//     return (
//       variants.find((variant) => {
//         const variantSize = getVariantSize(variant);
//         const variantColor = getVariantColor(variant);

//         const sizeMatches =
//           size == null ||
//           String(variantSize).toLowerCase() ===
//             String(size).toLowerCase();

//         const colorMatches =
//           color == null ||
//           String(variantColor).toLowerCase() ===
//             String(color).toLowerCase();

//         return sizeMatches && colorMatches;
//       }) || null
//     );
//   };

//   const ratingBreakdown = useMemo(() => {
//     const counts = [0, 0, 0, 0, 0];

//     ratingDistribution.forEach((row) => {
//       const rating = Number(row.rating);

//       if (rating >= 1 && rating <= 5) {
//         counts[rating - 1] = Number(row.count || 0);
//       }
//     });

//     return counts;
//   }, [ratingDistribution]);

//   // Keep Size and Color as selectors.
//   // Keep Pack Size and other attributes in Product Highlights.
//   const highlights = useMemo(() => {
//     const values = selectedVariant?.variantValues || [];

//     return values
//       .map((item) => ({
//         name: item.attribute?.name,
//         value: item.attributeValue?.value,
//       }))
//       .filter((item) => {
//         if (!item.name || !item.value) return false;

//         const attributeName = normalizeAttributeName(item.name);

//         return ![
//           'size',
//           'color',
//           'colour',
//         ].includes(attributeName);
//       });
//   }, [selectedVariant]);

//   const StarRating = ({ rating }) => {
//     const rounded = Math.max(
//       0,
//       Math.min(5, Math.round(Number(rating) || 0))
//     );

//     return (
//       <span className="whitespace-nowrap text-amber-500">
//         {'★'.repeat(rounded)}
//         <span className="text-slate-300">
//           {'★'.repeat(5 - rounded)}
//         </span>
//       </span>
//     );
//   };

//   // Get a related product's actual available selling price.
//   const getRelatedPrice = (item) => {
//     const listings =
//       item.sellerListings ||
//       item.listings ||
//       item.variants?.flatMap(
//         (variant) => variant.listings || []
//       ) ||
//       [];

//     const availableListing = listings.find(
//       (listing) =>
//         listing.retailPrice != null &&
//         Number(listing.retailPrice) > 0 &&
//         Number(
//           listing.availableStock ?? listing.stock ?? 0
//         ) > 0
//     );

//     return availableListing
//       ? Number(availableListing.retailPrice)
//       : null;
//   };

//   const getRelatedImage = (item) => {
//     const images = [...(item.images || [])].sort(
//       (a, b) =>
//         Number(Boolean(b.isPrimary)) -
//           Number(Boolean(a.isPrimary)) ||
//         Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
//     );

//     return images[0]?.imageUrl || null;
//   };

//   const handleVariantChange = (variantId) => {
//     const variant = product?.variants?.find(
//       (item) => Number(item.id) === Number(variantId)
//     );

//     if (!variant) return;

//     setSelectedVariantId(variant.id);
//     setSellerListings([]);
//     setSelectedShopId(null);
//     setQuantity(1);
//     setError('');
//   };

//   const handleSizeChange = (size) => {
//     const matchingVariant =
//       findMatchingVariant({
//         size,
//         color: selectedColor,
//       }) ||
//       findMatchingVariant({
//         size,
//         color: null,
//       });

//     if (matchingVariant) {
//       handleVariantChange(matchingVariant.id);
//     }
//   };

//   const handleColorChange = (color) => {
//     const matchingVariant =
//       findMatchingVariant({
//         size: selectedSize,
//         color,
//       }) ||
//       findMatchingVariant({
//         size: null,
//         color,
//       });

//     if (matchingVariant) {
//       handleVariantChange(matchingVariant.id);
//     }
//   };

//   const handleAddToCart = async () => {
//     if (!user) {
//       navigate('/customer/login');
//       return;
//     }

//     if (!selectedVariantId || !selectedShopId || !selectedListing) {
//       setError('No available seller for this product option.');
//       return;
//     }

//     if (currentStock <= 0) {
//       setError('This product is currently out of stock.');
//       return;
//     }

//     if (quantity > currentStock) {
//       setError(`Only ${currentStock} items are available.`);
//       return;
//     }

//     setAddingToCart(true);
//     setError('');
//     setSuccess('');

//     try {
//       await api.post('/customer/cart', {
//         shopId: Number(selectedShopId),
//         sellerListingId: Number(selectedListing.id),
//         productId: product.id,
//         productVariantId: Number(selectedVariantId),
//         quantity: Number(quantity),
//       });

//       window.dispatchEvent(
//         new Event('customer:cart-updated')
//       );

//       setSuccess('Product successfully added to your cart.');
//     } catch (err) {
//       setError(
//         err.message || 'Unable to add product to cart.'
//       );
//     } finally {
//       setAddingToCart(false);
//     }
//   };

//   const handleToggleWishlist = async () => {
//     if (!user) {
//       navigate('/customer/login');
//       return;
//     }

//     setTogglingWishlist(true);
//     setError('');
//     setSuccess('');

//     try {
//       const res = await api.post('/customer/wishlist', {
//         productId: product.id,
//       });

//       setIsInWishlist(res.added);

//       setSuccess(
//         res.message ||
//           (res.added
//             ? 'Added to wishlist!'
//             : 'Removed from wishlist.')
//       );
//     } catch (err) {
//       setError(
//         err.message || 'Unable to update wishlist.'
//       );
//     } finally {
//       setTogglingWishlist(false);
//     }
//   };

//   const handleReviewSubmit = async (event) => {
//     event.preventDefault();

//     if (
//       !reviewEditing &&
//       (!reviewEligibility.eligible || !reviewEligibility.orderId)
//     ) {
//       setReviewError(
//         'A delivered purchase is required before reviewing this product.'
//       );
//       return;
//     }

//     if (reviewEditing && !reviewEligibility.review?.id) {
//       setReviewError(
//         'Your saved review could not be found. Refresh the page and try again.'
//       );
//       return;
//     }

//     setReviewBusy(true);
//     setReviewError('');
//     setReviewMessage('');

//     try {
//       const result = reviewEditing
//         ? await api.put(
//             `/customer/reviews/${reviewEligibility.review.id}`,
//             reviewForm
//           )
//         : await api.post(
//             `/customer/products/${id}/reviews`,
//             {
//               ...reviewForm,
//               orderId: reviewEligibility.orderId,
//             }
//           );

//       setReviewMessage(
//         result.message ||
//           (reviewEditing
//             ? 'Your review has been updated.'
//             : 'Your review has been submitted.')
//       );

//       setReviewEditing(false);

//       setReviewForm({
//         rating: 5,
//         title: '',
//         body: '',
//       });

//       try {
//         const [reviewData, eligibility] = await Promise.all([
//           api.get(
//             `/store/products/${id}/reviews?page=1&pageSize=10`
//           ),
//           api.get(
//             `/customer/products/${id}/review-eligibility`
//           ),
//         ]);

//         setReviews(reviewData.items || []);
//         setReviewAverage(Number(reviewData.average || 0));
//         setReviewCount(Number(reviewData.count || 0));
//         setRatingDistribution(
//           reviewData.distribution || []
//         );
//         setReviewPage(Number(reviewData.page || 1));

//         setHasMoreReviews(
//           (reviewData.items || []).length <
//             Number(reviewData.count || 0)
//         );

//         setReviewEligibility({
//           loading: false,
//           ...eligibility,
//         });
//       } catch (refreshError) {
//         setReviewError(
//           `Your review was saved, but the latest review data could not be refreshed: ${
//             refreshError.message || 'Please reload the page.'
//           }`
//         );
//       }
//     } catch (err) {
//       setReviewError(
//         err.message || 'Unable to submit review.'
//       );
//     } finally {
//       setReviewBusy(false);
//     }
//   };

//   const loadMoreReviews = async () => {
//     if (reviewsLoading || !hasMoreReviews) return;

//     setReviewsLoading(true);
//     setReviewsError('');

//     try {
//       const nextPage = reviewPage + 1;

//       const data = await api.get(
//         `/store/products/${id}/reviews?page=${nextPage}&pageSize=10`
//       );

//       const items = data.items || [];

//       setReviews((current) => [...current, ...items]);
//       setReviewPage(Number(data.page || nextPage));

//       setHasMoreReviews(
//         reviews.length + items.length <
//           Number(data.count || reviewCount)
//       );
//     } catch (err) {
//       setReviewsError(
//         err.message || 'Unable to load more reviews.'
//       );
//     } finally {
//       setReviewsLoading(false);
//     }
//   };

//   if (loading) return <Spinner />;

//   if (!product) {
//     return (
//       <Alert variant="error">
//         {error || 'Product not found.'}
//       </Alert>
//     );
//   }

//   return (
//     <div className="mx-auto w-full max-w-none space-y-5 pb-10">
//       {/* Breadcrumb */}
//       <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
//         <Link to="/" className="hover:text-indigo-600">
//           Home
//         </Link>

//         <span>/</span>

//         <Link to="/products" className="hover:text-indigo-600">
//           Products
//         </Link>

//         <span>/</span>

//         <span className="font-semibold text-slate-800">
//           {product.name}
//         </span>
//       </nav>

//       {error && <Alert variant="error">{error}</Alert>}
//       {success && <Alert variant="success">{success}</Alert>}

//       {/* Main Layout */}
//       <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
//         {/* LEFT: Product Images */}
//         <div className="space-y-3 lg:col-span-5">
//           <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
//             {activeImage ? (
//               <img
//                 src={activeImage}
//                 alt={product.name}
//                 className="h-full w-full object-contain"
//               />
//             ) : (
//               <span className="text-sm text-slate-400">
//                 No Image Available
//               </span>
//             )}

//             {productImages.length > 1 && (
//               <button
//                 type="button"
//                 onClick={() => changeGalleryImage(-1)}
//                 aria-label="Previous product image"
//                 className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-lg shadow-md transition hover:bg-white"
//               >
//                 &#10094;
//               </button>
//             )}

//             {productImages.length > 1 && (
//               <button
//                 type="button"
//                 onClick={() => changeGalleryImage(1)}
//                 aria-label="Next product image"
//                 className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-lg shadow-md transition hover:bg-white"
//               >
//                 &#10095;
//               </button>
//             )}

//             {productImages.length > 1 && (
//               <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-white">
//                 {activeImageIndex >= 0
//                   ? activeImageIndex + 1
//                   : 1}
//                 {' / '}
//                 {productImages.length}
//               </span>
//             )}
//           </div>

//           {/* Clickable thumbnails */}
//           {productImages.length > 1 && (
//             <div className="flex gap-3 overflow-x-auto pb-2">
//               {productImages.map((img, index) => (
//                 <button
//                   key={img.id || `${img.imageUrl}-${index}`}
//                   type="button"
//                   onClick={() => setActiveImage(img.imageUrl)}
//                   aria-label={`View product image ${index + 1}`}
//                   className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${
//                     activeImage === img.imageUrl
//                       ? 'border-indigo-600'
//                       : 'border-slate-200 hover:border-slate-400'
//                   }`}
//                 >
//                   <img
//                     src={img.imageUrl}
//                     alt={`${product.name} ${index + 1}`}
//                     className="h-full w-full object-cover"
//                   />
//                 </button>
//               ))}
//             </div>
//           )}

//           {/* Product Description - Below Product Image */}
//           {product.description && (
//             <div className="rounded-xl border border-slate-200 bg-white p-4">
//               <h2 className="mb-2 text-base font-bold text-slate-900">
//                 Product Description
//               </h2>

//               <p className="whitespace-pre-line break-words text-sm leading-6 text-slate-600">
//                 {descriptionExpanded
//                   ? product.description
//                   : product.description.length > 220
//                     ? `${product.description.slice(0, 220).trimEnd()}...`
//                     : product.description}
//               </p>

//               {product.description.length > 220 && (
//                 <button
//                   type="button"
//                   onClick={() =>
//                     setDescriptionExpanded((previous) => !previous)
//                   }
//                   className="mt-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
//                 >
//                   {descriptionExpanded ? 'Read less' : 'Read more'}
//                 </button>
//               )}
//             </div>
//           )}
//         </div>

//         {/* RIGHT: Details, Purchase and Reviews */}
//         <div className="min-w-0 space-y-5 lg:col-span-7">
//           {/* Product Information */}
//           <div>
//             <div className="flex flex-wrap items-center justify-between gap-2">
//               <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
//                 {product.category?.name || 'General Catalog'}
//               </span>

//               {product.brand?.name && (
//                 <span className="text-xs text-slate-500">
//                   Brand: {product.brand.name}
//                 </span>
//               )}
//             </div>

//             <div className="mt-2 flex items-start justify-between gap-3">
//               <h1 className="min-w-0 flex-1 text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
//                 {product.name}
//               </h1>

//               {reviewCount > 0 && (
//                 <div
//                   className="mt-1 flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
//                   aria-label={`${reviewAverage.toFixed(1)} out of 5 stars, ${reviewCount} reviews`}
//                   title={`${reviewCount.toLocaleString('en-IN')} Ratings & Reviews`}
//                 >
//                   <span>{reviewAverage.toFixed(1)}</span>
//                   <span className="text-amber-500">★</span>
//                   <span className="text-slate-500">
//                     ({reviewCount.toLocaleString('en-IN')})
//                   </span>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Price and Stock */}
//           <div className="border-b border-slate-200 pb-4">
//             <div className="flex flex-wrap items-baseline gap-2">
//               <span className="text-3xl font-extrabold text-slate-900">
//                 {price == null
//                   ? 'No seller available'
//                   : `₹${price.toFixed(2)}`}
//               </span>

//               {selectedListing && (
//                 <span className="text-xs text-slate-500">
//                   {selectedListing.gstApplicable
//                     ? `GST ${Number(selectedListing.gstRate).toFixed(2)}% ${
//                         selectedListing.priceIncludesGst
//                           ? 'included in price'
//                           : 'added at checkout'
//                       }`
//                     : 'No product GST configured'}
//                 </span>
//               )}
//             </div>

//             <div className="mt-2">
//               {sellersLoading ? (
//                 <span className="text-xs text-slate-500">
//                   Checking availability...
//                 </span>
//               ) : currentStock > 0 ? (
//                 <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
//                   In Stock · {currentStock} available
//                 </span>
//               ) : (
//                 <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
//                   Currently Out of Stock
//                 </span>
//               )}
//             </div>
//           </div>

//           {/* Size Selector */}
//           {product.variants?.length > 0 && (
//             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//               {sizeOptions.length > 0 && (
//                 <div className="min-w-0">
//                   <h3 className="mb-3 text-sm font-bold text-slate-900">
//                     Select Size
//                   </h3>

//                   <div className="flex flex-wrap gap-2">
//                     {sizeOptions.map((size) => {
//                       const matchingVariant =
//                         findMatchingVariant({
//                           size,
//                           color: selectedColor,
//                         }) ||
//                         findMatchingVariant({
//                           size,
//                           color: null,
//                         });

//                       const selected =
//                         String(selectedSize).toLowerCase() ===
//                         String(size).toLowerCase();

//                       const optionPrice = matchingVariant
//                         ? getVariantOptionPrice(matchingVariant)
//                         : null;

//                       const available = matchingVariant?.listings?.some(
//                         (listing) =>
//                           Number(
//                             listing.availableStock ?? listing.stock
//                           ) > 0
//                       );

//                       return (
//                         <button
//                           key={String(size)}
//                           type="button"
//                           onClick={() => handleSizeChange(size)}
//                           className={`min-w-16 rounded-lg border px-3 py-2 text-center transition ${
//                             selected
//                               ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
//                               : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'
//                           }`}
//                         >
//                           <span className="block text-sm font-bold">
//                             {size}
//                           </span>

//                           <span className="mt-1 block text-xs">
//                             {optionPrice == null
//                               ? 'No seller'
//                               : `From ₹${optionPrice.toFixed(2)}`}
//                           </span>

//                           {!available && (
//                             <span className="mt-1 block text-[10px] text-rose-600">
//                               Out of stock
//                             </span>
//                           )}
//                         </button>
//                       );
//                     })}
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Color Selector */}
//           {colorOptions.length > 0 && (
//             <div>
//               <h3 className="mb-3 text-sm font-bold text-slate-900">
//                 Select Color

//                 {selectedColor && (
//                   <span className="ml-2 font-normal text-slate-500">
//                     {selectedColor}
//                   </span>
//                 )}
//               </h3>

//               <div className="flex flex-wrap gap-2">
//                 {colorOptions.map((color) => {
//                   const matchingVariant =
//                     findMatchingVariant({
//                       size: selectedSize,
//                       color,
//                     }) ||
//                     findMatchingVariant({
//                       size: null,
//                       color,
//                     });

//                   const selected =
//                     String(selectedColor).toLowerCase() ===
//                     String(color).toLowerCase();

//                   const available = matchingVariant?.listings?.some(
//                     (listing) =>
//                       Number(listing.stock) > 0
//                   );

//                   return (
//                     <button
//                       key={String(color)}
//                       type="button"
//                       onClick={() => handleColorChange(color)}
//                       className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
//                         selected
//                           ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
//                           : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'
//                       }`}
//                     >
//                       {color}

//                       {!available && (
//                         <span className="ml-1 text-[10px] text-rose-600">
//                           (Out of stock)
//                         </span>
//                       )}
//                     </button>
//                   );
//                 })}
//               </div>
//             </div>
//           )}

//           {/* Generic Variant Selector */}
//           {product.variants?.length > 0 &&
//             sizeOptions.length === 0 &&
//             colorOptions.length === 0 && (
//               <div>
//                 <h3 className="mb-3 text-sm font-bold text-slate-900">
//                   Select Variant
//                 </h3>

//                 <div className="flex flex-wrap gap-2">
//                   {product.variants.map((variant) => {
//                     const selected =
//                       Number(selectedVariantId) ===
//                       Number(variant.id);

//                     const variantPrice =
//                       getVariantOptionPrice(variant);

//                     const available = variant.listings?.some(
//                       (listing) =>
//                         Number(
//                           listing.availableStock ?? listing.stock
//                         ) > 0
//                     );

//                     return (
//                       <button
//                         key={variant.id}
//                         type="button"
//                         onClick={() =>
//                           handleVariantChange(variant.id)
//                         }
//                         className={`min-w-20 rounded-lg border px-3 py-2 text-center transition ${
//                           selected
//                             ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
//                             : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'
//                         }`}
//                       >
//                         <span className="block text-sm font-bold">
//                           {variant.variantName}
//                         </span>

//                         <span className="mt-1 block text-xs">
//                           {variantPrice == null
//                             ? 'No seller'
//                             : `From ₹${variantPrice.toFixed(2)}`}
//                         </span>

//                         {!available && (
//                           <span className="mt-1 block text-[10px] text-rose-600">
//                             Out of stock
//                           </span>
//                         )}
//                       </button>
//                     );
//                   })}
//                 </div>
//               </div>
//             )}

//           {/* Product Highlights */}
//           {highlights.length > 0 && (
//             <div className="border-t border-slate-200 pt-4">
//               <h3 className="mb-3 text-sm font-bold text-slate-900">
//                 Product Highlights
//               </h3>

//               <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
//                 {highlights.map((item, index) => (
//                   <div
//                     key={`${item.name}-${index}`}
//                     className="rounded-lg bg-slate-50 p-3"
//                   >
//                     <p className="text-xs text-slate-500">
//                       {item.name}
//                     </p>

//                     <p className="mt-1 text-sm font-semibold text-slate-900">
//                       {item.value}
//                     </p>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Quantity */}
//           <div className="flex items-center gap-4 border-t border-slate-200 pt-4">
//             <span className="text-sm font-semibold text-slate-700">
//               Quantity
//             </span>

//             <div className="flex items-center overflow-hidden rounded-lg border border-slate-300">
//               <button
//                 type="button"
//                 onClick={() =>
//                   setQuantity((value) => Math.max(1, value - 1))
//                 }
//                 className="px-4 py-2 hover:bg-slate-100"
//               >
//                 −
//               </button>

//               <span className="min-w-10 text-center text-sm font-bold">
//                 {quantity}
//               </span>

//               <button
//                 type="button"
//                 disabled={quantity >= currentStock}
//                 onClick={() =>
//                   setQuantity((value) =>
//                     Math.min(currentStock, value + 1)
//                   )
//                 }
//                 className="px-4 py-2 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
//               >
//                 +
//               </button>
//             </div>
//           </div>

//           {/* Add to Cart and Wishlist */}
//           <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
//             <Button
//               onClick={handleAddToCart}
//               disabled={
//                 addingToCart ||
//                 sellersLoading ||
//                 !selectedListing ||
//                 currentStock <= 0
//               }
//               className="flex-1 justify-center py-2 text-sm font-semibold shadow-sm"
//             >
//               {addingToCart
//                 ? 'Adding...'
//                 : currentStock > 0
//                   ? '🛒 Add to Cart'
//                   : 'Out of Stock'}
//             </Button>

//             <button
//               type="button"
//               onClick={handleToggleWishlist}
//               disabled={togglingWishlist}
//               className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
//                 isInWishlist
//                   ? 'border-rose-300 bg-rose-50 text-rose-700'
//                   : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
//               }`}
//             >
//               {togglingWishlist
//                 ? 'Please wait...'
//                 : isInWishlist
//                   ? '♥ Wishlist'
//                   : '♡ Wishlist'}
//             </button>
//           </div>

//           {/* Sold By - retained instead of the seller dropdown */}
//           {selectedListing && (
//             <div className="rounded-xl border border-slate-200 bg-white p-4">
//               <h3 className="mb-3 text-sm font-bold text-slate-900">
//                 Sold By
//               </h3>

//               <div className="flex items-center justify-between gap-3">
//                 <div>
//                   <p className="font-bold text-slate-900">
//                     {selectedListing.shopName || 'Shop'}
//                   </p>

//                   <p className="mt-1 text-xs text-slate-500">
//                     Seller of this product
//                   </p>
//                 </div>

//                 <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-indigo-700">
//                   Shop #{selectedListing.shopId}
//                 </span>
//               </div>
//             </div>
//           )}

//           {/* Customer Reviews */}
//           <section className="space-y-4 border-t border-slate-200 pt-5">
//             <div>
//               <h2 className="text-lg font-bold text-slate-900">
//                 Product Ratings & Reviews
//               </h2>

//               <p className="mt-1 text-xs text-slate-500">
//                 Customer feedback for this product
//               </p>
//             </div>

//             {/* Rating Summary */}
//             <div className="rounded-xl border border-slate-200 bg-white p-4">
//               <div className="flex items-center gap-4">
//                 <div>
//                   <p className="text-4xl font-extrabold text-slate-900">
//                     {reviewCount > 0
//                       ? reviewAverage.toFixed(1)
//                       : '—'}
//                   </p>

//                   {reviewCount > 0 ? (
//                     <StarRating rating={reviewAverage} />
//                   ) : (
//                     <p className="text-xs text-slate-500">
//                       No ratings yet
//                     </p>
//                   )}

//                   <p className="mt-1 text-xs text-slate-500">
//                     {reviewCount} Reviews
//                   </p>
//                 </div>

//                 <div className="h-16 w-px bg-slate-200" />

//                 <div className="min-w-0 flex-1 space-y-1.5">
//                   {[5, 4, 3, 2, 1].map((rating) => {
//                     const count = ratingBreakdown[rating - 1];

//                     const percentage = reviewCount
//                       ? (count / reviewCount) * 100
//                       : 0;

//                     return (
//                       <div
//                         key={rating}
//                         className="flex items-center gap-2 text-xs"
//                       >
//                         <span className="w-3 text-slate-600">
//                           {rating}
//                         </span>

//                         <span className="text-amber-500">
//                           ★
//                         </span>

//                         <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
//                           <div
//                             className="h-full rounded-full bg-emerald-500"
//                             style={{
//                               width: `${percentage}%`,
//                             }}
//                           />
//                         </div>

//                         <span className="w-7 text-right text-slate-500">
//                           {count}
//                         </span>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             </div>

//             {/* Review Eligibility */}
//             {user?.role === 'customer' &&
//               reviewEligibility.loading && (
//                 <div
//                   className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"
//                   role="status"
//                 >
//                   Checking whether this product is eligible for review…
//                 </div>
//               )}

//             {user?.role === 'customer' &&
//               !reviewEligibility.loading &&
//               reviewEligibility.review && (
//                 <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 p-3 text-xs text-slate-700">
//                   <span className="font-semibold text-emerald-800">
//                     You reviewed this product:{' '}
//                     {'★'.repeat(
//                       Number(reviewEligibility.review.rating)
//                     )}
//                   </span>

//                   {!reviewEditing && (
//                     <button
//                       type="button"
//                       onClick={() => {
//                         setReviewForm({
//                           rating: Number(
//                             reviewEligibility.review.rating
//                           ),
//                           title:
//                             reviewEligibility.review.title || '',
//                           body:
//                             reviewEligibility.review.body || '',
//                         });

//                         setReviewError('');
//                         setReviewMessage('');
//                         setReviewEditing(true);
//                       }}
//                       className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
//                     >
//                       Edit Review
//                     </button>
//                   )}
//                 </div>
//               )}

//             {user?.role === 'customer' &&
//               !reviewEligibility.loading &&
//               !reviewEligibility.eligible &&
//               !reviewEligibility.review && (
//                 <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
//                   {reviewEligibility.reason ||
//                     'A delivered purchase is required before reviewing this product.'}
//                 </div>
//               )}

//             {/* Write a Review */}
//             {user?.role === 'customer' &&
//               (reviewEligibility.eligible || reviewEditing) && (
//                 <form
//                   onSubmit={handleReviewSubmit}
//                   className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
//                 >
//                   <h3 className="text-sm font-bold text-slate-900">
//                     {reviewEditing
//                       ? 'Edit Your Review'
//                       : 'Write a Review'}
//                   </h3>

//                   <div>
//                     <label className="mb-1 block text-xs font-semibold text-slate-700">
//                       Your Rating
//                     </label>

//                     <select
//                       value={reviewForm.rating}
//                       onChange={(event) =>
//                         setReviewForm({
//                           ...reviewForm,
//                           rating: Number(event.target.value),
//                         })
//                       }
//                       className="w-full rounded-lg border border-slate-300 p-2 text-sm"
//                     >
//                       {[5, 4, 3, 2, 1].map((rating) => (
//                         <option key={rating} value={rating}>
//                           {rating} / 5
//                         </option>
//                       ))}
//                     </select>
//                   </div>

//                   <div>
//                     <label className="mb-1 block text-xs font-semibold text-slate-700">
//                       Review Title (Optional)
//                     </label>

//                     <input
//                       value={reviewForm.title}
//                       onChange={(event) =>
//                         setReviewForm({
//                           ...reviewForm,
//                           title: event.target.value,
//                         })
//                       }
//                       maxLength={150}
//                       placeholder="Summarize your experience"
//                       className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500"
//                     />
//                   </div>

//                   <div>
//                     <label className="mb-1 block text-xs font-semibold text-slate-700">
//                       Your Review
//                     </label>

//                     <textarea
//                       required
//                       minLength={1}
//                       maxLength={1500}
//                       rows={3}
//                       value={reviewForm.body}
//                       onChange={(event) =>
//                         setReviewForm({
//                           ...reviewForm,
//                           body: event.target.value,
//                         })
//                       }
//                       placeholder="Share your experience with this product..."
//                       className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500"
//                     />
//                   </div>

//                   {reviewError && (
//                     <p className="text-xs text-rose-600">
//                       {reviewError}
//                     </p>
//                   )}

//                   {reviewMessage && (
//                     <p className="text-xs text-emerald-600">
//                       {reviewMessage}
//                     </p>
//                   )}

//                   <Button
//                     loading={reviewBusy}
//                     disabled={reviewBusy}
//                     className="w-full justify-center"
//                   >
//                     {reviewBusy
//                       ? reviewEditing
//                         ? 'Saving...'
//                         : 'Submitting...'
//                       : reviewEditing
//                         ? 'Save Changes'
//                         : 'Submit Review'}
//                   </Button>
//                 </form>
//               )}

//             {!user && (
//               <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
//                 <Link
//                   to="/customer/login"
//                   className="font-bold text-indigo-700"
//                 >
//                   Sign in
//                 </Link>
//                 {' '}to share your product experience.
//               </div>
//             )}

//             {/* Individual Reviews */}
//             <div className="space-y-3">
//               <div className="flex items-center justify-between">
//                 <h3 className="text-sm font-bold text-slate-900">
//                   Customer Reviews
//                 </h3>

//                 <span className="text-xs text-slate-500">
//                   {reviewCount} reviews
//                 </span>
//               </div>

//               {reviewsError && (
//                 <Alert variant="error">
//                   {reviewsError}
//                 </Alert>
//               )}

//               {reviewsLoading && reviews.length === 0 ? (
//                 <div
//                   className="py-4 text-center text-sm text-slate-500"
//                   role="status"
//                 >
//                   Loading reviews…
//                 </div>
//               ) : reviewCount === 0 && !reviewsError ? (
//                 <Card>
//                   <p className="text-center text-sm text-slate-500">
//                     No reviews yet. Be the first to review this product.
//                   </p>
//                 </Card>
//               ) : (
//                 reviews.map((review) => (
//                   <div
//                     key={review.id}
//                     className="rounded-xl border border-slate-200 bg-white p-4"
//                   >
//                     <div className="flex flex-wrap items-center justify-between gap-2">
//                       <span className="text-sm font-bold text-slate-900">
//                         {review.customer?.name || 'Customer'}
//                       </span>

//                       <div className="flex items-center gap-2">
//                         {review.verifiedPurchase && (
//                           <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
//                             Verified purchase
//                           </span>
//                         )}

//                         <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
//                           {Number(review.rating).toFixed(1)} ★
//                         </span>
//                       </div>
//                     </div>

//                     <p className="mt-1 text-xs text-slate-500">
//                       {review.createdAt
//                         ? new Date(
//                             review.createdAt
//                           ).toLocaleDateString('en-IN', {
//                             day: 'numeric',
//                             month: 'short',
//                             year: 'numeric',
//                           })
//                         : ''}
//                     </p>

//                     {review.title && (
//                       <p className="mt-3 text-sm font-bold text-slate-800">
//                         {review.title}
//                       </p>
//                     )}

//                     <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
//                       {review.body}
//                     </p>
//                   </div>
//                 ))
//               )}

//               {hasMoreReviews && (
//                 <Button
//                   type="button"
//                   variant="secondary"
//                   disabled={reviewsLoading}
//                   onClick={loadMoreReviews}
//                   className="w-full justify-center"
//                 >
//                   {reviewsLoading
//                     ? 'Loading…'
//                     : 'Load more reviews'}
//                 </Button>
//               )}
//             </div>
//           </section>
//         </div>
//       </div>

//       {/* People Also Viewed */}
//       <section className="border-t border-slate-200 pt-6">
//         <div className="mb-4">
//           <h2 className="text-xl font-bold text-slate-900">
//             People also viewed
//           </h2>

//           <p className="mt-1 text-sm text-slate-500">
//             More products from the same category
//           </p>
//         </div>

//         {relatedLoading ? (
//           <div className="py-8 text-center">
//             <Spinner />
//           </div>
//         ) : relatedProducts.length > 0 ? (
//           <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
//             {relatedProducts.map((item) => {
//               const image = getRelatedImage(item);
//               const relatedPrice = getRelatedPrice(item);
//               const rating = relatedRatings[item.id];

//               return (
//                 <Link
//                   key={item.id}
//                   to={`/products/${item.id}`}
//                   className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md"
//                 >
//                   <div className="flex aspect-square items-center justify-center overflow-hidden bg-slate-50 p-3">
//                     {image ? (
//                       <img
//                         src={image}
//                         alt={item.name}
//                         loading="lazy"
//                         className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
//                       />
//                     ) : (
//                       <span className="text-xs text-slate-400">
//                         No Image Available
//                       </span>
//                     )}
//                   </div>

//                   <div className="space-y-2 p-3">
//                     <h3 className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-800 group-hover:text-indigo-700">
//                       {item.name}
//                     </h3>

//                     {relatedPrice > 0 && (
//                       <p className="text-base font-bold text-slate-900">
//                         ₹{relatedPrice.toFixed(2)}
//                       </p>
//                     )}

//                     {rating?.count > 0 && (
//                       <div className="flex flex-wrap items-center gap-1 text-xs">
//                         <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-700">
//                           {rating.average.toFixed(1)} ★
//                         </span>

//                         <span className="text-slate-500">
//                           ({rating.count.toLocaleString('en-IN')})
//                         </span>
//                       </div>
//                     )}

//                     <span className="block pt-1 text-xs font-semibold text-indigo-600">
//                       View Product →
//                     </span>
//                   </div>
//                 </Link>
//               );
//             })}
//           </div>
//         ) : (
//           <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
//             No related products available at the moment.
//           </p>
//         )}
//       </section>
//     </div>
//   );
// }


import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Alert, Button, Card, Spinner } from '../../components/ui.jsx';

const normalizeAttributeName = (name = '') =>
  String(name).toLowerCase().replace(/[\s_-]/g, '');

const getVariantAttribute = (variant, names) => {
  const values = variant?.variantValues || [];

  const match = values.find((item) =>
    names.includes(normalizeAttributeName(item.attribute?.name))
  );

  return match?.attributeValue?.value ?? null;
};

const getVariantSize = (variant) =>
  getVariantAttribute(variant, ['size', 'packsize', 'weight']) ||
  variant?.variantName ||
  null;

const getVariantColor = (variant) =>
  getVariantAttribute(variant, ['color', 'colour']);

const getVariantOptionPrice = (variant) => {
  const listings = (variant?.listings || []).filter(
    (item) =>
      item.retailPrice != null &&
      Number(item.retailPrice) > 0 &&
      Number(item.availableStock ?? item.stock ?? 0) > 0
  );

  return listings.length
    ? Math.min(...listings.map((item) => Number(item.retailPrice)))
    : null;
};

export default function CustomerProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [sellerListings, setSellerListings] = useState([]);
  const [sellersLoading, setSellersLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const [addingToCart, setAddingToCart] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewAverage, setReviewAverage] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    body: '',
  });

  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewEditing, setReviewEditing] = useState(false);

  const [reviewEligibility, setReviewEligibility] = useState({
    loading: false,
    eligible: false,
    orderId: null,
    review: null,
    reason: '',
  });

  const [activeImage, setActiveImage] = useState(null);

  // Related products
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedRatings, setRelatedRatings] = useState({});
  const [relatedLoading, setRelatedLoading] = useState(false);

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Check review eligibility
  useEffect(() => {
    let mounted = true;

    if (!user || user.role !== 'customer') {
      setReviewEligibility({
        loading: false,
        eligible: false,
        orderId: null,
        review: null,
        reason: '',
      });

      return () => {
        mounted = false;
      };
    }

    setReviewEligibility((current) => ({
      ...current,
      loading: true,
    }));

    api.get(`/customer/products/${id}/review-eligibility`)
      .then((result) => {
        if (mounted) {
          setReviewEligibility({
            loading: false,
            ...result,
          });
        }
      })
      .catch((err) => {
        if (mounted) {
          setReviewEligibility({
            loading: false,
            eligible: false,
            orderId: null,
            review: null,
            reason:
              err.message || 'Unable to check review eligibility.',
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, [id, user]);

  // Load product, reviews and wishlist
  useEffect(() => {
    let mounted = true;

    async function loadProduct() {
      setLoading(true);
      setError('');

      try {
        const res = await api.get(`/store/products/${id}`);

        if (!mounted) return;

        const prod = res.product;
        setProduct(prod);

        const sortedImages = [...(prod.images || [])].sort(
          (a, b) =>
            Number(Boolean(b.isPrimary)) -
              Number(Boolean(a.isPrimary)) ||
            Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
        );

        setActiveImage(sortedImages[0]?.imageUrl || null);

        if (prod.variants?.length) {
          const firstVariant =
            prod.variants.find((variant) => variant.listings?.length) ||
            prod.variants[0];

          setSelectedVariantId(firstVariant.id);

          setSelectedShopId(
            firstVariant.listings?.[0]?.shopId || null
          );
        } else {
          setSelectedVariantId(null);
          setSelectedShopId(null);
        }

        setQuantity(1);
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Unable to load product.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    async function loadReviews() {
      setReviewsLoading(true);
      setReviewsError('');

      try {
        const data = await api.get(
          `/store/products/${id}/reviews?page=1&pageSize=10`
        );

        if (mounted) {
          setReviews(data.items || []);
          setReviewAverage(Number(data.average || 0));
          setReviewCount(Number(data.count || 0));
          setRatingDistribution(data.distribution || []);
          setReviewPage(Number(data.page || 1));

          setHasMoreReviews(
            (data.items || []).length < Number(data.count || 0)
          );
        }
      } catch (err) {
        if (mounted) {
          setReviews([]);
          setReviewAverage(0);
          setReviewCount(0);
          setRatingDistribution([]);
          setReviewsError(
            err.message || 'Unable to load product reviews.'
          );
        }
      } finally {
        if (mounted) setReviewsLoading(false);
      }
    }

    loadProduct();
    loadReviews();

    if (user) {
      api.get('/customer/wishlist')
        .then((res) => {
          if (!mounted) return;

          setIsInWishlist(
            (res.items || []).some(
              (item) => Number(item.productId) === Number(id)
            )
          );
        })
        .catch(() => {});
    } else {
      setIsInWishlist(false);
    }

    return () => {
      mounted = false;
    };
  }, [id, user]);

  // Automatically select the first available seller for the selected variant.
  // No seller dropdown is displayed to the customer.
  useEffect(() => {
    let mounted = true;

    if (!selectedVariantId) {
      setSellerListings([]);
      setSelectedShopId(null);
      setSellersLoading(false);

      return () => {
        mounted = false;
      };
    }

    setSellerListings([]);
    setSelectedShopId(null);
    setSellersLoading(true);

    api.get(
      `/store/products/${id}?variantId=${encodeURIComponent(selectedVariantId)}`
    )
      .then((response) => {
        if (!mounted) return;

        const items = (response.sellers || []).map((listing) => ({
          ...listing,
          id: listing.listingId ?? listing.id,
          retailPrice: Number(
            listing.sellingPrice ?? listing.retailPrice
          ),
          stock: Number(
            listing.availableStock ?? listing.stock
          ),
          availableStock: Number(
            listing.availableStock ?? listing.stock
          ),
          gstRate: Number(
            listing.gstPercentage ?? listing.gstRate ?? 0
          ),
        }));

        // Automatically choose the first available seller.
        setSellerListings(items);
        setSelectedShopId(
          items[0] ? Number(items[0].shopId) : null
        );
      })
      .catch((err) => {
        if (mounted) {
          setSellerListings([]);
          setSelectedShopId(null);
          setError(
            err.message || 'Unable to load available seller.'
          );
        }
      })
      .finally(() => {
        if (mounted) setSellersLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, selectedVariantId]);

  // Sort gallery images: primary image first
  const productImages = useMemo(() => {
    return [...(product?.images || [])].sort(
      (a, b) =>
        Number(Boolean(b.isPrimary)) -
          Number(Boolean(a.isPrimary)) ||
        Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
    );
  }, [product]);

  const activeImageIndex = productImages.findIndex(
    (image) => image.imageUrl === activeImage
  );

  const changeGalleryImage = (direction) => {
    if (productImages.length < 2) return;

    const currentIndex =
      activeImageIndex >= 0 ? activeImageIndex : 0;

    const nextIndex =
      (currentIndex + direction + productImages.length) %
      productImages.length;

    setActiveImage(productImages[nextIndex].imageUrl);
  };

  // Load related products when the current product changes
  useEffect(() => {
    let mounted = true;

    async function loadRelatedProducts() {
      if (!product?.id || !product?.categoryId) {
        setRelatedProducts([]);
        return;
      }

      setRelatedLoading(true);

      try {
        const response = await api.get(
          `/store/products?categoryId=${encodeURIComponent(
            product.categoryId
          )}&page=1&pageSize=9`
        );

        if (!mounted) return;

        const items = Array.isArray(response)
          ? response
          : response.items ||
            response.products ||
            response.rows ||
            response.data?.items ||
            response.data?.products ||
            [];

        const filtered = items
          .filter(
            (item) =>
              Number(item.id) !== Number(product.id) &&
              item.isActive !== false
          )
          .slice(0, 8);

        setRelatedProducts(filtered);

        const ratingResults = await Promise.allSettled(
          filtered.map(async (item) => {
            const result = await api.get(
              `/store/products/${item.id}/reviews`
            );

            return {
              id: item.id,
              average: Number(result.average || 0),
              count: Number(
                result.count ?? result.items?.length ?? 0
              ),
            };
          })
        );

        if (!mounted) return;

        const ratingMap = {};

        ratingResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            ratingMap[result.value.id] = {
              average: result.value.average,
              count: result.value.count,
            };
          }
        });

        setRelatedRatings(ratingMap);
      } catch {
        if (mounted) {
          setRelatedProducts([]);
          setRelatedRatings({});
        }
      } finally {
        if (mounted) setRelatedLoading(false);
      }
    }

    loadRelatedProducts();

    return () => {
      mounted = false;
    };
  }, [product?.id, product?.categoryId]);

  const selectedVariant = product?.variants?.find(
    (variant) => Number(variant.id) === Number(selectedVariantId)
  );

  const selectedListing =
    sellerListings.find(
      (listing) => Number(listing.shopId) === Number(selectedShopId)
    ) || sellerListings[0] || null;

  const price = selectedListing
    ? Number(selectedListing.retailPrice)
    : null;

  const currentStock = Number(
    selectedListing?.availableStock ??
    selectedListing?.stock ??
    0
  );

  // Derive available sizes from product variants.
  const sizeOptions = useMemo(() => {
    const variants = product?.variants || [];
    const values = [];

    variants.forEach((variant) => {
      const size = getVariantSize(variant);

      if (
        size != null &&
        !values.some(
          (item) =>
            String(item).toLowerCase() ===
            String(size).toLowerCase()
        )
      ) {
        values.push(size);
      }
    });

    return values;
  }, [product]);

  // Derive available colors from product variants.
  const colorOptions = useMemo(() => {
    const variants = product?.variants || [];
    const values = [];

    variants.forEach((variant) => {
      const color = getVariantColor(variant);

      if (
        color != null &&
        !values.some(
          (item) =>
            String(item).toLowerCase() ===
            String(color).toLowerCase()
        )
      ) {
        values.push(color);
      }
    });

    return values;
  }, [product]);

  const selectedSize = selectedVariant
    ? getVariantSize(selectedVariant)
    : null;

  const selectedColor = selectedVariant
    ? getVariantColor(selectedVariant)
    : null;

  // Find the correct variant for selected size and color.
  const findMatchingVariant = ({ size, color }) => {
    const variants = product?.variants || [];

    return (
      variants.find((variant) => {
        const variantSize = getVariantSize(variant);
        const variantColor = getVariantColor(variant);

        const sizeMatches =
          size == null ||
          String(variantSize).toLowerCase() ===
            String(size).toLowerCase();

        const colorMatches =
          color == null ||
          String(variantColor).toLowerCase() ===
            String(color).toLowerCase();

        return sizeMatches && colorMatches;
      }) || null
    );
  };

  const ratingBreakdown = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];

    ratingDistribution.forEach((row) => {
      const rating = Number(row.rating);

      if (rating >= 1 && rating <= 5) {
        counts[rating - 1] = Number(row.count || 0);
      }
    });

    return counts;
  }, [ratingDistribution]);

  // Keep Size and Color as selectors.
  // Keep Pack Size and other attributes in Product Highlights.
  const highlights = useMemo(() => {
    const values = selectedVariant?.variantValues || [];

    return values
      .map((item) => ({
        name: item.attribute?.name,
        value: item.attributeValue?.value,
      }))
      .filter((item) => {
        if (!item.name || !item.value) return false;

        const attributeName = normalizeAttributeName(item.name);

        return ![
          'size',
          'color',
          'colour',
        ].includes(attributeName);
      });
  }, [selectedVariant]);

  const StarRating = ({ rating }) => {
    const rounded = Math.max(
      0,
      Math.min(5, Math.round(Number(rating) || 0))
    );

    return (
      <span className="whitespace-nowrap text-amber-500">
        {'★'.repeat(rounded)}
        <span className="text-slate-300">
          {'★'.repeat(5 - rounded)}
        </span>
      </span>
    );
  };

  // Get a related product's actual available selling price.
  const getRelatedPrice = (item) => {
    const listings =
      item.sellerListings ||
      item.listings ||
      item.variants?.flatMap(
        (variant) => variant.listings || []
      ) ||
      [];

    const availableListing = listings.find(
      (listing) =>
        listing.retailPrice != null &&
        Number(listing.retailPrice) > 0 &&
        Number(
          listing.availableStock ?? listing.stock ?? 0
        ) > 0
    );

    return availableListing
      ? Number(availableListing.retailPrice)
      : null;
  };

  const getRelatedImage = (item) => {
    const images = [...(item.images || [])].sort(
      (a, b) =>
        Number(Boolean(b.isPrimary)) -
          Number(Boolean(a.isPrimary)) ||
        Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
    );

    return images[0]?.imageUrl || null;
  };

  const handleVariantChange = (variantId) => {
    const variant = product?.variants?.find(
      (item) => Number(item.id) === Number(variantId)
    );

    if (!variant) return;

    setSelectedVariantId(variant.id);
    setSellerListings([]);
    setSelectedShopId(null);
    setQuantity(1);
    setError('');
  };

  const handleSizeChange = (size) => {
    const matchingVariant =
      findMatchingVariant({
        size,
        color: selectedColor,
      }) ||
      findMatchingVariant({
        size,
        color: null,
      });

    if (matchingVariant) {
      handleVariantChange(matchingVariant.id);
    }
  };

  const handleColorChange = (color) => {
    const matchingVariant =
      findMatchingVariant({
        size: selectedSize,
        color,
      }) ||
      findMatchingVariant({
        size: null,
        color,
      });

    if (matchingVariant) {
      handleVariantChange(matchingVariant.id);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/customer/login');
      return;
    }

    if (!selectedVariantId || !selectedShopId || !selectedListing) {
      setError('No available seller for this product option.');
      return;
    }

    if (currentStock <= 0) {
      setError('This product is currently out of stock.');
      return;
    }

    if (quantity > currentStock) {
      setError(`Only ${currentStock} items are available.`);
      return;
    }

    setAddingToCart(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/customer/cart', {
        shopId: Number(selectedShopId),
        sellerListingId: Number(selectedListing.id),
        productId: product.id,
        productVariantId: Number(selectedVariantId),
        quantity: Number(quantity),
      });

      window.dispatchEvent(
        new Event('customer:cart-updated')
      );

      setSuccess('Product successfully added to your cart.');
    } catch (err) {
      setError(
        err.message || 'Unable to add product to cart.'
      );
    } finally {
      setAddingToCart(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      navigate('/customer/login');
      return;
    }

    setTogglingWishlist(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/customer/wishlist', {
        productId: product.id,
      });

      setIsInWishlist(res.added);

      setSuccess(
        res.message ||
          (res.added
            ? 'Added to wishlist!'
            : 'Removed from wishlist.')
      );
    } catch (err) {
      setError(
        err.message || 'Unable to update wishlist.'
      );
    } finally {
      setTogglingWishlist(false);
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (
      !reviewEditing &&
      (!reviewEligibility.eligible || !reviewEligibility.orderId)
    ) {
      setReviewError(
        'A delivered purchase is required before reviewing this product.'
      );
      return;
    }

    if (reviewEditing && !reviewEligibility.review?.id) {
      setReviewError(
        'Your saved review could not be found. Refresh the page and try again.'
      );
      return;
    }

    setReviewBusy(true);
    setReviewError('');
    setReviewMessage('');

    try {
      const result = reviewEditing
        ? await api.put(
            `/customer/reviews/${reviewEligibility.review.id}`,
            reviewForm
          )
        : await api.post(
            `/customer/products/${id}/reviews`,
            {
              ...reviewForm,
              orderId: reviewEligibility.orderId,
            }
          );

      setReviewMessage(
        result.message ||
          (reviewEditing
            ? 'Your review has been updated.'
            : 'Your review has been submitted.')
      );

      setReviewEditing(false);

      setReviewForm({
        rating: 5,
        title: '',
        body: '',
      });

      try {
        const [reviewData, eligibility] = await Promise.all([
          api.get(
            `/store/products/${id}/reviews?page=1&pageSize=10`
          ),
          api.get(
            `/customer/products/${id}/review-eligibility`
          ),
        ]);

        setReviews(reviewData.items || []);
        setReviewAverage(Number(reviewData.average || 0));
        setReviewCount(Number(reviewData.count || 0));
        setRatingDistribution(
          reviewData.distribution || []
        );
        setReviewPage(Number(reviewData.page || 1));

        setHasMoreReviews(
          (reviewData.items || []).length <
            Number(reviewData.count || 0)
        );

        setReviewEligibility({
          loading: false,
          ...eligibility,
        });
      } catch (refreshError) {
        setReviewError(
          `Your review was saved, but the latest review data could not be refreshed: ${
            refreshError.message || 'Please reload the page.'
          }`
        );
      }
    } catch (err) {
      setReviewError(
        err.message || 'Unable to submit review.'
      );
    } finally {
      setReviewBusy(false);
    }
  };

  const loadMoreReviews = async () => {
    if (reviewsLoading || !hasMoreReviews) return;

    setReviewsLoading(true);
    setReviewsError('');

    try {
      const nextPage = reviewPage + 1;

      const data = await api.get(
        `/store/products/${id}/reviews?page=${nextPage}&pageSize=10`
      );

      const items = data.items || [];

      setReviews((current) => [...current, ...items]);
      setReviewPage(Number(data.page || nextPage));

      setHasMoreReviews(
        reviews.length + items.length <
          Number(data.count || reviewCount)
      );
    } catch (err) {
      setReviewsError(
        err.message || 'Unable to load more reviews.'
      );
    } finally {
      setReviewsLoading(false);
    }
  };

  if (loading) return <Spinner />;

  if (!product) {
    return (
      <Alert variant="error">
        {error || 'Product not found.'}
      </Alert>
    );
  }

  return (
    <div className="mx-auto w-full max-w-none space-y-5 pb-10">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-indigo-600">
          Home
        </Link>

        <span>/</span>

        <Link to="/products" className="hover:text-indigo-600">
          Products
        </Link>

        <span>/</span>

        <span className="font-semibold text-slate-800">
          {product.name}
        </span>
      </nav>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Main Layout */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* LEFT: Product Images */}
        <div className="space-y-3 lg:col-span-5">
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
            {activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-sm text-slate-400">
                No Image Available
              </span>
            )}

            {productImages.length > 1 && (
              <button
                type="button"
                onClick={() => changeGalleryImage(-1)}
                aria-label="Previous product image"
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-lg shadow-md transition hover:bg-white"
              >
                &#10094;
              </button>
            )}

            {productImages.length > 1 && (
              <button
                type="button"
                onClick={() => changeGalleryImage(1)}
                aria-label="Next product image"
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-lg shadow-md transition hover:bg-white"
              >
                &#10095;
              </button>
            )}

            {productImages.length > 1 && (
              <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-white">
                {activeImageIndex >= 0
                  ? activeImageIndex + 1
                  : 1}
                {' / '}
                {productImages.length}
              </span>
            )}
          </div>

          {/* Clickable thumbnails */}
          {productImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {productImages.map((img, index) => (
                <button
                  key={img.id || `${img.imageUrl}-${index}`}
                  type="button"
                  onClick={() => setActiveImage(img.imageUrl)}
                  aria-label={`View product image ${index + 1}`}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${
                    activeImage === img.imageUrl
                      ? 'border-indigo-600'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <img
                    src={img.imageUrl}
                    alt={`${product.name} ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Product Description - Below Product Image */}
          {product.description && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-base font-bold text-slate-900">
                Product Description
              </h2>

              <p className="whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                {descriptionExpanded
                  ? product.description
                  : product.description.length > 220
                    ? `${product.description.slice(0, 220).trimEnd()}...`
                    : product.description}
              </p>

              {product.description.length > 220 && (
                <button
                  type="button"
                  onClick={() =>
                    setDescriptionExpanded((previous) => !previous)
                  }
                  className="mt-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  {descriptionExpanded ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Details, Purchase and Reviews */}
        <div className="min-w-0 space-y-5 lg:col-span-7">
          {/* Product Information */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                {product.category?.name || 'General Catalog'}
              </span>

              {product.brand?.name && (
                <span className="text-xs text-slate-500">
                  Brand: {product.brand.name}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-start justify-between gap-3">
              <h1 className="min-w-0 flex-1 text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
                {product.name}
              </h1>

              {reviewCount > 0 && (
                <div
                  className="mt-1 flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                  aria-label={`${reviewAverage.toFixed(1)} out of 5 stars, ${reviewCount} reviews`}
                  title={`${reviewCount.toLocaleString('en-IN')} Ratings & Reviews`}
                >
                  <span>{reviewAverage.toFixed(1)}</span>
                  <span className="text-amber-500">★</span>
                  <span className="text-slate-500">
                    ({reviewCount.toLocaleString('en-IN')})
                  </span>
                </div>
              )}
            </div>

            {/* NEW: Short Product Description */}
            {product.shortDescription?.trim() && (
              <p className="mt-3 max-w-3xl whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                {product.shortDescription}
              </p>
            )}
          </div>

          {/* Price and Stock */}
          <div className="border-b border-slate-200 pb-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {price == null
                  ? 'No seller available'
                  : `₹${price.toFixed(2)}`}
              </span>

              {selectedListing && (
                <span className="text-xs text-slate-500">
                  {selectedListing.gstApplicable
                    ? `GST ${Number(selectedListing.gstRate).toFixed(2)}% ${
                        selectedListing.priceIncludesGst
                          ? 'included in price'
                          : 'added at checkout'
                      }`
                    : 'No product GST configured'}
                </span>
              )}
            </div>

            <div className="mt-2">
              {sellersLoading ? (
                <span className="text-xs text-slate-500">
                  Checking availability...
                </span>
              ) : currentStock > 0 ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  In Stock · {currentStock} available
                </span>
              ) : (
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  Currently Out of Stock
                </span>
              )}
            </div>
          </div>

          {/* Size Selector */}
          {product.variants?.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sizeOptions.length > 0 && (
                <div className="min-w-0">
                  <h3 className="mb-3 text-sm font-bold text-slate-900">
                    Select Size
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.map((size) => {
                      const matchingVariant =
                        findMatchingVariant({
                          size,
                          color: selectedColor,
                        }) ||
                        findMatchingVariant({
                          size,
                          color: null,
                        });

                      const selected =
                        String(selectedSize).toLowerCase() ===
                        String(size).toLowerCase();

                      const optionPrice = matchingVariant
                        ? getVariantOptionPrice(matchingVariant)
                        : null;

                      const available = matchingVariant?.listings?.some(
                        (listing) =>
                          Number(
                            listing.availableStock ?? listing.stock
                          ) > 0
                      );

                      return (
                        <button
                          key={String(size)}
                          type="button"
                          onClick={() => handleSizeChange(size)}
                          className={`min-w-16 rounded-lg border px-3 py-2 text-center transition ${
                            selected
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'
                          }`}
                        >
                          <span className="block text-sm font-bold">
                            {size}
                          </span>

                          <span className="mt-1 block text-xs">
                            {optionPrice == null
                              ? 'No seller'
                              : `From ₹${optionPrice.toFixed(2)}`}
                          </span>

                          {!available && (
                            <span className="mt-1 block text-[10px] text-rose-600">
                              Out of stock
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Color Selector */}
          {colorOptions.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-bold text-slate-900">
                Select Color

                {selectedColor && (
                  <span className="ml-2 font-normal text-slate-500">
                    {selectedColor}
                  </span>
                )}
              </h3>

              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => {
                  const matchingVariant =
                    findMatchingVariant({
                      size: selectedSize,
                      color,
                    }) ||
                    findMatchingVariant({
                      size: null,
                      color,
                    });

                  const selected =
                    String(selectedColor).toLowerCase() ===
                    String(color).toLowerCase();

                  const available = matchingVariant?.listings?.some(
                    (listing) =>
                      Number(listing.stock) > 0
                  );

                  return (
                    <button
                      key={String(color)}
                      type="button"
                      onClick={() => handleColorChange(color)}
                      className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                        selected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      {color}

                      {!available && (
                        <span className="ml-1 text-[10px] text-rose-600">
                          (Out of stock)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generic Variant Selector */}
          {product.variants?.length > 0 &&
            sizeOptions.length === 0 &&
            colorOptions.length === 0 && (
              <div>
                <h3 className="mb-3 text-sm font-bold text-slate-900">
                  Select Variant
                </h3>

                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const selected =
                      Number(selectedVariantId) ===
                      Number(variant.id);

                    const variantPrice =
                      getVariantOptionPrice(variant);

                    const available = variant.listings?.some(
                      (listing) =>
                        Number(
                          listing.availableStock ?? listing.stock
                        ) > 0
                    );

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() =>
                          handleVariantChange(variant.id)
                        }
                        className={`min-w-20 rounded-lg border px-3 py-2 text-center transition ${
                          selected
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        <span className="block text-sm font-bold">
                          {variant.variantName}
                        </span>

                        <span className="mt-1 block text-xs">
                          {variantPrice == null
                            ? 'No seller'
                            : `From ₹${variantPrice.toFixed(2)}`}
                        </span>

                        {!available && (
                          <span className="mt-1 block text-[10px] text-rose-600">
                            Out of stock
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Product Highlights */}
          {highlights.length > 0 && (
            <div className="border-t border-slate-200 pt-4">
              <h3 className="mb-3 text-sm font-bold text-slate-900">
                Product Highlights
              </h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {highlights.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="rounded-lg bg-slate-50 p-3"
                  >
                    <p className="text-xs text-slate-500">
                      {item.name}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4 border-t border-slate-200 pt-4">
            <span className="text-sm font-semibold text-slate-700">
              Quantity
            </span>

            <div className="flex items-center overflow-hidden rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() =>
                  setQuantity((value) => Math.max(1, value - 1))
                }
                className="px-4 py-2 hover:bg-slate-100"
              >
                −
              </button>

              <span className="min-w-10 text-center text-sm font-bold">
                {quantity}
              </span>

              <button
                type="button"
                disabled={quantity >= currentStock}
                onClick={() =>
                  setQuantity((value) =>
                    Math.min(currentStock, value + 1)
                  )
                }
                className="px-4 py-2 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart and Wishlist */}
          <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
            <Button
              onClick={handleAddToCart}
              disabled={
                addingToCart ||
                sellersLoading ||
                !selectedListing ||
                currentStock <= 0
              }
              className="flex-1 justify-center py-2 text-sm font-semibold shadow-sm"
            >
              {addingToCart
                ? 'Adding...'
                : currentStock > 0
                  ? '🛒 Add to Cart'
                  : 'Out of Stock'}
            </Button>

            <button
              type="button"
              onClick={handleToggleWishlist}
              disabled={togglingWishlist}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                isInWishlist
                  ? 'border-rose-300 bg-rose-50 text-rose-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {togglingWishlist
                ? 'Please wait...'
                : isInWishlist
                  ? '♥ Wishlist'
                  : '♡ Wishlist'}
            </button>
          </div>

          {/* Sold By - retained instead of the seller dropdown */}
          {selectedListing && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-900">
                Sold By
              </h3>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">
                    {selectedListing.shopName || 'Shop'}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Seller of this product
                  </p>
                </div>

                <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                  Shop #{selectedListing.shopId}
                </span>
              </div>
            </div>
          )}

          {/* Customer Reviews */}
          <section className="space-y-4 border-t border-slate-200 pt-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Product Ratings & Reviews
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Customer feedback for this product
              </p>
            </div>

            {/* Rating Summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-4xl font-extrabold text-slate-900">
                    {reviewCount > 0
                      ? reviewAverage.toFixed(1)
                      : '—'}
                  </p>

                  {reviewCount > 0 ? (
                    <StarRating rating={reviewAverage} />
                  ) : (
                    <p className="text-xs text-slate-500">
                      No ratings yet
                    </p>
                  )}

                  <p className="mt-1 text-xs text-slate-500">
                    {reviewCount} Reviews
                  </p>
                </div>

                <div className="h-16 w-px bg-slate-200" />

                <div className="min-w-0 flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = ratingBreakdown[rating - 1];

                    const percentage = reviewCount
                      ? (count / reviewCount) * 100
                      : 0;

                    return (
                      <div
                        key={rating}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="w-3 text-slate-600">
                          {rating}
                        </span>

                        <span className="text-amber-500">
                          ★
                        </span>

                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>

                        <span className="w-7 text-right text-slate-500">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Review Eligibility */}
            {user?.role === 'customer' &&
              reviewEligibility.loading && (
                <div
                  className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"
                  role="status"
                >
                  Checking whether this product is eligible for review…
                </div>
              )}

            {user?.role === 'customer' &&
              !reviewEligibility.loading &&
              reviewEligibility.review && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 p-3 text-xs text-slate-700">
                  <span className="font-semibold text-emerald-800">
                    You reviewed this product:{' '}
                    {'★'.repeat(
                      Number(reviewEligibility.review.rating)
                    )}
                  </span>

                  {!reviewEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setReviewForm({
                          rating: Number(
                            reviewEligibility.review.rating
                          ),
                          title:
                            reviewEligibility.review.title || '',
                          body:
                            reviewEligibility.review.body || '',
                        });

                        setReviewError('');
                        setReviewMessage('');
                        setReviewEditing(true);
                      }}
                      className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
                    >
                      Edit Review
                    </button>
                  )}
                </div>
              )}

            {user?.role === 'customer' &&
              !reviewEligibility.loading &&
              !reviewEligibility.eligible &&
              !reviewEligibility.review && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  {reviewEligibility.reason ||
                    'A delivered purchase is required before reviewing this product.'}
                </div>
              )}

            {/* Write a Review */}
            {user?.role === 'customer' &&
              (reviewEligibility.eligible || reviewEditing) && (
                <form
                  onSubmit={handleReviewSubmit}
                  className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
                >
                  <h3 className="text-sm font-bold text-slate-900">
                    {reviewEditing
                      ? 'Edit Your Review'
                      : 'Write a Review'}
                  </h3>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Your Rating
                    </label>

                    <select
                      value={reviewForm.rating}
                      onChange={(event) =>
                        setReviewForm({
                          ...reviewForm,
                          rating: Number(event.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                    >
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <option key={rating} value={rating}>
                          {rating} / 5
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Review Title (Optional)
                    </label>

                    <input
                      value={reviewForm.title}
                      onChange={(event) =>
                        setReviewForm({
                          ...reviewForm,
                          title: event.target.value,
                        })
                      }
                      maxLength={150}
                      placeholder="Summarize your experience"
                      className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Your Review
                    </label>

                    <textarea
                      required
                      minLength={1}
                      maxLength={1500}
                      rows={3}
                      value={reviewForm.body}
                      onChange={(event) =>
                        setReviewForm({
                          ...reviewForm,
                          body: event.target.value,
                        })
                      }
                      placeholder="Share your experience with this product..."
                      className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  {reviewError && (
                    <p className="text-xs text-rose-600">
                      {reviewError}
                    </p>
                  )}

                  {reviewMessage && (
                    <p className="text-xs text-emerald-600">
                      {reviewMessage}
                    </p>
                  )}

                  <Button
                    loading={reviewBusy}
                    disabled={reviewBusy}
                    className="w-full justify-center"
                  >
                    {reviewBusy
                      ? reviewEditing
                        ? 'Saving...'
                        : 'Submitting...'
                      : reviewEditing
                        ? 'Save Changes'
                        : 'Submit Review'}
                  </Button>
                </form>
              )}

            {!user && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <Link
                  to="/customer/login"
                  className="font-bold text-indigo-700"
                >
                  Sign in
                </Link>
                {' '}to share your product experience.
              </div>
            )}

            {/* Individual Reviews */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Customer Reviews
                </h3>

                <span className="text-xs text-slate-500">
                  {reviewCount} reviews
                </span>
              </div>

              {reviewsError && (
                <Alert variant="error">
                  {reviewsError}
                </Alert>
              )}

              {reviewsLoading && reviews.length === 0 ? (
                <div
                  className="py-4 text-center text-sm text-slate-500"
                  role="status"
                >
                  Loading reviews…
                </div>
              ) : reviewCount === 0 && !reviewsError ? (
                <Card>
                  <p className="text-center text-sm text-slate-500">
                    No reviews yet. Be the first to review this product.
                  </p>
                </Card>
              ) : (
                reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {review.customer?.name || 'Customer'}
                      </span>

                      <div className="flex items-center gap-2">
                        {review.verifiedPurchase && (
                          <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            Verified purchase
                          </span>
                        )}

                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                          {Number(review.rating).toFixed(1)} ★
                        </span>
                      </div>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {review.createdAt
                        ? new Date(
                            review.createdAt
                          ).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : ''}
                    </p>

                    {review.title && (
                      <p className="mt-3 text-sm font-bold text-slate-800">
                        {review.title}
                      </p>
                    )}

                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                      {review.body}
                    </p>
                  </div>
                ))
              )}

              {hasMoreReviews && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={reviewsLoading}
                  onClick={loadMoreReviews}
                  className="w-full justify-center"
                >
                  {reviewsLoading
                    ? 'Loading…'
                    : 'Load more reviews'}
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* People Also Viewed */}
      <section className="border-t border-slate-200 pt-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            People also viewed
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            More products from the same category
          </p>
        </div>

        {relatedLoading ? (
          <div className="py-8 text-center">
            <Spinner />
          </div>
        ) : relatedProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {relatedProducts.map((item) => {
              const image = getRelatedImage(item);
              const relatedPrice = getRelatedPrice(item);
              const rating = relatedRatings[item.id];

              return (
                <Link
                  key={item.id}
                  to={`/products/${item.id}`}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md"
                >
                  <div className="flex aspect-square items-center justify-center overflow-hidden bg-slate-50 p-3">
                    {image ? (
                      <img
                        src={image}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">
                        No Image Available
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 p-3">
                    <h3 className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-800 group-hover:text-indigo-700">
                      {item.name}
                    </h3>

                    {/* NEW: Short Description in Related Products */}
                    {item.shortDescription?.trim() && (
                      <p className="line-clamp-2 text-xs leading-5 text-slate-500">
                        {item.shortDescription}
                      </p>
                    )}

                    {relatedPrice > 0 && (
                      <p className="text-base font-bold text-slate-900">
                        ₹{relatedPrice.toFixed(2)}
                      </p>
                    )}

                    {rating?.count > 0 && (
                      <div className="flex flex-wrap items-center gap-1 text-xs">
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-700">
                          {rating.average.toFixed(1)} ★
                        </span>

                        <span className="text-slate-500">
                          ({rating.count.toLocaleString('en-IN')})
                        </span>
                      </div>
                    )}

                    <span className="block pt-1 text-xs font-semibold text-indigo-600">
                      View Product →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
            No related products available at the moment.
          </p>
        )}
      </section>
    </div>
  );
}
