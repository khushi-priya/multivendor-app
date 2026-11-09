

// import { useEffect, useMemo, useState } from "react";
// import { Link, useSearchParams } from "react-router-dom";
// import { api } from "../../services/api.js";
// import { Alert, Card, Input, Spinner } from "../../components/ui.jsx";

// export default function CustomerProducts() {
//   const [params, setParams] = useSearchParams();
//   const [products, setProducts] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [brands, setBrands] = useState([]);
//   const [total, setTotal] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const [search, setSearch] = useState(params.get("q") || "");
//   const [minPrice, setMinPrice] = useState(params.get("minPrice") || "");
//   const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") || "");

//   const page = Math.max(1, Number(params.get("page") || 1));
//   const categoryId = params.get("categoryId") || "";
//   const subcategoryId = params.get("subcategoryId") || "";
//   const brandId = params.get("brandId") || "";
//   const sort = params.get("sort") || "newest";
//   const availability = params.get("availability") || "all";
//   const shopId = params.get("shopId") || "";

//   const activeSubcategories = useMemo(
//     () =>
//       categories.find(
//         (category) => String(category.id) === categoryId
//       )?.subcategories || [],
//     [categories, categoryId]
//   );

//   const updateParam = (key, value) =>
//     setParams((old) => {
//       const next = new URLSearchParams(old);

//       if (value) next.set(key, value);
//       else next.delete(key);

//       if (key !== "page") next.delete("page");

//       return next;
//     });

//   useEffect(() => {
//     setLoading(true);
//     setError("");

//     const query = new URLSearchParams(params);
//     query.set("page", page);
//     query.set("pageSize", "12");

//     Promise.all([
//       api.get(`/store/products?${query}`),
//       api.get("/store/categories"),
//       api.get("/store/brands"),
//     ])
//       .then(([productsResponse, categoryResponse, brandResponse]) => {
//         setProducts(productsResponse.items || []);
//         setTotal(productsResponse.total || 0);
//         setCategories(categoryResponse.items || []);
//         setBrands(brandResponse.items || []);
//       })
//       .catch((err) =>
//         setError(err.message || "Unable to load products")
//       )
//       .finally(() => setLoading(false));
//   }, [params.toString()]);

//   const submitSearch = (event) => {
//     event.preventDefault();

//     if (
//       minPrice &&
//       maxPrice &&
//       Number(minPrice) > Number(maxPrice)
//     ) {
//       setError("Minimum price cannot exceed maximum price.");
//       return;
//     }

//     setError("");

//     setParams((old) => {
//       const next = new URLSearchParams(old);

//       if (search.trim()) next.set("q", search.trim());
//       else next.delete("q");

//       if (minPrice) next.set("minPrice", minPrice);
//       else next.delete("minPrice");

//       if (maxPrice) next.set("maxPrice", maxPrice);
//       else next.delete("maxPrice");

//       next.delete("page");

//       return next;
//     });
//   };

//   const pages = Math.max(1, Math.ceil(total / 12));

//   return (
//     <div className="space-y-6">

    

//       {error && <Alert variant="error">{error}</Alert>}

//       {/* Search and Filters */}
//       <Card className="border border-slate-200 bg-white p-4 shadow-sm">
//         <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">

//           <form
//             onSubmit={submitSearch}
//             className="flex gap-2 xl:col-span-2"
//           >
//             <Input
//               value={search}
//               onChange={(event) => setSearch(event.target.value)}
//               placeholder="Search products"
//               aria-label="Search products"
//             />

//             <button
//               type="submit"
//               className="rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-700"
//             >
//               Search
//             </button>
//           </form>

//           <select
//             aria-label="Category"
//             value={categoryId}
//             onChange={(event) =>
//               setParams((old) => {
//                 const next = new URLSearchParams(old);

//                 if (event.target.value)
//                   next.set("categoryId", event.target.value);
//                 else next.delete("categoryId");

//                 next.delete("subcategoryId");
//                 next.delete("page");

//                 return next;
//               })
//             }
//             className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
//           >
//             <option value="">All categories</option>

//             {categories.map((item) => (
//               <option key={item.id} value={item.id}>
//                 {item.name}
//               </option>
//             ))}
//           </select>

//           <select
//             aria-label="Subcategory"
//             value={subcategoryId}
//             onChange={(event) =>
//               updateParam("subcategoryId", event.target.value)
//             }
//             disabled={!categoryId}
//             className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:bg-slate-100"
//           >
//             <option value="">All subcategories</option>

//             {activeSubcategories.map((item) => (
//               <option key={item.id} value={item.id}>
//                 {item.name}
//               </option>
//             ))}
//           </select>

//           <select
//             aria-label="Brand"
//             value={brandId}
//             onChange={(event) =>
//               updateParam("brandId", event.target.value)
//             }
//             className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
//           >
//             <option value="">All brands</option>

