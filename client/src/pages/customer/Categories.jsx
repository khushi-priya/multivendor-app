


// import { useEffect, useState } from 'react';
// import { Link } from 'react-router-dom';
// import { api } from '../../services/api.js';
// import { Alert, Card, Spinner } from '../../components/ui.jsx';

// export default function CustomerCategories() {
//   const [categories, setCategories] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     api
//       .get('/store/categories')
//       .then((res) => setCategories(res.items || []))
//       .catch((err) => setError(err.message))
//       .finally(() => setLoading(false));
//   }, []);

//   if (loading) return <Spinner />;

//   return (
//     <div className="space-y-6">

//       {/* Page Header */}
//       <section className="rounded-lg border border-slate-200 bg-white px-6 py-6 shadow-sm">
//         <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
//           Explore Store
//         </p>

//         <h1 className="mt-2 text-2xl font-bold text-slate-900">
//           Explore Catalog Categories
//         </h1>

//         <p className="mt-2 text-sm text-slate-600">
//           Browse all product departments and specialized subcategories.
//         </p>
//       </section>

//       {/* Error Message */}
//       {error && <Alert variant="error">{error}</Alert>}

//       {/* Empty State */}
//       {categories.length === 0 ? (
//         <Card className="border border-slate-200 bg-white shadow-sm">
//           <div className="py-12 text-center">
//             <p className="font-semibold text-slate-900">
//               No categories found
//             </p>

//             <p className="mt-1 text-sm text-slate-500">
//               Categories will appear here when they are available.
//             </p>
//           </div>
//         </Card>
//       ) : (

//         /* Category Cards */
//         <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

//           {categories.map((c) => (
//             <Card
//               key={c.id}
//               className="overflow-hidden border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
//             >

//               {/* Category Image */}
//               {c.imageUrl ? (
//                 <img
//                   src={c.imageUrl}
//                   alt={c.name}
//                   className="mb-4 h-40 w-full rounded-lg bg-slate-100 object-cover"
//                 />
//               ) : (
//                 <div className="mb-4 grid h-40 w-full place-items-center rounded-lg bg-slate-100 text-sm text-slate-400">
//                   Category image unavailable
//                 </div>
//               )}

//               {/* Category Name */}
//               <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">

//                 <Link
//                   to={`/products?categoryId=${c.id}`}
//                   className="text-lg font-bold text-slate-900 hover:text-slate-600"
//                 >
//                   {c.name}
//                 </Link>

//                 <span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
//                   {c.subcategories?.length || 0} subcategories
//                 </span>

//               </div>

//               {/* Category Description */}
//               {c.description && (
//                 <p className="mt-3 text-sm leading-relaxed text-slate-600">
//                   {c.description}
//                 </p>
//               )}

//               {/* Subcategories */}
//               <div className="mt-4 flex flex-wrap gap-2">

//                 {c.subcategories && c.subcategories.length > 0 ? (
//                   c.subcategories.map((sub) => (
//                     <Link
//                       key={sub.id}
//                       to={`/products?subcategoryId=${sub.id}`}
//                       className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
//                     >

//                       {sub.imageUrl && (
//                         <img
//                           src={sub.imageUrl}
//                           alt=""
//                           className="h-6 w-6 rounded object-cover"
//                         />
//                       )}

//                       {sub.name}

//                     </Link>
//                   ))
//                 ) : (

//                   <Link
//                     to={`/products?categoryId=${c.id}`}
//                     className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline"
//                   >
//                     Browse all {c.name} products →
//                   </Link>

//                 )}

//               </div>

//             </Card>
//           ))}

//         </div>
//       )}

//     </div>
//   );
// }


import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Alert, Card, Spinner } from '../../components/ui.jsx';

export default function CustomerCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/store/categories')
      .then((res) => setCategories(res.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="rounded-lg border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Explore Store
        </p>

        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Explore Catalog Categories
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Browse all product departments and specialized subcategories.
        </p>
      </section>

      {/* Error Message */}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Empty State */}
      {categories.length === 0 ? (
        <Card className="border border-slate-200 bg-white shadow-sm">
          <div className="py-12 text-center">
            <p className="font-semibold text-slate-900">
              No categories found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Categories will appear here when they are available.
            </p>
          </div>
        </Card>
      ) : (
        /* Category Cards */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card
              key={c.id}
              className="overflow-hidden border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              {/* Clickable Category Image */}
              <Link
                to={`/products?categoryId=${c.id}`}
                className="block"
                aria-label={`Browse ${c.name} products`}
              >
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt={c.name}
                    className="mb-4 h-40 w-full cursor-pointer rounded-lg bg-slate-100 object-cover transition duration-200 hover:opacity-90"
                  />
                ) : (
                  <div className="mb-4 grid h-40 w-full cursor-pointer place-items-center rounded-lg bg-slate-100 text-sm text-slate-400 transition hover:bg-slate-200">
                    Category image unavailable
                  </div>
                )}
              </Link>

              {/* Category Name */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <Link
                  to={`/products?categoryId=${c.id}`}
                  className="text-lg font-bold text-slate-900 hover:text-slate-600"
                >
                  {c.name}
                </Link>

                <span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  {c.subcategories?.length || 0} subcategories
                </span>
              </div>

              {/* Category Description */}
              {c.description && (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {c.description}
                </p>
              )}

              {/* Subcategories */}
              <div className="mt-4 flex flex-wrap gap-2">
                {c.subcategories && c.subcategories.length > 0 ? (
                  c.subcategories.map((sub) => (
                    <Link
                      key={sub.id}
                      to={`/products?subcategoryId=${sub.id}`}
                      className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                    >
                      {/* Clickable Subcategory Image */}
                      {sub.imageUrl && (
                        <img
                          src={sub.imageUrl}
                          alt={sub.name}
                          className="h-6 w-6 rounded object-cover"
                        />
                      )}

                      {sub.name}
                    </Link>
                  ))
                ) : (
                  <Link
                    to={`/products?categoryId=${c.id}`}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline"
                  >
                    Browse all {c.name} products →
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
