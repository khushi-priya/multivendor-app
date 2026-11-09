

// import { useEffect, useState } from "react";
// import { api } from "../../../services/api.js";
// import { useAuth } from "../../../context/AuthContext.jsx";
// import {
//   Alert,
//   Button,
//   Card,
//   Input,
//   Spinner,
// } from "../../../components/ui.jsx";

// const CONTROL_CLASS =
//   "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100";

// const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// const EMPTY_VARIANT = () => ({
//   variantName: "Default Variant",
//   sku: "",
//   price: "0",
//   wholesalePrice: "0",
//   retailPrice: "0",
//   initialStock: "10",
//   isActive: true,
//   attributeValues: [],
// });

// export default function ShopProducts() {
//   const { user } = useAuth();
//   const role = String(user?.role || "").trim().toLowerCase();
//   const isAdmin = role === "super_admin";
//   const isShopOwner =
//     role === "shop_owner" ||
//     (role === "shop_user" && user?.shop?.role === "shop_owner");

//   const catalogRoot = isAdmin ? "/admin/catalog" : "/shop/catalog";

//   const [products, setProducts] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [subcategories, setSubcategories] = useState([]);
//   const [brands, setBrands] = useState([]);
//   const [attributes, setAttributes] = useState([]);
//   const [shops, setShops] = useState([]);
//   const [selectedShopId, setSelectedShopId] = useState("");

//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState(null);
//   const [saving, setSaving] = useState(false);

//   const [showCreateModal, setShowCreateModal] = useState(false);
//   const [editingProduct, setEditingProduct] = useState(null);
//   const [editListing, setEditListing] = useState(null);
//   const [deletingProduct, setDeletingProduct] = useState(null);

//   // Multiple product images
//   const [uploadProductId, setUploadProductId] = useState(null);
//   const [imageFiles, setImageFiles] = useState([]);
//   const [imagePreviews, setImagePreviews] = useState([]);
//   const [primaryUpload, setPrimaryUpload] = useState(false);
//   const [uploadingImage, setUploadingImage] = useState(false);

//   const [query, setQuery] = useState("");
//   const [filterCategory, setFilterCategory] = useState("");
//   const [filterBrand, setFilterBrand] = useState("");
//   const [page, setPage] = useState(1);
//   const [total, setTotal] = useState(0);

//   const [name, setName] = useState("");
//   const [sku, setSku] = useState("");
//   const [categoryId, setCategoryId] = useState("");
//   const [subcategoryId, setSubcategoryId] = useState("");
//   const [brandId, setBrandId] = useState("");
//   const [shortDescription, setShortDescription] = useState("");
//   const [description, setDescription] = useState("");
//   const [basePrice, setBasePrice] = useState("0");
//   const [variants, setVariants] = useState([EMPTY_VARIANT()]);

//   const loadData = async () => {
//     setLoading(true);
//     setError(null);

//     try {
//       const params = new URLSearchParams({
//         page: String(page),
//         pageSize: "20",
//       });

//       if (query.trim()) params.set("q", query.trim());
//       if (filterCategory) params.set("categoryId", filterCategory);
//       if (filterBrand) params.set("brandId", filterBrand);

//       if (isAdmin && selectedShopId) {
//         params.set("shopId", selectedShopId);
//       }

//       const [prodRes, catRes, subRes, brandRes, attrRes] =
//         await Promise.all([
//           api.get(`${catalogRoot}/products?${params.toString()}`),
//           api.get(`${catalogRoot}/categories`),
//           api.get(`${catalogRoot}/subcategories`),
//           api.get(`${catalogRoot}/brands`),
//           api.get(`${catalogRoot}/attributes`),
//         ]);

//       setProducts(prodRes.items || []);
//       setTotal(prodRes.total || 0);
//       setCategories(catRes.items || []);
//       setSubcategories(subRes.items || []);
//       setBrands(brandRes.items || []);
//       setAttributes(attrRes.items || []);

//       if (isAdmin) {
//         const shopRes = await api.get("/admin/catalog/shops");
//         setShops(shopRes.items || []);
//       }
//     } catch (err) {
//       setError(err.message || "Failed to load products.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadData();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [page, query, filterCategory, filterBrand, selectedShopId]);

//   // Generate and clean up previews for every selected image.
//   useEffect(() => {
//     const previews = imageFiles.map((file) =>
//       URL.createObjectURL(file),
//     );

//     setImagePreviews(previews);

//     return () => {
//       previews.forEach((url) => URL.revokeObjectURL(url));
//     };
//   }, [imageFiles]);

//   const clearImageSelection = () => {
//     setImageFiles([]);
//     setImagePreviews([]);
//   };

//   const resetProductForm = () => {
//     setEditingProduct(null);
//     setName("");
//     setSku("");
//     setCategoryId("");
//     setSubcategoryId("");
//     setBrandId("");
//     setShortDescription("");
//     setDescription("");
//     setBasePrice("0");
//     setVariants([EMPTY_VARIANT()]);
//   };

//   const closeProductForm = () => {
//     setShowCreateModal(false);
//     resetProductForm();
//   };

//   const openCreateForm = () => {
//     setError(null);
//     setSuccess(null);
//     resetProductForm();
//     setShowCreateModal(true);
//   };

//   const addVariantRow = () => {
//     setVariants((current) => [
//       ...current,
//       {
//         variantName: "",
//         sku: "",
//         price: "",
//         wholesalePrice: "",
//         retailPrice: "",
//         initialStock: "0",
//         attributeValues: [],
//       },
//     ]);
//   };

//   const updateVariantRow = (index, field, value) => {
//     setVariants((current) =>
//       current.map((variant, i) =>
//         i === index ? { ...variant, [field]: value } : variant,
//       ),
//     );
//   };

//   const removeVariantRow = (index) => {
//     setVariants((current) =>
//       current.length <= 1
//         ? current
//         : current.filter((_, i) => i !== index),
//     );
//   };

//   const startProductEdit = (product) => {
//     setError(null);
//     setSuccess(null);
//     setEditingProduct(product);

//     setName(product.name || "");
//     setSku(product.sku || "");
//     setCategoryId(
//       product.categoryId != null ? String(product.categoryId) : "",
//     );
//     setSubcategoryId(
//       product.subcategoryId != null
//         ? String(product.subcategoryId)
//         : "",
//     );
//     setBrandId(
//       product.brandId != null ? String(product.brandId) : "",
//     );
//     setShortDescription(product.shortDescription || "");
//     setDescription(product.description || "");
//     setBasePrice(String(product.basePrice ?? 0));

//     setVariants(
//       product.variants?.length
//         ? product.variants.map((variant) => ({
//             id: variant.id,
//             variantName: variant.variantName || "",
//             sku: variant.sku || "",
//             price: String(variant.price ?? 0),
//             wholesalePrice: String(variant.wholesalePrice ?? 0),
//             retailPrice: String(
//               variant.sellerListing?.retailPrice ??
//                 variant.retailPrice ??
//                 variant.price ??
//                 0,
//             ),
//             initialStock: String(variant.inventory?.quantity ?? 0),
//             isActive: variant.sellerListing?.isActive !== false,
//             attributeValues: (variant.variantValues || []).map((row) => ({
//               attributeId: Number(row.attributeId),
//               attributeValueId: Number(row.attributeValueId),
//             })),
//           }))
//         : [EMPTY_VARIANT()],
//     );

//     setShowCreateModal(true);
//   };

//   const handleCreateProduct = async (e) => {
//     e.preventDefault();
//     setSaving(true);
//     setError(null);
//     setSuccess(null);

//     try {
//       const productPayload = {
//         name: name.trim(),
//         sku: sku.trim() || undefined,
//         categoryId: categoryId ? Number(categoryId) : null,
//         subcategoryId: subcategoryId ? Number(subcategoryId) : null,
//         brandId: brandId ? Number(brandId) : null,
//         shortDescription,
//         description,
//         basePrice: Number(basePrice || 0),
//       };

//       const variantPayload = variants.map((variant, index) => ({
//         ...(variant.id ? { id: Number(variant.id) } : {}),
//         variantName:
//           variant.variantName?.trim() || `Variant ${index + 1}`,
//         sku:
//           variant.sku?.trim() ||
//           `SKU-${Date.now().toString(36).toUpperCase()}-${index}`,
//         price: Number(variant.price || 0),
//         wholesalePrice: Number(variant.wholesalePrice || 0),
//         retailPrice: Number(variant.retailPrice || 0),
//         initialStock: Number(variant.initialStock || 0),
//         isActive: variant.isActive !== false,
//         attributeValues: variant.attributeValues || [],
//       }));

//       if (editingProduct) {
//         const updatePayload = { ...productPayload };

//         if (isShopOwner) {
//           updatePayload.variants = variantPayload;
//         }

//         await api.patch(
//           `${catalogRoot}/products/${editingProduct.id}`,
//           updatePayload,
//         );

//         setSuccess("Product updated successfully.");
//         closeProductForm();
//         await loadData();
//         return;
//       }

//       const createPayload = {
//         ...productPayload,
//         categoryId: categoryId ? Number(categoryId) : undefined,
//         subcategoryId: subcategoryId
//           ? Number(subcategoryId)
//           : undefined,
//         brandId: brandId ? Number(brandId) : undefined,
//         variants: variantPayload,
//       };

//       if (isAdmin) {
//         if (!selectedShopId) {
//           throw new Error("Select a shop to create its seller listing.");
//         }

//         createPayload.shopId = Number(selectedShopId);
//       }

//       await api.post(`${catalogRoot}/products`, createPayload);