//             {brands.map((item) => (
//               <option key={item.id} value={item.id}>
//                 {item.name}
//               </option>
//             ))}
//           </select>

//           <select
//             aria-label="Availability"
//             value={availability}
//             onChange={(event) =>
//               updateParam("availability", event.target.value)
//             }
//             className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
//           >
//             <option value="all">Any availability</option>
//             <option value="in_stock">In stock</option>
//           </select>

//           <select
//             aria-label="Sort products"
//             value={sort}
//             onChange={(event) =>
//               updateParam("sort", event.target.value)
//             }
//             className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
//           >
//             <option value="newest">Newest</option>
//             <option value="name_asc">Name A–Z</option>
//             <option value="name_desc">Name Z–A</option>
//             <option value="price_asc">Price low to high</option>
//             <option value="price_desc">Price high to low</option>
//           </select>

//           <Input
//             type="number"
//             min="0"
//             step="0.01"
//             aria-label="Minimum price"
//             placeholder="Min price"
//             value={minPrice}
//             onChange={(event) => setMinPrice(event.target.value)}
//           />

//           <Input
//             type="number"
//             min="0"
//             step="0.01"
//             aria-label="Maximum price"
//             placeholder="Max price"
//             value={maxPrice}
//             onChange={(event) => setMaxPrice(event.target.value)}
//           />

//         </div>
//       </Card>

//       {/* Product Count and Clear Filters */}
//       <div className="flex items-center justify-between text-sm text-slate-500">
//         <span>
//           {total} product{total === 1 ? "" : "s"} found
//           {shopId ? " in this store" : ""}
//         </span>

//         {[
//           categoryId,
//           subcategoryId,
//           brandId,
//           search,
//           minPrice,
//           maxPrice,
//           availability !== "all" ? availability : "",
//         ].some(Boolean) && (
//           <button
//             onClick={() => {
//               setSearch("");
//               setMinPrice("");
//               setMaxPrice("");
//               setParams(shopId ? { shopId } : {});
//             }}
//             className="font-semibold text-slate-700 hover:text-slate-900"
//           >
//             Clear filters
//           </button>
//         )}
//       </div>

//       {/* Products */}
//       {loading ? (
//         <Spinner />
//       ) : products.length === 0 ? (
//         <Card className="border border-slate-200 bg-white shadow-sm">
//           <div className="py-12 text-center">
//             <p className="font-semibold text-slate-900">
//               No products found
//             </p>

//             <p className="mt-1 text-sm text-slate-500">
//               Try changing your search or filters.
//             </p>
//           </div>
//         </Card>
//       ) : (
//         <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

//           {products.map((product) => {
//             const variants = product.variants || [];

//             const listings = variants.flatMap(
//               (variant) => variant.listings || []
//             );

//             const best = [...listings].sort(
//               (a, b) =>
//                 Number(a.retailPrice) - Number(b.retailPrice)
//             )[0];

//             const image = product.images?.[0]?.imageUrl;

//             return (
//               <Link
//                 key={product.id}
//                 to={`/customer/products/${product.id}`}
//                 className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
//               >
//                 <div className="aspect-[4/3] bg-slate-100">

//                   {image ? (
//                     <img
//                       src={image}
//                       alt={product.name}
//                       className="h-full w-full object-cover transition group-hover:scale-[1.02]"
//                     />
//                   ) : (
//                     <div className="grid h-full place-items-center text-sm text-slate-400">
//                       Product image unavailable
//                     </div>
//                   )}

//                 </div>

//                 <div className="space-y-2 p-4">

//                   <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
//                     {product.category?.name || "Catalog"}
//                   </p>

//                   {/* Product Name with Small Rating Badge */}
//                   <div className="flex items-start justify-between gap-2">
//                     <h2 className="min-w-0 flex-1 line-clamp-2 font-bold text-slate-900">
//                       {product.name}
//                     </h2>

//                     {Number(product.reviewCount) > 0 && (
//                       <span
//                         className="mt-0.5 flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
//                         aria-label={`${Number(product.ratingAverage).toFixed(1)} out of 5 stars, ${product.reviewCount} reviews`}
//                         title={`${Number(product.reviewCount).toLocaleString("en-IN")} reviews`}
//                       >
//                         {Number(product.ratingAverage).toFixed(1)}
//                         <span className="text-amber-500">★</span>
//                         <span className="text-slate-500">
//                           ({Number(product.reviewCount).toLocaleString("en-IN")})
//                         </span>
//                       </span>
//                     )}
//                   </div>

//                   <p className="text-xs text-slate-500">
//                     {product.brand?.name || "Unbranded"} ·{" "}
//                     {variants.length} option
//                     {variants.length === 1 ? "" : "s"}
//                   </p>