//       setSuccess("Product created successfully.");
//       closeProductForm();
//       await loadData();
//     } catch (err) {
//       setError(err.message || "Failed to save product.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   // Upload multiple photos through the existing single-image backend endpoint.
//   const handleImageUpload = async (e) => {
//     e.preventDefault();

//     if (!uploadProductId || imageFiles.length === 0) return;

//     setUploadingImage(true);
//     setError(null);
//     setSuccess(null);

//     let uploadedCount = 0;

//     try {
//       for (let i = 0; i < imageFiles.length; i++) {
//         const formData = new FormData();
//         formData.append("image", imageFiles[i]);

//         // Only the first selected photo becomes primary when requested.
//         formData.append(
//           "isPrimary",
//           String(primaryUpload && i === 0),
//         );

//         await api.upload(
//           `${catalogRoot}/products/${uploadProductId}/images`,
//           formData,
//         );

//         uploadedCount++;
//       }

//       setSuccess(`${uploadedCount} product photo(s) uploaded successfully.`);
//       setUploadProductId(null);
//       clearImageSelection();
//       setPrimaryUpload(false);

//       await loadData();
//     } catch (err) {
//       setError(
//         uploadedCount > 0
//           ? `${uploadedCount} photo(s) uploaded before an error occurred. ${err.message || "Please retry the remaining photos."}`
//           : err.message || "Failed to upload product photos.",
//       );

//       await loadData();
//     } finally {
//       setUploadingImage(false);
//     }
//   };

//   const removeProductImage = async (productId, imageId) => {
//     if (!window.confirm("Remove this product image?")) return;

//     setError(null);
//     setSuccess(null);

//     try {
//       await api.delete(
//         `${catalogRoot}/products/${productId}/images/${imageId}`,
//       );

//       setSuccess("Product image removed.");
//       await loadData();
//     } catch (err) {
//       setError(err.message || "Failed to remove image.");
//     }
//   };

//   const saveListing = async (e) => {
//     e.preventDefault();
//     if (!editListing) return;

//     setSaving(true);
//     setError(null);
//     setSuccess(null);

//     try {
//       await api.patch(
//         `${catalogRoot}/products/${editListing.id}/listing`,
//         {
//           ...(isAdmin ? { shopId: Number(selectedShopId) } : {}),
//           variants: editListing.variants.map((variant) => ({
//             id: Number(variant.id),
//             retailPrice: Number(variant.retailPrice),
//             quantity: Number(variant.quantity),
//             isActive: variant.isActive,
//           })),
//         },
//       );

//       setEditListing(null);
//       setSuccess("Shop price and inventory updated.");
//       await loadData();
//     } catch (err) {
//       setError(err.message || "Failed to update shop listing.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const toggleAvailability = async (product) => {
//     setSaving(true);
//     setError(null);
//     setSuccess(null);

//     try {
//       const next = !product.variants?.some(
//         (variant) => variant.sellerListing?.isActive,
//       );

//       await api.patch(`${catalogRoot}/products/${product.id}/listing`, {
//         ...(isAdmin ? { shopId: Number(selectedShopId) } : {}),
//         variants: (product.variants || [])
//           .filter((variant) => variant.sellerListing)
//           .map((variant) => ({
//             id: variant.id,
//             retailPrice: Number(
//               variant.sellerListing.retailPrice ?? variant.price ?? 0,
//             ),
//             quantity: Number(variant.inventory?.quantity || 0),
//             isActive: next,
//           })),
//       });

//       setSuccess(
//         next ? "Product listing activated." : "Product listing deactivated.",
//       );

//       await loadData();
//     } catch (err) {
//       setError(err.message || "Failed to update listing.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const toggleProductStatus = async (product) => {
//     setError(null);
//     setSuccess(null);

//     try {
//       await api.patch(`${catalogRoot}/products/${product.id}`, {
//         isActive: !product.isActive,
//       });

//       setSuccess(
//         product.isActive ? "Product deactivated." : "Product activated.",
//       );

//       await loadData();
//     } catch (err) {
//       setError(err.message || "Failed to update product status.");
//     }
//   };

//   const archiveProduct = async () => {
//     if (!deletingProduct || (!isAdmin && !isShopOwner)) return;

//     setSaving(true);
//     setError(null);
//     setSuccess(null);

//     try {
//       await api.delete(`${catalogRoot}/products/${deletingProduct.id}`);

//       setSuccess(
//         isAdmin
//           ? `${deletingProduct.name} was archived and removed from active listings.`
//           : `${deletingProduct.name} was removed from this shop's active listings.`,
//       );

//       setDeletingProduct(null);
//       await loadData();
//     } catch (err) {
//       setError(err.message || "Failed to archive product.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const openPhotoManager = (product) => {
//     setError(null);
//     setSuccess(null);
//     clearImageSelection();
//     setUploadProductId(product.id);
//     setPrimaryUpload(
//       !(product.images || []).some((image) => image.isPrimary),
//     );
//   };

//   const closePhotoManager = () => {
//     setUploadProductId(null);
//     clearImageSelection();
//     setPrimaryUpload(false);
//   };

//   const handleImageSelection = (e) => {
//     const files = Array.from(e.target.files || []);

//     if (files.some((file) => file.size > MAX_IMAGE_SIZE)) {
//       setError("Each image must be 5 MB or smaller.");
//       clearImageSelection();
//       e.target.value = "";
//       return;
//     }

//     const validTypes = ["image/jpeg", "image/png", "image/webp"];

//     if (files.some((file) => !validTypes.includes(file.type))) {
//       setError("Only JPEG, PNG, and WEBP images are allowed.");
//       clearImageSelection();
//       e.target.value = "";
//       return;
//     }

//     setError(null);
//     setImageFiles(files);
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">
//             Products &amp; Catalog
//           </h1>
//           <p className="mt-1 text-sm text-slate-600">
//             Manage your store catalog, variants, prices, and available stock.
//           </p>
//         </div>

//         <Button onClick={openCreateForm}>+ Add New Product</Button>
//       </div>

//       {error && <Alert kind="error">{error}</Alert>}
//       {success && <Alert kind="success">{success}</Alert>}

//       <div className="flex flex-wrap gap-2">
//         {isAdmin && (
//           <select
//             value={selectedShopId}
//             onChange={(e) => {
//               setSelectedShopId(e.target.value);
//               setPage(1);
//             }}
//             className={`${CONTROL_CLASS} w-auto`}
//           >
//             <option value="">All shops / global products</option>
//             {shops.map((shop) => (
//               <option key={shop.id} value={shop.id}>
//                 {shop.name}
//               </option>
//             ))}
//           </select>
//         )}

//         <div className="min-w-64">
//           <Input
//             value={query}
//             onChange={(e) => {
//               setQuery(e.target.value);
//               setPage(1);
//             }}
//             placeholder="Search products, SKU, category or brand"
//           />
//         </div>

//         <select
//           value={filterCategory}
//           onChange={(e) => {
//             setFilterCategory(e.target.value);
//             setPage(1);
//           }}
//           className={`${CONTROL_CLASS} w-auto`}
//         >
//           <option value="">All categories</option>
//           {categories.map((item) => (
//             <option key={item.id} value={item.id}>
//               {item.name}
//             </option>
//           ))}
//         </select>

//         <select
//           value={filterBrand}
//           onChange={(e) => {
//             setFilterBrand(e.target.value);
//             setPage(1);
//           }}
//           className={`${CONTROL_CLASS} w-auto`}
//         >
//           <option value="">All brands</option>
//           {brands.map((item) => (
//             <option key={item.id} value={item.id}>
//               {item.name}
//             </option>
//           ))}
//         </select>
//       </div>

//       {loading ? (
//         <Spinner />
//       ) : products.length === 0 ? (
//         <Card>
//           <div className="py-8 text-center text-sm text-slate-500">
//             No products in your catalog yet. Click "Add New Product" to create
//             your first item.
//           </div>
//         </Card>
//       ) : (
//         <div className="space-y-4">
//           {products.map((product) => (
//             <Card key={product.id}>
//               <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
//                 <div className="flex gap-4">
//                   <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100">
//                     {product.images?.length > 0 ? (
//                       <img
//                         src={product.images.find((image) => image.isPrimary)?.imageUrl || product.images[0].imageUrl}
//                         alt={product.name}
//                         className="h-full w-full object-cover"
//                       />
//                     ) : (
//                       <span className="text-xs text-slate-400">No Image</span>
//                     )}
//                   </div>

//                   <div>
//                     <h2 className="text-lg font-bold text-slate-900">
//                       {product.name}
//                     </h2>

//                     <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
//                       <span className="inline-flex items-center gap-1">
//                         Category:
//                         {product.category?.imageUrl && (
//                           <img
//                             src={product.category.imageUrl}
//                             alt=""
//                             className="h-5 w-5 rounded object-cover"
//                           />
//                         )}
//                         <strong className="text-slate-700">
//                           {product.category?.name || "Uncategorized"}
//                         </strong>

//                         {product.subcategory?.imageUrl && (
//                           <img
//                             src={product.subcategory.imageUrl}
//                             alt=""
//                             className="h-5 w-5 rounded object-cover"
//                           />
//                         )}
//                         <strong className="text-slate-700">
//                           {product.subcategory?.name || ""}
//                         </strong>
//                       </span>

//                       <span>&bull;</span>

//                       <span className="inline-flex items-center gap-1">
//                         Brand:
//                         {product.brand?.imageUrl && (
//                           <img
//                             src={product.brand.imageUrl}
//                             alt=""
//                             className="h-5 w-5 rounded-full object-cover"
//                           />
//                         )}
//                         <strong className="text-slate-700">
//                           {product.brand?.name || "Generic"}
//                         </strong>
//                       </span>

//                       <span>&bull;</span>

//                       <span>
//                         SKU:{" "}
//                         <code className="text-indigo-600">
//                           {product.sku || "—"}
//                         </code>
//                       </span>
//                     </div>

//                     {product.description && (
//                       <p className="mt-2 text-xs text-slate-600">
//                         {product.description}
//                       </p>
//                     )}
//                   </div>
//                 </div>

//                 <div className="flex flex-wrap gap-2">
//                   <Button
//                     variant="secondary"
//                     disabled={isShopOwner && product.sharedAcrossShops}
//                     title={
//                       isShopOwner && product.sharedAcrossShops
//                         ? "Shared product images are managed by Super Admin."
//                         : undefined
//                     }
//                     onClick={() => openPhotoManager(product)}
//                   >
//                     Manage Photos
//                   </Button>

//                   {((isAdmin && selectedShopId) || isShopOwner) && (
//                     <Button
//                       variant="secondary"
//                       onClick={() =>
//                         setEditListing({
//                           id: product.id,
//                           variants: (product.variants || [])
//                             .filter((variant) => variant.sellerListing)
//                             .map((variant) => ({
//                               id: variant.id,
//                               retailPrice:
//                                 variant.sellerListing.retailPrice ??
//                                 variant.price ??
//                                 0,
//                               quantity: variant.inventory?.quantity ?? 0,
//                               isActive: variant.sellerListing.isActive,
//                             })),
//                         })
//                       }
//                     >
//                       Edit shop listing
//                     </Button>
//                   )}

//                   <Button
//                     variant="secondary"
//                     disabled={isShopOwner && product.sharedAcrossShops}
//                     title={
//                       isShopOwner && product.sharedAcrossShops
//                         ? "Shared product details are managed by Super Admin. Edit this shop's price, stock, and availability instead."
//                         : undefined
//                     }
//                     onClick={() => startProductEdit(product)}
//                   >
//                     {isShopOwner && product.sharedAcrossShops
//                       ? "Edit Product (shared)"
//                       : "Edit Product"}
//                   </Button>

//                   {isShopOwner && (
//                     <Button
//                       variant="secondary"
//                       onClick={() => toggleAvailability(product)}
//                       disabled={saving}
//                     >
//                       {product.variants?.some(
//                         (variant) => variant.sellerListing?.isActive,
//                       )
//                         ? "Deactivate listing"
//                         : "Activate listing"}
//                     </Button>
//                   )}

//                   {isAdmin && (
//                     <Button
//                       variant="secondary"
//                       onClick={() => toggleProductStatus(product)}
//                     >
//                       {product.isActive
//                         ? "Deactivate product"
//                         : "Activate product"}
//                     </Button>
//                   )}

//                   {isAdmin || isShopOwner ? (
//                     <Button
//                       type="button"
//                       variant="danger"
//                       onClick={() => setDeletingProduct(product)}
//                     >
//                       {isAdmin ? "Archive Product" : "Delete Product"}
//                     </Button>
//                   ) : (
//                     <Button
//                       type="button"
//                       variant="danger"
//                       disabled
//                       title="Product records are shared catalog data. Super Admin manages product deletion; deactivate this shop listing to hide it from your shop."
//                     >
//                       Delete Product
//                     </Button>
//                   )}
//                 </div>
//               </div>

//               <div className="mt-4 overflow-x-auto rounded border border-slate-200">
//                 <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
//                   <thead className="bg-slate-50 font-semibold text-slate-600">
//                     <tr>
//                       <th className="px-3 py-2">Variant</th>
//                       <th className="px-3 py-2">Variant SKU</th>
//                       <th className="px-3 py-2">Wholesale Price</th>
//                       <th className="px-3 py-2">My Retail Price</th>
//                       <th className="px-3 py-2">Shop Inventory</th>
//                       <th className="px-3 py-2">Status</th>
//                       {isAdmin && !selectedShopId && (
//                         <th className="px-3 py-2">Shop listings</th>
//                       )}
//                     </tr>
//                   </thead>

//                   <tbody className="divide-y divide-slate-100">
//                     {product.variants?.map((variant) => (
//                       <tr key={variant.id} className="hover:bg-slate-50">
//                         <td className="px-3 py-2 font-medium text-slate-800">
//                           {variant.variantName}
//                         </td>
//                         <td className="px-3 py-2 font-mono text-slate-500">
//                           {variant.sku}
//                         </td>
//                         <td className="px-3 py-2 text-slate-600">
//                           ₹{Number(variant.wholesalePrice || 0).toFixed(2)}
//                         </td>
//                         <td className="px-3 py-2 font-semibold text-slate-900">
//                           ₹
//                           {Number(
//                             variant.sellerListing?.retailPrice ??
//                               variant.retailPrice ??
//                               variant.price ??
//                               0,
//                           ).toFixed(2)}
//                         </td>
//                         <td className="px-3 py-2">
//                           <span
//                             className={`inline-flex rounded-full px-2 py-0.5 font-bold ${
//                               (variant.inventory?.quantity || 0) <= 5
//                                 ? "bg-amber-100 text-amber-800"
//                                 : "bg-emerald-100 text-emerald-800"
//                             }`}
//                           >
//                             {variant.inventory?.quantity ?? 0} in stock
//                           </span>
//                         </td>
//                         <td className="px-3 py-2">
//                           {isAdmin && !selectedShopId
//                             ? variant.listings?.some((listing) => listing.isActive)
//                               ? "Active in shop(s)"
//                               : "No active listing"
//                             : variant.sellerListing?.isActive
//                               ? "Active"
//                               : "Inactive"}
//                         </td>

//                         {isAdmin && !selectedShopId && (
//                           <td className="px-3 py-2">
//                             {variant.listings
//                               ?.map((listing) => listing.shop?.name)
//                               .filter(Boolean)
//                               .join(", ") || "Not listed"}
//                           </td>
//                         )}
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </Card>
//           ))}
//         </div>
//       )}

//       {!loading && total > 20 && (
//         <div className="flex items-center justify-end gap-3">
//           <span className="text-sm text-slate-600">
//             Page {page} of {Math.ceil(total / 20)}
//           </span>
//           <Button
//             variant="secondary"
//             disabled={page <= 1}
//             onClick={() => setPage((current) => current - 1)}
//           >
//             Previous
//           </Button>
//           <Button
//             variant="secondary"
//             disabled={page >= Math.ceil(total / 20)}
//             onClick={() => setPage((current) => current + 1)}
//           >
//             Next
//           </Button>
//         </div>
//       )}

//       {/* Create/Edit Product popup */}
//       {showCreateModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
//           <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
//             <div className="flex items-center justify-between border-b pb-3">
//               <h2 className="text-xl font-bold text-slate-900">
//                 {editingProduct
//                   ? "Edit Product with Dynamic Variants"
//                   : "Create Product with Dynamic Variants"}
//               </h2>

//               <button
//                 type="button"
//                 onClick={closeProductForm}
//                 className="text-2xl font-bold text-slate-400 hover:text-slate-600"
//                 aria-label="Close product form"
//               >
//                 &times;
//               </button>
//             </div>

//             <form onSubmit={handleCreateProduct} className="mt-4 space-y-6">
//               <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
//                 {isAdmin && !editingProduct && (
//                   <div>
//                     <label className="block text-sm font-medium text-slate-700">
//                       Select Shop *
//                     </label>
//                     <select
//                       required
//                       value={selectedShopId}
//                       onChange={(e) => setSelectedShopId(e.target.value)}
//                       className={`${CONTROL_CLASS} mt-1`}
//                     >
//                       <option value="">Select shop</option>
//                       {shops.map((shop) => (
//                         <option key={shop.id} value={shop.id}>
//                           {shop.name}
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                 )}

//                 <div>
//                   <label className="block text-sm font-medium text-slate-700">
//                     Product Name *
//                   </label>
//                   <Input
//                     required
//                     value={name}
//                     onChange={(e) => setName(e.target.value)}
//                     placeholder="e.g. Slim Fit Cotton Shirt"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-slate-700">
//                     Master SKU
//                   </label>
//                   <Input
//                     value={sku}
//                     onChange={(e) => setSku(e.target.value)}
//                     placeholder="e.g. SHIRT-001"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-slate-700">
//                     Category
//                   </label>
//                   <select
//                     value={categoryId}
//                     onChange={(e) => {
//                       setCategoryId(e.target.value);
//                       setSubcategoryId("");
//                     }}
//                     className={`${CONTROL_CLASS} mt-1`}
//                   >
//                     <option value="">Select category...</option>
//                     {categories
//                       .filter((category) => category.isActive)
//                       .map((category) => (
//                         <option key={category.id} value={category.id}>
//                           {category.name}
//                         </option>
//                       ))}
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-slate-700">
//                     Subcategory
//                   </label>
//                   <select
//                     value={subcategoryId}
//                     onChange={(e) => setSubcategoryId(e.target.value)}
//                     className={`${CONTROL_CLASS} mt-1`}
//                   >
//                     <option value="">Select subcategory...</option>
//                     {subcategories
//                       .filter(
//                         (subcategory) =>
//                           String(subcategory.categoryId) === String(categoryId) &&
//                           subcategory.isActive,
//                       )
//                       .map((subcategory) => (
//                         <option key={subcategory.id} value={subcategory.id}>
//                           {subcategory.name}
//                         </option>
//                       ))}
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-slate-700">
//                     Brand
//                   </label>
//                   <select
//                     value={brandId}
//                     onChange={(e) => setBrandId(e.target.value)}
//                     className={`${CONTROL_CLASS} mt-1`}
//                   >
//                     <option value="">Select brand...</option>
//                     {brands
//                       .filter((brand) => brand.isActive)
//                       .map((brand) => (
//                         <option key={brand.id} value={brand.id}>
//                           {brand.name}
//                         </option>
//                       ))}
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-slate-700">
//                     Base Price (₹)
//                   </label>
//                   <Input
//                     type="number"
//                     min="0"
//                     step="0.01"
//                     value={basePrice}
//                     onChange={(e) => setBasePrice(e.target.value)}
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-slate-700">
//                     Short Description
//                   </label>
//                   <textarea
//                     rows={2}
//                     value={shortDescription}
//                     onChange={(e) => setShortDescription(e.target.value)}
//                     className={`${CONTROL_CLASS} mt-1`}
//                     placeholder="Enter a short product summary"
//                   />
//                 </div>