//                   <div className="flex items-end justify-between border-t border-slate-200 pt-3">

//                     <span className="text-lg font-extrabold text-slate-900">
//                       {best
//                         ? `₹${Number(best.retailPrice).toFixed(2)}`
//                         : "Price unavailable"}
//                     </span>

//                     <span
//                       className={`text-xs font-semibold ${
//                         best?.stock > 0
//                           ? "text-emerald-700"
//                           : "text-slate-500"
//                       }`}
//                     >
//                       {best?.stock > 0
//                         ? `${best.stock} in stock`
//                         : "Check options"}
//                     </span>

//                   </div>
//                   {best?.gstApplicable && (
//                     <p className="text-xs text-slate-500">
//                       GST {Number(best.gstRate).toFixed(2)}% {best.priceIncludesGst ? 'included' : 'added at checkout'}
//                     </p>
//                   )}
//                 </div>
//               </Link>
//             );
//           })}

//         </div>
//       )}

//       {/* Pagination */}
//       {!loading && pages > 1 && (
//         <div className="flex items-center justify-center gap-4">

//           <button
//             disabled={page <= 1}
//             onClick={() => updateParam("page", String(page - 1))}
//             className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
//           >
//             Previous
//           </button>

//           <span className="text-sm text-slate-600">
//             Page {page} of {pages}
//           </span>

//           <button
//             disabled={page >= pages}
//             onClick={() => updateParam("page", String(page + 1))}
//             className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
//           >
//             Next
//           </button>

//         </div>
//       )}

//     </div>
//   );
// }



import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../services/api.js";
import { Alert, Card, Input, Spinner } from "../../components/ui.jsx";