//                 <div className="sm:col-span-2">
//                   <label className="block text-sm font-medium text-slate-700">
//                     Description
//                   </label>
//                   <textarea
//                     rows={3}
//                     value={description}
//                     onChange={(e) => setDescription(e.target.value)}
//                     className={`${CONTROL_CLASS} mt-1`}
//                     placeholder="Enter detailed product description"
//                   />
//                 </div>
//               </div>

//               {(!editingProduct || isShopOwner) && (
//                 <div className="border-t pt-4">
//                   <div className="mb-3 flex items-center justify-between">
//                     <h3 className="text-base font-bold text-slate-900">
//                       Product Variants
//                     </h3>
//                     <Button
//                       type="button"
//                       variant="secondary"
//                       onClick={addVariantRow}
//                     >
//                       + Add Variant
//                     </Button>
//                   </div>

//                   <div className="space-y-3">
//                     {variants.map((variant, index) => (
//                       <div
//                         key={variant.id ?? index}
//                         className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs"
//                       >
//                         <div className="min-w-32 flex-1">
//                           <label className="mb-1 block font-medium text-slate-600">
//                             Variant Name
//                           </label>
//                           <Input
//                             required
//                             value={variant.variantName}
//                             onChange={(e) =>
//                               updateVariantRow(index, "variantName", e.target.value)
//                             }
//                             placeholder="e.g. Size XL, Blue"
//                           />
//                         </div>

//                         <div className="w-28">
//                           <label className="mb-1 block font-medium text-slate-600">
//                             Variant SKU
//                           </label>
//                           <Input
//                             required
//                             value={variant.sku}
//                             onChange={(e) =>
//                               updateVariantRow(index, "sku", e.target.value)
//                             }
//                             placeholder="e.g. XL-BLU"
//                           />
//                         </div>

//                         {attributes
//                           .filter((attribute) => attribute.values?.length)
//                           .map((attribute) => {
//                             const selected = variant.attributeValues?.find(
//                               (entry) =>
//                                 Number(entry.attributeId) === Number(attribute.id),
//                             );

//                             return (
//                               <label key={attribute.id} className="w-32">
//                                 {attribute.name}
//                                 <select
//                                   value={selected?.attributeValueId || ""}
//                                   onChange={(e) =>
//                                     setVariants((current) =>
//                                       current.map((row, rowIndex) => {
//                                         if (rowIndex !== index) return row;

//                                         const remaining = (
//                                           row.attributeValues || []
//                                         ).filter(
//                                           (entry) =>
//                                             Number(entry.attributeId) !==
//                                             Number(attribute.id),
//                                         );

//                                         if (e.target.value) {
//                                           remaining.push({
//                                             attributeId: Number(attribute.id),
//                                             attributeValueId: Number(e.target.value),
//                                           });
//                                         }

//                                         return {
//                                           ...row,
//                                           attributeValues: remaining,
//                                         };
//                                       }),
//                                     )
//                                   }
//                                   className={`${CONTROL_CLASS} mt-1`}
//                                 >
//                                   <option value="">No value</option>
//                                   {attribute.values.map((option) => (
//                                     <option key={option.id} value={option.id}>
//                                       {option.value}
//                                     </option>
//                                   ))}
//                                 </select>
//                               </label>
//                             );
//                           })}

//                         <div className="w-28">
//                           <label className="mb-1 block font-medium text-slate-600">
//                             Wholesale Price (₹)
//                           </label>
//                           <Input
//                             type="number"
//                             min="0"
//                             step="0.01"
//                             required
//                             value={variant.price}
//                             onChange={(e) =>
//                               updateVariantRow(index, "price", e.target.value)
//                             }
//                           />
//                         </div>

//                         <div className="w-28">
//                           <label className="mb-1 block font-medium text-slate-600">
//                             Marked Price (₹)
//                           </label>
//                           <Input
//                             type="number"
//                             min="0"
//                             step="0.01"
//                             required
//                             value={variant.wholesalePrice}
//                             onChange={(e) =>
//                               updateVariantRow(index, "wholesalePrice", e.target.value)
//                             }
//                           />
//                         </div>

//                         <div className="w-28">
//                           <label className="mb-1 block font-medium text-slate-600">
//                             Selling Price (₹)
//                           </label>
//                           <Input
//                             type="number"
//                             min="0"
//                             step="0.01"
//                             required
//                             value={variant.retailPrice}
//                             onChange={(e) =>
//                               updateVariantRow(index, "retailPrice", e.target.value)
//                             }
//                           />
//                         </div>

//                         <div className="w-28">
//                           <label className="mb-1 block font-medium text-slate-600">
//                             Stock
//                           </label>
//                           <Input
//                             type="number"
//                             min="0"
//                             step="1"
//                             required
//                             value={variant.initialStock}
//                             onChange={(e) =>
//                               updateVariantRow(index, "initialStock", e.target.value)
//                             }
//                           />
//                         </div>

//                         {isShopOwner && (
//                           <div className="w-28">
//                             <label className="mb-1 block font-medium text-slate-600">
//                               Listing status
//                             </label>
//                             <select
//                               value={
//                                 variant.isActive === false ? "inactive" : "active"
//                               }
//                               onChange={(e) =>
//                                 updateVariantRow(
//                                   index,
//                                   "isActive",
//                                   e.target.value === "active",
//                                 )
//                               }
//                               className={`${CONTROL_CLASS} mt-1`}
//                             >
//                               <option value="active">Active</option>
//                               <option value="inactive">Inactive</option>
//                             </select>
//                           </div>
//                         )}

//                         {variants.length > 1 && (
//                           <div className="pt-5">
//                             <button
//                               type="button"
//                               onClick={() => removeVariantRow(index)}
//                               className="rounded p-1 text-rose-600 hover:bg-rose-50"
//                             >
//                               Remove
//                             </button>
//                           </div>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               <div className="flex justify-end gap-3 border-t pt-4">
//                 <Button
//                   type="button"
//                   variant="secondary"
//                   onClick={closeProductForm}
//                 >
//                   Cancel
//                 </Button>
//                 <Button type="submit" disabled={saving}>
//                   {saving
//                     ? "Saving..."
//                     : editingProduct
//                       ? "Save Changes"
//                       : "Create Product"}
//                 </Button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Manage Product Photos */}
//       {uploadProductId && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
//           <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
//             <h2 className="text-lg font-bold text-slate-900">
//               Manage product photos
//             </h2>
//             <p className="mt-1 text-sm text-slate-500">
//               Select multiple JPEG, PNG, or WEBP photos. Each image can be up
//               to 5 MB.
//             </p>

//             <div className="my-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
//               {products
//                 .find((item) => String(item.id) === String(uploadProductId))
//                 ?.images?.map((image) => (
//                   <div
//                     key={image.id}
//                     className="relative aspect-square overflow-hidden rounded-lg border"
//                   >
//                     <img
//                       src={image.imageUrl}
//                       alt="Product"
//                       className="h-full w-full object-cover"
//                     />
//                     <span className="absolute bottom-1 left-1 rounded bg-slate-950/75 px-1.5 py-0.5 text-[10px] text-white">
//                       {image.isPrimary ? "Primary" : "Gallery"}
//                     </span>
//                     <button
//                       type="button"
//                       onClick={() => removeProductImage(uploadProductId, image.id)}
//                       className="absolute right-1 top-1 rounded-full bg-white px-2 py-1 text-sm text-rose-700 shadow"
//                       aria-label="Remove product image"
//                     >
//                       ×
//                     </button>
//                   </div>
//                 ))}
//             </div>

//             <form onSubmit={handleImageUpload} className="mt-4 space-y-4">
//               <input
//                 type="file"
//                 accept="image/jpeg,image/png,image/webp"
//                 multiple
//                 onChange={handleImageSelection}
//                 className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
//               />

//               {imageFiles.length > 0 && (
//                 <>
//                   <p className="text-sm font-medium text-slate-700">
//                     {imageFiles.length} photo(s) selected
//                   </p>

//                   <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
//                     {imageFiles.map((file, index) => (
//                       <div
//                         key={`${file.name}-${index}`}
//                         className="overflow-hidden rounded-lg border"
//                       >
//                         <img
//                           src={imagePreviews[index]}
//                           alt={file.name}
//                           className="h-24 w-full object-cover"
//                         />
//                         <p className="truncate p-1 text-xs text-slate-600">
//                           {file.name}
//                         </p>
//                       </div>
//                     ))}
//                   </div>
//                 </>
//               )}

//               <label className="flex items-center gap-2 text-sm text-slate-700">
//                 <input
//                   type="checkbox"
//                   checked={primaryUpload}
//                   onChange={(e) => setPrimaryUpload(e.target.checked)}
//                 />
//                 Set the first selected photo as primary product image
//               </label>

//               <div className="flex justify-end gap-2 pt-2">
//                 <Button
//                   type="button"
//                   variant="secondary"
//                   disabled={uploadingImage}
//                   onClick={closePhotoManager}
//                 >
//                   Cancel
//                 </Button>
//                 <Button
//                   type="submit"
//                   disabled={uploadingImage || imageFiles.length === 0}
//                 >
//                   {uploadingImage ? "Uploading..." : "Upload Photos"}
//                 </Button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Edit Shop Listing */}
//       {((isAdmin && selectedShopId) || isShopOwner) && editListing && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
//           <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
//             <h2 className="text-lg font-bold">Edit shop listing</h2>
//             <p className="mt-1 text-sm text-slate-500">
//               Updates only this shop's prices, stock, and listing availability.
//             </p>

//             {editListing.variants.length === 0 ? (
//               <p className="py-6 text-sm text-slate-500">
//                 No shop variants are available to edit.
//               </p>
//             ) : (
//               <form onSubmit={saveListing} className="mt-4 space-y-3">
//                 {editListing.variants.map((variant, index) => (
//                   <div
//                     key={variant.id}
//                     className="grid grid-cols-2 gap-3 rounded border p-3"
//                   >
//                     <label className="text-sm">
//                       Retail price
//                       <Input
//                         type="number"
//                         min="0"
//                         step="0.01"
//                         required
//                         value={variant.retailPrice}
//                         onChange={(e) =>
//                           setEditListing((current) => ({
//                             ...current,
//                             variants: current.variants.map((row, rowIndex) =>
//                               rowIndex === index
//                                 ? { ...row, retailPrice: e.target.value }
//                                 : row,
//                             ),
//                           }))
//                         }
//                       />
//                     </label>

//                     <label className="text-sm">
//                       Stock quantity
//                       <Input
//                         type="number"
//                         min="0"
//                         step="1"
//                         required
//                         value={variant.quantity}
//                         onChange={(e) =>
//                           setEditListing((current) => ({
//                             ...current,
//                             variants: current.variants.map((row, rowIndex) =>
//                               rowIndex === index
//                                 ? { ...row, quantity: e.target.value }
//                                 : row,
//                             ),
//                           }))
//                         }
//                       />
//                     </label>

//                     <label className="text-sm">
//                       Listing status
//                       <select
//                         value={variant.isActive === false ? "inactive" : "active"}
//                         onChange={(e) =>
//                           setEditListing((current) => ({
//                             ...current,
//                             variants: current.variants.map((row, rowIndex) =>
//                               rowIndex === index
//                                 ? {
//                                     ...row,
//                                     isActive: e.target.value === "active",
//                                   }
//                                 : row,
//                             ),
//                           }))
//                         }
//                         className={`${CONTROL_CLASS} mt-1`}
//                       >
//                         <option value="active">Active</option>
//                         <option value="inactive">Inactive</option>
//                       </select>
//                     </label>
//                   </div>
//                 ))}

//                 <div className="flex justify-end gap-2">
//                   <Button
//                     type="button"
//                     variant="secondary"
//                     onClick={() => setEditListing(null)}
//                   >
//                     Cancel
//                   </Button>
//                   <Button type="submit" disabled={saving}>
//                     {saving ? "Saving..." : "Save shop listing"}
//                   </Button>
//                 </div>
//               </form>
//             )}

//             {editListing.variants.length === 0 && (
//               <div className="mt-4 flex justify-end">
//                 <Button
//                   variant="secondary"
//                   onClick={() => setEditListing(null)}
//                 >
//                   Close
//                 </Button>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Delete / Archive Product Confirmation */}
//       {(isAdmin || isShopOwner) && deletingProduct && (
//         <div
//           className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
//           onMouseDown={(event) => {
//             if (event.target === event.currentTarget && !saving) {
//               setDeletingProduct(null);
//             }
//           }}
//         >
//           <div
//             role="dialog"
//             aria-modal="true"
//             aria-labelledby="archive-product-title"
//             className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"
//           >
//             <h2 id="archive-product-title" className="text-lg font-semibold">
//               {isAdmin
//                 ? "Archive product"
//                 : "Delete product from this shop"}
//             </h2>

//             <p className="mt-2 text-sm text-slate-600">
//               {isAdmin ? (
//                 <>
//                   Archive <strong>{deletingProduct.name}</strong>? This
//                   deactivates the shared product and all shop listings while
//                   preserving order and inventory history.
//                 </>
//               ) : (
//                 <>
//                   Remove <strong>{deletingProduct.name}</strong> from this
//                   shop's active listings? The shared catalog record, other
//                   shops' listings, inventory, and order history are preserved.
//                 </>
//               )}
//             </p>

//             <div className="mt-5 flex justify-end gap-2">
//               <Button
//                 type="button"
//                 variant="secondary"
//                 disabled={saving}
//                 onClick={() => setDeletingProduct(null)}
//               >
//                 Cancel
//               </Button>
//               <Button
//                 type="button"
//                 variant="danger"
//                 loading={saving}
//                 disabled={saving}
//                 onClick={archiveProduct}
//               >
//                 {saving
//                   ? isAdmin
//                     ? "Archiving…"
//                     : "Deleting…"
//                   : isAdmin
//                     ? "Archive product"
//                     : "Delete product"}
//               </Button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


import { useEffect, useState } from "react";
import { api } from "../../../services/api.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { hasPermission } from "../../../services/permissions.js";
import {
  Alert,
  Button,
  Card,
  Input,
  Spinner,
} from "../../../components/ui.jsx";

const CONTROL_CLASS =
  "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const EMPTY_VARIANT = () => ({
  variantName: "Default Variant",
  sku: "",
  price: "0",
  wholesalePrice: "0",
  retailPrice: "0",
  weight: "",
  weightUnit: "kg",
  gstApplicable: false,
  gstRate: "0",
  priceIncludesGst: false,
  hsnCode: "",
  initialStock: "10",
  isActive: true,
  attributeValues: [],
});