export default function CustomerProducts() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(params.get("q") || "");
  const [minPrice, setMinPrice] = useState(params.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") || "");

  const page = Math.max(1, Number(params.get("page") || 1));
  const categoryId = params.get("categoryId") || "";
  const subcategoryId = params.get("subcategoryId") || "";
  const brandId = params.get("brandId") || "";
  const sort = params.get("sort") || "newest";
  const availability = params.get("availability") || "all";
  const shopId = params.get("shopId") || "";

  const activeSubcategories = useMemo(
    () =>
      categories.find(
        (category) => String(category.id) === categoryId
      )?.subcategories || [],
    [categories, categoryId]
  );

  const updateParam = (key, value) =>
    setParams((old) => {
      const next = new URLSearchParams(old);

      if (value) next.set(key, value);
      else next.delete(key);

      if (key !== "page") next.delete("page");

      return next;
    });

  useEffect(() => {
    setLoading(true);
    setError("");

    const query = new URLSearchParams(params);
    query.set("page", page);
    query.set("pageSize", "12");

    Promise.all([
      api.get(`/store/products?${query}`),
      api.get("/store/categories"),
      api.get("/store/brands"),
    ])
      .then(([productsResponse, categoryResponse, brandResponse]) => {
        setProducts(productsResponse.items || []);
        setTotal(productsResponse.total || 0);
        setCategories(categoryResponse.items || []);
        setBrands(brandResponse.items || []);
      })
      .catch((err) =>
        setError(err.message || "Unable to load products")
      )
      .finally(() => setLoading(false));
  }, [params.toString()]);

  const submitSearch = (event) => {
    event.preventDefault();

    if (
      minPrice &&
      maxPrice &&
      Number(minPrice) > Number(maxPrice)
    ) {
      setError("Minimum price cannot exceed maximum price.");
      return;
    }

    setError("");

    setParams((old) => {
      const next = new URLSearchParams(old);

      if (search.trim()) next.set("q", search.trim());
      else next.delete("q");

      if (minPrice) next.set("minPrice", minPrice);
      else next.delete("minPrice");

      if (maxPrice) next.set("maxPrice", maxPrice);
      else next.delete("maxPrice");

      next.delete("page");

      return next;
    });
  };

  const pages = Math.max(1, Math.ceil(total / 12));

  return (
    <div className="space-y-6">

      {error && <Alert variant="error">{error}</Alert>}

      {/* Search and Filters */}
      <Card className="border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">

          <form
            onSubmit={submitSearch}
            className="flex gap-2 xl:col-span-2"
          >
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
              aria-label="Search products"
            />

            <button
              type="submit"
              className="rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Search
            </button>
          </form>

          <select
            aria-label="Category"
            value={categoryId}
            onChange={(event) =>
              setParams((old) => {
                const next = new URLSearchParams(old);

                if (event.target.value)
                  next.set("categoryId", event.target.value);
                else next.delete("categoryId");

                next.delete("subcategoryId");
                next.delete("page");

                return next;
              })
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
          >
            <option value="">All categories</option>

            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Subcategory"
            value={subcategoryId}
            onChange={(event) =>
              updateParam("subcategoryId", event.target.value)
            }
            disabled={!categoryId}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:bg-slate-100"
          >
            <option value="">All subcategories</option>

            {activeSubcategories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Brand"
            value={brandId}
            onChange={(event) =>
              updateParam("brandId", event.target.value)
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="">All brands</option>

            {brands.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Availability"
            value={availability}
            onChange={(event) =>
              updateParam("availability", event.target.value)
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">Any availability</option>
            <option value="in_stock">In stock</option>
          </select>

          <select
            aria-label="Sort products"
            value={sort}
            onChange={(event) =>
              updateParam("sort", event.target.value)
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="newest">Newest</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="price_asc">Price low to high</option>
            <option value="price_desc">Price high to low</option>
          </select>

          <Input
            type="number"
            min="0"
            step="0.01"
            aria-label="Minimum price"
            placeholder="Min price"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
          />

          <Input
            type="number"
            min="0"
            step="0.01"
            aria-label="Maximum price"
            placeholder="Max price"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
          />

        </div>
      </Card>

      {/* Product Count and Clear Filters */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {total} product{total === 1 ? "" : "s"} found
          {shopId ? " in this store" : ""}
        </span>

        {[
          categoryId,
          subcategoryId,
          brandId,
          search,
          minPrice,
          maxPrice,
          availability !== "all" ? availability : "",
        ].some(Boolean) && (
          <button
            onClick={() => {
              setSearch("");
              setMinPrice("");
              setMaxPrice("");
              setParams(shopId ? { shopId } : {});
            }}
            className="font-semibold text-slate-700 hover:text-slate-900"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Products */}
      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <Card className="border border-slate-200 bg-white shadow-sm">
          <div className="py-12 text-center">
            <p className="font-semibold text-slate-900">
              No products found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or filters.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {products.map((product) => {
            const variants = product.variants || [];

            const listings = variants.flatMap(
              (variant) => variant.listings || []
            );

            const best = [...listings].sort(
              (a, b) =>
                Number(a.retailPrice) - Number(b.retailPrice)
            )[0];

            const image = product.images?.[0]?.imageUrl;
            const reviewCount = Number(product.reviewCount || 0);
            const ratingAverage = Number(product.ratingAverage || 0);

            return (
              <Link
                key={product.id}
                to={`/customer/products/${product.id}`}
                className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Product Image with Rating at Bottom Right */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">

                  {image ? (
                    <img
                      src={image}
                      alt={product.name}
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-slate-400">
                      Product image unavailable
                    </div>
                  )}

                  {/* Show rating only when reviews exist */}
                  {reviewCount > 0 && (
                    <span
                      className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-md"
                      title={`View ${reviewCount} reviews`}
                      aria-label={`${ratingAverage.toFixed(1)} out of 5 stars, ${reviewCount} reviews`}
                    >
                      <span>{ratingAverage.toFixed(1)}</span>

                      <span className="text-amber-500">★</span>

                      <span className="text-slate-500">
                        ({reviewCount.toLocaleString("en-IN")})
                      </span>
                    </span>
                  )}

                </div>

                <div className="space-y-2 p-4">

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {product.category?.name || "Catalog"}
                  </p>

                  {/* Product Name */}
                  <h2 className="line-clamp-2 font-bold text-slate-900">
                    {product.name}
                  </h2>

                  <p className="text-xs text-slate-500">
                    {product.brand?.name || "Unbranded"} ·{" "}
                    {variants.length} option
                    {variants.length === 1 ? "" : "s"}
                  </p>

                  <div className="flex items-end justify-between border-t border-slate-200 pt-3">

                    <span className="text-lg font-extrabold text-slate-900">
                      {best
                        ? `₹${Number(best.retailPrice).toFixed(2)}`
                        : "Price unavailable"}
                    </span>

                    <span
                      className={`text-xs font-semibold ${
                        best?.stock > 0
                          ? "text-emerald-700"
                          : "text-slate-500"
                      }`}
                    >
                      {best?.stock > 0
                        ? `${best.stock} in stock`
                        : "Check options"}
                    </span>

                  </div>

                  {best?.gstApplicable && (
                    <p className="text-xs text-slate-500">
                      GST {Number(best.gstRate).toFixed(2)}%{" "}
                      {best.priceIncludesGst
                        ? "included"
                        : "added at checkout"}
                    </p>
                  )}

                </div>
              </Link>
            );
          })}

        </div>
      )}

      {/* Pagination */}
      {!loading && pages > 1 && (
        <div className="flex items-center justify-center gap-4">

          <button
            disabled={page <= 1}
            onClick={() => updateParam("page", String(page - 1))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm text-slate-600">
            Page {page} of {pages}
          </span>

          <button
            disabled={page >= pages}
            onClick={() => updateParam("page", String(page + 1))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>

        </div>
      )}

    </div>
  );
}