export default function ShopProducts() {
  const { user } = useAuth();
  const role = String(user?.role || "").trim().toLowerCase();
  const isAdmin = role === "super_admin";
  const isShopOwner =
    role === "shop_owner" ||
    (role === "shop_user" && user?.shop?.role === "shop_owner");
  const can = (permission) =>
    isAdmin ||
    isShopOwner ||
    hasPermission(user?.permissions, permission);
  const canCreateProducts = can("products.create");
  const canUpdateProducts = can("products.update");
  const canDeleteProducts = can("products.delete");

  const catalogRoot = isAdmin ? "/admin/catalog" : "/shop/catalog";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editListing, setEditListing] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);

  const [uploadProductId, setUploadProductId] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [primaryUpload, setPrimaryUpload] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("0");
  const [productWeight, setProductWeight] = useState("");
  const [productWeightUnit, setProductWeightUnit] = useState("kg");
  const [variants, setVariants] = useState([EMPTY_VARIANT()]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });

      if (query.trim()) params.set("q", query.trim());
      if (filterCategory) params.set("categoryId", filterCategory);
      if (filterBrand) params.set("brandId", filterBrand);

      if (isAdmin && selectedShopId) {
        params.set("shopId", selectedShopId);
      }

      const [prodRes, catRes, subRes, brandRes, attrRes] =
        await Promise.all([
          api.get(`${catalogRoot}/products?${params.toString()}`),
          api.get(`${catalogRoot}/categories`),
          api.get(`${catalogRoot}/subcategories`),
          api.get(`${catalogRoot}/brands`),
          api.get(`${catalogRoot}/attributes`),
        ]);

      setProducts(prodRes.items || []);
      setTotal(prodRes.total || 0);
      setCategories(catRes.items || []);
      setSubcategories(subRes.items || []);
      setBrands(brandRes.items || []);
      setAttributes(attrRes.items || []);

      if (isAdmin) {
        const shopRes = await api.get("/admin/catalog/shops");
        setShops(shopRes.items || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query, filterCategory, filterBrand, selectedShopId]);

  useEffect(() => {
    const previews = imageFiles.map((file) =>
      URL.createObjectURL(file),
    );

    setImagePreviews(previews);

    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  const clearImageSelection = () => {
    setImageFiles([]);
    setImagePreviews([]);
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setName("");
    setSku("");
    setCategoryId("");
    setSubcategoryId("");
    setBrandId("");
    setShortDescription("");
    setDescription("");
    setBasePrice("0");
    setProductWeight("");
    setProductWeightUnit("kg");
    setVariants([EMPTY_VARIANT()]);
  };

  const closeProductForm = () => {
    setShowCreateModal(false);
    resetProductForm();
  };

  const openCreateForm = () => {
    setError(null);
    setSuccess(null);
    resetProductForm();
    setShowCreateModal(true);
  };

  const addVariantRow = () => {
    setVariants((current) => [
      ...current,
      {
        variantName: "",
        sku: "",
        price: "",
        wholesalePrice: "",
        retailPrice: "",
        weight: "",
        weightUnit: "kg",
        gstApplicable: false,
        gstRate: "0",
        priceIncludesGst: false,
        hsnCode: "",
        initialStock: "0",
        attributeValues: [],
      },
    ]);
  };

  const updateVariantRow = (index, field, value) => {
    setVariants((current) =>
      current.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant,
      ),
    );
  };

  const removeVariantRow = (index) => {
    setVariants((current) =>
      current.length <= 1
        ? current
        : current.filter((_, i) => i !== index),
    );
  };

  const startProductEdit = (product) => {
    setError(null);
    setSuccess(null);
    setEditingProduct(product);

    setName(product.name || "");
    setSku(product.sku || "");
    setCategoryId(
      product.categoryId != null ? String(product.categoryId) : "",
    );
    setSubcategoryId(
      product.subcategoryId != null
        ? String(product.subcategoryId)
        : "",
    );
    setBrandId(
      product.brandId != null ? String(product.brandId) : "",
    );
    setShortDescription(product.shortDescription || "");
    setDescription(product.description || "");
    setBasePrice(String(product.basePrice ?? 0));
    setProductWeight(product.weight == null ? "" : String(product.weight));
    setProductWeightUnit(product.weightUnit || "kg");

    setVariants(
      product.variants?.length
        ? product.variants.map((variant) => ({
            id: variant.id,
            variantName: variant.variantName || "",
            sku: variant.sku || "",
            price: String(variant.price ?? 0),
            wholesalePrice: String(variant.wholesalePrice ?? 0),
            retailPrice: String(
              variant.sellerListing?.retailPrice ??
                variant.retailPrice ??
                variant.price ??
                0,
            ),
            weight: variant.weight == null ? "" : String(variant.weight),
            weightUnit: variant.weightUnit || product.weightUnit || "kg",
            gstApplicable: variant.sellerListing?.gstApplicable === true,
            gstRate: String(variant.sellerListing?.gstRate ?? 0),
            priceIncludesGst: variant.sellerListing?.priceIncludesGst === true,
            hsnCode: variant.sellerListing?.hsnCode || "",
            initialStock: String(variant.inventory?.quantity ?? 0),
            isActive: variant.sellerListing?.isActive !== false,
            attributeValues: (variant.variantValues || []).map((row) => ({
              attributeId: Number(row.attributeId),
              attributeValueId: Number(row.attributeValueId),
            })),
          }))
        : [EMPTY_VARIANT()],
    );

    setShowCreateModal(true);
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const productPayload = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        categoryId: categoryId ? Number(categoryId) : null,
        subcategoryId: subcategoryId ? Number(subcategoryId) : null,
        brandId: brandId ? Number(brandId) : null,
        shortDescription,
        description,
        basePrice: Number(basePrice || 0),
        ...(productWeight !== ""
          ? { weight: Number(productWeight), weightUnit: productWeightUnit }
          : {}),
      };

      const variantPayload = variants.map((variant, index) => ({
        ...(variant.id ? { id: Number(variant.id) } : {}),
        variantName:
          variant.variantName?.trim() || `Variant ${index + 1}`,
        sku:
          variant.sku?.trim() ||
          `SKU-${Date.now().toString(36).toUpperCase()}-${index}`,
        price: Number(variant.price || 0),
        wholesalePrice: Number(variant.wholesalePrice || 0),
        retailPrice: Number(variant.retailPrice || 0),
        ...(variant.weight !== ""
          ? { weight: Number(variant.weight), weightUnit: variant.weightUnit || "kg" }
          : {}),
        initialStock: Number(variant.initialStock || 0),
        isActive: variant.isActive !== false,
        attributeValues: variant.attributeValues || [],
      }));
      if (isShopOwner) {
        variantPayload.forEach((row, index) => {
          row.gstApplicable = variants[index].gstApplicable;
          row.gstRate = Number(variants[index].gstRate || 0);
          row.priceIncludesGst = variants[index].priceIncludesGst;
          row.hsnCode = variants[index].hsnCode || null;
        });
      }

      if (editingProduct) {
        const updatePayload = { ...productPayload };

        if (isShopOwner) {
          updatePayload.variants = variantPayload;
        }

        await api.patch(
          `${catalogRoot}/products/${editingProduct.id}`,
          updatePayload,
        );

        setSuccess("Product updated successfully.");
        closeProductForm();
        await loadData();
        return;
      }

      const createPayload = {
        ...productPayload,
        categoryId: categoryId ? Number(categoryId) : undefined,
        subcategoryId: subcategoryId
          ? Number(subcategoryId)
          : undefined,
        brandId: brandId ? Number(brandId) : undefined,
        variants: variantPayload,
      };

      if (isAdmin) {
        if (!selectedShopId) {
          throw new Error("Select a shop to create its seller listing.");
        }

        createPayload.shopId = Number(selectedShopId);
      }

      await api.post(`${catalogRoot}/products`, createPayload);

      setSuccess("Product created successfully.");
      closeProductForm();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();

    if (!uploadProductId || imageFiles.length === 0) return;

    setUploadingImage(true);
    setError(null);
    setSuccess(null);

    let uploadedCount = 0;

    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const formData = new FormData();
        formData.append("image", imageFiles[i]);
        formData.append(
          "isPrimary",
          String(primaryUpload && i === 0),
        );

        await api.upload(
          `${catalogRoot}/products/${uploadProductId}/images`,
          formData,
        );

        uploadedCount++;
      }

      setSuccess(`${uploadedCount} product photo(s) uploaded successfully.`);
      setUploadProductId(null);
      clearImageSelection();
      setPrimaryUpload(false);

      await loadData();
    } catch (err) {
      setError(
        uploadedCount > 0
          ? `${uploadedCount} photo(s) uploaded before an error occurred. ${err.message || "Please retry the remaining photos."}`
          : err.message || "Failed to upload product photos.",
      );

      await loadData();
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProductImage = async (productId, imageId) => {
    if (!window.confirm("Remove this product image?")) return;

    setError(null);
    setSuccess(null);

    try {
      await api.delete(
        `${catalogRoot}/products/${productId}/images/${imageId}`,
      );

      setSuccess("Product image removed.");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to remove image.");
    }
  };

  const saveListing = async (e) => {
    e.preventDefault();
    if (!editListing) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.patch(
        `${catalogRoot}/products/${editListing.id}/listing`,
        {
          ...(isAdmin ? { shopId: Number(selectedShopId) } : {}),
          variants: editListing.variants.map((variant) => ({
            id: Number(variant.id),
            retailPrice: Number(variant.retailPrice),
            quantity: Number(variant.quantity),
            isActive: variant.isActive,
          })),
        },
      );

      setEditListing(null);
      setSuccess("Shop price and inventory updated.");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to update shop listing.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (product) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const next = !product.variants?.some(
        (variant) => variant.sellerListing?.isActive,
      );

      await api.patch(`${catalogRoot}/products/${product.id}/listing`, {
        ...(isAdmin ? { shopId: Number(selectedShopId) } : {}),
        variants: (product.variants || [])
          .filter((variant) => variant.sellerListing)
          .map((variant) => ({
            id: variant.id,
            retailPrice: Number(
              variant.sellerListing.retailPrice ?? variant.price ?? 0,
            ),
            quantity: Number(variant.inventory?.quantity || 0),
            isActive: next,
          })),
      });

      setSuccess(
        next ? "Product listing activated." : "Product listing deactivated.",
      );

      await loadData();
    } catch (err) {
      setError(err.message || "Failed to update listing.");
    } finally {
      setSaving(false);
    }
  };

  const toggleProductStatus = async (product) => {
    setError(null);
    setSuccess(null);

    try {
      await api.patch(`${catalogRoot}/products/${product.id}`, {
        isActive: !product.isActive,
      });

      setSuccess(
        product.isActive ? "Product deactivated." : "Product activated.",
      );

      await loadData();
    } catch (err) {
      setError(err.message || "Failed to update product status.");
    }
  };

  const archiveProduct = async () => {
    if (!deletingProduct || !canDeleteProducts) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.delete(`${catalogRoot}/products/${deletingProduct.id}`);

      setSuccess(
        isAdmin
          ? `${deletingProduct.name} was archived and removed from active listings.`
          : `${deletingProduct.name} was removed from this shop's active listings.`,
      );

      setDeletingProduct(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to archive product.");
    } finally {
      setSaving(false);
    }
  };

  const openPhotoManager = (product) => {
    setError(null);
    setSuccess(null);
    clearImageSelection();
    setUploadProductId(product.id);
    setPrimaryUpload(
      !(product.images || []).some((image) => image.isPrimary),
    );
  };

  const closePhotoManager = () => {
    setUploadProductId(null);
    clearImageSelection();
    setPrimaryUpload(false);
  };

  const handleImageSelection = (e) => {
    const files = Array.from(e.target.files || []);

    if (files.some((file) => file.size > MAX_IMAGE_SIZE)) {
      setError("Each image must be 5 MB or smaller.");
      clearImageSelection();
      e.target.value = "";
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];

    if (files.some((file) => !validTypes.includes(file.type))) {
      setError("Only JPEG, PNG, and WEBP images are allowed.");
      clearImageSelection();
      e.target.value = "";
      return;
    }

    setError(null);
    setImageFiles(files);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Products &amp; Catalog
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your store catalog, variants, prices, and available stock.
          </p>
        </div>

        {canCreateProducts && (
          <Button onClick={openCreateForm}>+ Add New Product</Button>
        )}
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {/* Super Admin shop selector */}
      {isAdmin && (
        <div className="w-full sm:max-w-xs">
          <select
            value={selectedShopId}
            onChange={(e) => {
              setSelectedShopId(e.target.value);
              setPage(1);
            }}
            className={CONTROL_CLASS}
          >
            <option value="">All shops / global products</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Three small filter boxes in one row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search Product"
        />

        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
          }}
          className={`${CONTROL_CLASS} min-w-0`}
        >
          <option value="">All Categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          value={filterBrand}
          onChange={(e) => {
            setFilterBrand(e.target.value);
            setPage(1);
          }}
          className={`${CONTROL_CLASS} min-w-0`}
        >
          <option value="">All Brands</option>
          {brands.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-500">
            No products in your catalog yet. Click "Add New Product" to create
            your first item.
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <Card key={product.id}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex gap-4">
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                    {product.images?.length > 0 ? (
                      <img
                        src={
                          product.images.find((image) => image.isPrimary)?.imageUrl ||
                          product.images[0].imageUrl
                        }
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">No Image</span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {product.name}
                    </h2>

                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        Category:
                        {product.category?.imageUrl && (
                          <img
                            src={product.category.imageUrl}
                            alt=""
                            className="h-5 w-5 rounded object-cover"
                          />
                        )}
                        <strong className="text-slate-700">
                          {product.category?.name || "Uncategorized"}
                        </strong>

                        {product.subcategory?.imageUrl && (
                          <img
                            src={product.subcategory.imageUrl}
                            alt=""
                            className="h-5 w-5 rounded object-cover"
                          />
                        )}
                        <strong className="text-slate-700">
                          {product.subcategory?.name || ""}
                        </strong>
                      </span>

                      <span>&bull;</span>

                      <span className="inline-flex items-center gap-1">
                        Brand:
                        {product.brand?.imageUrl && (
                          <img
                            src={product.brand.imageUrl}
                            alt=""
                            className="h-5 w-5 rounded-full object-cover"
                          />
                        )}
                        <strong className="text-slate-700">
                          {product.brand?.name || "Generic"}
                        </strong>
                      </span>

                      <span>&bull;</span>

                      <span>
                        SKU:{" "}
                        <code className="text-indigo-600">
                          {product.sku || "—"}
                        </code>
                      </span>
                    </div>

                    {product.description && (
                      <p className="mt-2 text-xs text-slate-600">
                        {product.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canUpdateProducts && (
                    <Button
                      variant="secondary"
                      disabled={!isAdmin && product.sharedAcrossShops}
                      title={
                        !isAdmin && product.sharedAcrossShops
                          ? "Shared product images are managed by Super Admin."
                          : undefined
                      }
                      onClick={() => openPhotoManager(product)}
                    >
                      Manage Photos
                    </Button>
                  )}

                  {canUpdateProducts && (!isAdmin || selectedShopId) && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setEditListing({
                          id: product.id,
                          variants: (product.variants || [])
                            .filter((variant) => variant.sellerListing)
                            .map((variant) => ({
                              id: variant.id,
                              retailPrice:
                                variant.sellerListing.retailPrice ??
                                variant.price ??
                                0,
                              quantity: variant.inventory?.quantity ?? 0,
                              isActive: variant.sellerListing.isActive,
                            })),
                        })
                      }
                    >
                      Edit shop listing
                    </Button>
                  )}

                  {canUpdateProducts && (
                    <Button
                      variant="secondary"
                      disabled={!isAdmin && product.sharedAcrossShops}
                      title={
                        !isAdmin && product.sharedAcrossShops
                          ? "Shared product details are managed by Super Admin. Edit this shop's price, stock, and availability instead."
                          : undefined
                      }
                      onClick={() => startProductEdit(product)}
                    >
                      {!isAdmin && product.sharedAcrossShops
                        ? "Edit Product (shared)"
                        : "Edit Product"}
                    </Button>
                  )}

                  {!isAdmin && canUpdateProducts && (
                    <Button
                      variant="secondary"
                      onClick={() => toggleAvailability(product)}
                      disabled={saving}
                    >
                      {product.variants?.some(
                        (variant) => variant.sellerListing?.isActive,
                      )
                        ? "Deactivate listing"
                        : "Activate listing"}
                    </Button>
                  )}

                  {isAdmin && (
                    <Button
                      variant="secondary"
                      onClick={() => toggleProductStatus(product)}
                    >
                      {product.isActive
                        ? "Deactivate product"
                        : "Activate product"}
                    </Button>
                  )}

                  {canDeleteProducts ? (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => setDeletingProduct(product)}
                    >
                      {isAdmin ? "Archive Product" : "Delete Product"}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Variant</th>
                      <th className="px-3 py-2">Variant SKU</th>
                      <th className="px-3 py-2">Wholesale Price</th>
                      <th className="px-3 py-2">My Retail Price</th>
                      <th className="px-3 py-2">Shop Inventory</th>
                      <th className="px-3 py-2">Status</th>
                      {isAdmin && !selectedShopId && (
                        <th className="px-3 py-2">Shop listings</th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {product.variants?.map((variant) => (
                      <tr key={variant.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">
                          {variant.variantName}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500">
                          {variant.sku}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          ₹{Number(variant.wholesalePrice || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          ₹
                          {Number(
                            variant.sellerListing?.retailPrice ??
                              variant.retailPrice ??
                              variant.price ??
                              0,
                          ).toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 font-bold ${
                              (variant.inventory?.quantity || 0) <= 5
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {variant.inventory?.quantity ?? 0} in stock
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {isAdmin && !selectedShopId
                            ? variant.listings?.some((listing) => listing.isActive)
                              ? "Active in shop(s)"
                              : "No active listing"
                            : variant.sellerListing?.isActive
                              ? "Active"
                              : "Inactive"}
                        </td>

                        {isAdmin && !selectedShopId && (
                          <td className="px-3 py-2">
                            {variant.listings
                              ?.map((listing) => listing.shop?.name)
                              .filter(Boolean)
                              .join(", ") || "Not listed"}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && total > 20 && (
        <div className="flex items-center justify-end gap-3">
          <span className="text-sm text-slate-600">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create/Edit Product popup */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-xl font-bold text-slate-900">
                {editingProduct
                  ? "Edit Product with Dynamic Variants"
                  : "Create Product with Dynamic Variants"}
              </h2>

              <button
                type="button"
                onClick={closeProductForm}
                className="text-2xl font-bold text-slate-400 hover:text-slate-600"
                aria-label="Close product form"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="mt-4 space-y-6">
              <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                {isAdmin && !editingProduct && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Select Shop *
                    </label>
                    <select
                      required
                      value={selectedShopId}
                      onChange={(e) => setSelectedShopId(e.target.value)}
                      className={`${CONTROL_CLASS} mt-1`}
                    >
                      <option value="">Select shop</option>
                      {shops.map((shop) => (
                        <option key={shop.id} value={shop.id}>
                          {shop.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Product Name *
                  </label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Slim Fit Cotton Shirt"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Master SKU
                  </label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. SHIRT-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setSubcategoryId("");
                    }}
                    className={`${CONTROL_CLASS} mt-1`}
                  >
                    <option value="">Select category...</option>
                    {categories
                      .filter((category) => category.isActive)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Subcategory
                  </label>
                  <select
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                    className={`${CONTROL_CLASS} mt-1`}
                  >
                    <option value="">Select subcategory...</option>
                    {subcategories
                      .filter(
                        (subcategory) =>
                          String(subcategory.categoryId) === String(categoryId) &&
                          subcategory.isActive,
                      )
                      .map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Brand
                  </label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className={`${CONTROL_CLASS} mt-1`}
                  >
                    <option value="">Select brand...</option>
                    {brands
                      .filter((brand) => brand.isActive)
                      .map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Base Price (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                  />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Product Weight
                    </label>
                    <div className="mt-1 flex gap-2">
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={productWeight}
                        onChange={(event) => setProductWeight(event.target.value)}
                        placeholder="Required unless each variant has a weight"
                      />
                      <select
                        value={productWeightUnit}
                        onChange={(event) => setProductWeightUnit(event.target.value)}
                        className={CONTROL_CLASS}
                        aria-label="Product weight unit"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                      </select>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Used for delivery charges when a variant does not have its own weight.
                    </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Short Description
                  </label>
                  <textarea
                    rows={2}
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    className={`${CONTROL_CLASS} mt-1`}
                    placeholder="Enter a short product summary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`${CONTROL_CLASS} mt-1`}
                    placeholder="Enter detailed product description"
                  />
                </div>
              </div>

              {(!editingProduct || isShopOwner) && (
                <div className="border-t pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">
                      Product Variants
                    </h3>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addVariantRow}
                    >
                      + Add Variant
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {variants.map((variant, index) => (
                      <div
                        key={variant.id ?? index}
                        className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs"
                      >
                        <div className="min-w-32 flex-1">
                          <label className="mb-1 block font-medium text-slate-600">
                            Variant Name
                          </label>
                          <Input
                            required
                            value={variant.variantName}
                            onChange={(e) =>
                              updateVariantRow(index, "variantName", e.target.value)
                            }
                            placeholder="e.g. Size XL, Blue"
                          />
                        </div>

                        <div className="w-28">
                          <label className="mb-1 block font-medium text-slate-600">
                            Variant SKU
                          </label>
                          <Input
                            required
                            value={variant.sku}
                            onChange={(e) =>
                              updateVariantRow(index, "sku", e.target.value)
                            }
                            placeholder="e.g. XL-BLU"
                          />
                        </div>

                        {attributes
                          .filter((attribute) => attribute.values?.length)
                          .map((attribute) => {
                            const selected = variant.attributeValues?.find(
                              (entry) =>
                                Number(entry.attributeId) === Number(attribute.id),
                            );

                            return (
                              <label key={attribute.id} className="w-32">
                                {attribute.name}
                                <select
                                  value={selected?.attributeValueId || ""}
                                  onChange={(e) =>
                                    setVariants((current) =>
                                      current.map((row, rowIndex) => {
                                        if (rowIndex !== index) return row;

                                        const remaining = (
                                          row.attributeValues || []
                                        ).filter(
                                          (entry) =>
                                            Number(entry.attributeId) !==
                                            Number(attribute.id),
                                        );

                                        if (e.target.value) {
                                          remaining.push({
                                            attributeId: Number(attribute.id),
                                            attributeValueId: Number(e.target.value),
                                          });
                                        }

                                        return {
                                          ...row,
                                          attributeValues: remaining,
                                        };
                                      }),
                                    )
                                  }
                                  className={`${CONTROL_CLASS} mt-1`}
                                >
                                  <option value="">No value</option>
                                  {attribute.values.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.value}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            );
                          })}

                        <div className="w-28">
                          <label className="mb-1 block font-medium text-slate-600">
                            Wholesale Price (₹)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={variant.price}
                            onChange={(e) =>
                              updateVariantRow(index, "price", e.target.value)
                            }
                          />
                        </div>

                        <div className="w-28">
                          <label className="mb-1 block font-medium text-slate-600">
                            Marked Price (₹)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={variant.wholesalePrice}
                            onChange={(e) =>
                              updateVariantRow(index, "wholesalePrice", e.target.value)
                            }
                          />
                        </div>

                        <div className="w-28">
                          <label className="mb-1 block font-medium text-slate-600">
                            Selling Price (₹)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={variant.retailPrice}
                            onChange={(e) =>
                              updateVariantRow(index, "retailPrice", e.target.value)
                            }
                          />
                        </div>

                        <div className="w-28">
                          <label className="mb-1 block font-medium text-slate-600">
                            Stock
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            required
                            value={variant.initialStock}
                            onChange={(e) =>
                              updateVariantRow(index, "initialStock", e.target.value)
                            }
                          />
                        </div>

                        <div className="w-32">
                          <label className="mb-1 block font-medium text-slate-600">
                            Variant Weight
                          </label>
                          <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={variant.weight}
                            onChange={(event) =>
                              updateVariantRow(index, "weight", event.target.value)
                            }
                            placeholder="Use product weight"
                          />
                        </div>
                        <div className="w-20">
                          <label className="mb-1 block font-medium text-slate-600">
                            Unit
                          </label>
                          <select
                            value={variant.weightUnit || productWeightUnit}
                            onChange={(event) =>
                              updateVariantRow(index, "weightUnit", event.target.value)
                            }
                            className={CONTROL_CLASS}
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                          </select>
                        </div>
                        {isShopOwner && (
                          <>
                            <div className="w-28">
                              <label className="mb-1 block font-medium text-slate-600">
                                GST applies
                              </label>
                              <select
                                value={variant.gstApplicable ? "yes" : "no"}
                                onChange={(event) =>
                                  updateVariantRow(index, "gstApplicable", event.target.value === "yes")
                                }
                                className={CONTROL_CLASS}
                              >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                              </select>
                            </div>
                            {variant.gstApplicable && (
                              <>
                                <div className="w-28">
                                  <label className="mb-1 block font-medium text-slate-600">
                                    GST Rate (%)
                                  </label>
                                  <Input
                                    type="number"
                                    min="0.01"
                                    max="28"
                                    step="0.01"
                                    required
                                    value={variant.gstRate}
                                    onChange={(event) =>
                                      updateVariantRow(index, "gstRate", event.target.value)
                                    }
                                  />
                                </div>
                                <div className="w-32">
                                  <label className="mb-1 block font-medium text-slate-600">
                                    Price includes GST
                                  </label>
                                  <select
                                    value={variant.priceIncludesGst ? "yes" : "no"}
                                    onChange={(event) =>
                                      updateVariantRow(index, "priceIncludesGst", event.target.value === "yes")
                                    }
                                    className={CONTROL_CLASS}
                                  >
                                    <option value="no">No, add GST</option>
                                    <option value="yes">Yes, included</option>
                                  </select>
                                </div>
                                <div className="w-32">
                                  <label className="mb-1 block font-medium text-slate-600">
                                    HSN Code
                                  </label>
                                  <Input
                                    value={variant.hsnCode}
                                    onChange={(event) =>
                                      updateVariantRow(index, "hsnCode", event.target.value)
                                    }
                                    maxLength={20}
                                  />
                                </div>
                              </>
                            )}
                          </>
                        )}

                        {isShopOwner && (
                          <div className="w-28">
                            <label className="mb-1 block font-medium text-slate-600">
                              Listing status
                            </label>
                            <select
                              value={
                                variant.isActive === false ? "inactive" : "active"
                              }
                              onChange={(e) =>
                                updateVariantRow(
                                  index,
                                  "isActive",
                                  e.target.value === "active",
                                )
                              }
                              className={`${CONTROL_CLASS} mt-1`}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                        )}

                        {variants.length > 1 && (
                          <div className="pt-5">
                            <button
                              type="button"
                              onClick={() => removeVariantRow(index)}
                              className="rounded p-1 text-rose-600 hover:bg-rose-50"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeProductForm}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingProduct
                      ? "Save Changes"
                      : "Create Product"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Product Photos */}
      {uploadProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              Manage product photos
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select multiple JPEG, PNG, or WEBP photos. Each image can be up
              to 5 MB.
            </p>

            <div className="my-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {products
                .find((item) => String(item.id) === String(uploadProductId))
                ?.images?.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-square overflow-hidden rounded-lg border"
                  >
                    <img
                      src={image.imageUrl}
                      alt="Product"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-slate-950/75 px-1.5 py-0.5 text-[10px] text-white">
                      {image.isPrimary ? "Primary" : "Gallery"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeProductImage(uploadProductId, image.id)}
                      className="absolute right-1 top-1 rounded-full bg-white px-2 py-1 text-sm text-rose-700 shadow"
                      aria-label="Remove product image"
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>

            <form onSubmit={handleImageUpload} className="mt-4 space-y-4">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageSelection}
                className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
              />

              {imageFiles.length > 0 && (
                <>
                  <p className="text-sm font-medium text-slate-700">
                    {imageFiles.length} photo(s) selected
                  </p>

                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {imageFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="overflow-hidden rounded-lg border"
                      >
                        <img
                          src={imagePreviews[index]}
                          alt={file.name}
                          className="h-24 w-full object-cover"
                        />
                        <p className="truncate p-1 text-xs text-slate-600">
                          {file.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={primaryUpload}
                  onChange={(e) => setPrimaryUpload(e.target.checked)}
                />
                Set the first selected photo as primary product image
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploadingImage}
                  onClick={closePhotoManager}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploadingImage || imageFiles.length === 0}
                >
                  {uploadingImage ? "Uploading..." : "Upload Photos"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Shop Listing */}
      {canUpdateProducts && (!isAdmin || selectedShopId) && editListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold">Edit shop listing</h2>
            <p className="mt-1 text-sm text-slate-500">
              Updates only this shop's prices, stock, and listing availability.
            </p>

            {editListing.variants.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">
                No shop variants are available to edit.
              </p>
            ) : (
              <form onSubmit={saveListing} className="mt-4 space-y-3">
                {editListing.variants.map((variant, index) => (
                  <div
                    key={variant.id}
                    className="grid grid-cols-2 gap-3 rounded border p-3"
                  >
                    <label className="text-sm">
                      Retail price
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={variant.retailPrice}
                        onChange={(e) =>
                          setEditListing((current) => ({
                            ...current,
                            variants: current.variants.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, retailPrice: e.target.value }
                                : row,
                            ),
                          }))
                        }
                      />
                    </label>

                    <label className="text-sm">
                      Stock quantity
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={variant.quantity}
                        onChange={(e) =>
                          setEditListing((current) => ({
                            ...current,
                            variants: current.variants.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, quantity: e.target.value }
                                : row,
                            ),
                          }))
                        }
                      />
                    </label>

                    <label className="text-sm">
                      Listing status
                      <select
                        value={variant.isActive === false ? "inactive" : "active"}
                        onChange={(e) =>
                          setEditListing((current) => ({
                            ...current,
                            variants: current.variants.map((row, rowIndex) =>
                              rowIndex === index
                                ? {
                                    ...row,
                                    isActive: e.target.value === "active",
                                  }
                                : row,
                            ),
                          }))
                        }
                        className={`${CONTROL_CLASS} mt-1`}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </label>
                  </div>
                ))}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditListing(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save shop listing"}
                  </Button>
                </div>
              </form>
            )}

            {editListing.variants.length === 0 && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setEditListing(null)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete / Archive Product Confirmation */}
      {canDeleteProducts && deletingProduct && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setDeletingProduct(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-product-title"
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"
          >
            <h2 id="archive-product-title" className="text-lg font-semibold">
              {isAdmin
                ? "Archive product"
                : "Delete product from this shop"}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {isAdmin ? (
                <>
                  Archive <strong>{deletingProduct.name}</strong>? This
                  deactivates the shared product and all shop listings while
                  preserving order and inventory history.
                </>
              ) : (
                <>
                  Remove <strong>{deletingProduct.name}</strong> from this
                  shop's active listings? The shared catalog record, other
                  shops' listings, inventory, and order history are preserved.
                </>
              )}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => setDeletingProduct(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={saving}
                disabled={saving}
                onClick={archiveProduct}
              >
                {saving
                  ? isAdmin
                    ? "Archiving…"
                    : "Deleting…"
                  : isAdmin
                    ? "Archive product"
                    : "Delete product"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
