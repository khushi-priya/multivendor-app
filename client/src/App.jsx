



import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth, homePath } from './context/AuthContext.jsx';

import Layout from './components/Layout.jsx';
import CustomerLayout from './components/CustomerLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { Spinner } from './components/ui.jsx';

import NotImplemented from './pages/NotImplemented.jsx';

// Authentication
import Login from './pages/auth/Login.jsx';
//import ShopOwnerLogin from './pages/auth/ShopOwnerLogin.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import SetPassword from './pages/auth/SetPassword.jsx';
import CustomerRegister from './pages/auth/CustomerRegister.jsx';

// Super Admin
import AdminDashboard from './pages/super-admin/Dashboard.jsx';
import Shops from './pages/super-admin/Shops.jsx';
import CreateShop from './pages/super-admin/CreateShop.jsx';
import ShopCategories from './pages/super-admin/ShopCategories.jsx';
import ManageEmployees from './pages/super-admin/ManageEmployees.jsx';
import Wholesalers from './pages/super-admin/Wholesalers.jsx';
import ShopAccess from './pages/super-admin/ShopAccess.jsx';
import AuditLogs from './pages/super-admin/AuditLogs.jsx';
import Orders from './pages/super-admin/Orders.jsx';
import Reports from './pages/super-admin/Reports.jsx';

// Shop
import ShopDashboard from './pages/shop/Dashboard.jsx';

// Shop Employees
import ShopEmployees from './pages/shop/employees/Employees.jsx';
import RolesPermissions from './pages/shop/employees/RolesPermissions.jsx';
import ShopAttendance from './pages/shop/employees/Attendance.jsx';
import ShopSalary from './pages/shop/employees/Salary.jsx';
import ShopPayroll from './pages/shop/employees/Payroll.jsx';

// Shop Catalog
import CatalogCategories from './pages/shop/catalog/Categories.jsx';
import CatalogSubcategories from './pages/shop/catalog/Subcategories.jsx';
import CatalogBrands from './pages/shop/catalog/Brands.jsx';
import CatalogAttributes from './pages/shop/catalog/Attributes.jsx';
import CatalogProducts from './pages/shop/catalog/Products.jsx';

// Wholesale
import WholesaleDashboard from './pages/shop/wholesale/Dashboard.jsx';
import ShopWholesalers from './pages/shop/Wholesalers.jsx';
import BookOrder from './pages/shop/wholesale/BookOrder.jsx';
import PurchaseOrders from './pages/shop/wholesale/PurchaseOrders.jsx';
import ShopBills from './pages/shop/wholesale/Bills.jsx';
import WholesalePayments from './pages/shop/wholesale/Payments.jsx';

// Shop Operations
import ShopInventory from './pages/shop/inventory/Inventory.jsx';
import ShopOrders from './pages/shop/orders/Orders.jsx';
import ShopPayments from './pages/shop/payments/Payments.jsx';
import ShopDelivery from './pages/shop/delivery/Delivery.jsx';
import ShopReports from './pages/shop/reports/Reports.jsx';
import ShopSettings from './pages/shop/settings/Settings.jsx';
import ShopCoupons from './pages/shop/Coupons.jsx';

// Delivery Associate
import DeliveryAssignments from './pages/delivery/Deliveries.jsx';

// Customer
import CustomerCategories from './pages/customer/Categories.jsx';
import CustomerProducts from './pages/customer/Products.jsx';
import CustomerProductDetail from './pages/customer/ProductDetail.jsx';
import CustomerCart from './pages/customer/Cart.jsx';
import CustomerWishlist from './pages/customer/Wishlist.jsx';
import CustomerCheckout from './pages/customer/Checkout.jsx';
import CustomerOrders from './pages/customer/MyOrders.jsx';
import CustomerOrderDetail from './pages/customer/OrderDetail.jsx';
import CustomerPayments from './pages/customer/MyPayments.jsx';
import CustomerProfile from './pages/customer/Profile.jsx';
import CustomerHome from './pages/customer/Home.jsx';


function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner />;
  }

  if (!user) {
    return <Navigate to="/customer" replace />;
  }

  return <Navigate to={homePath(user)} replace />;
}


export default function App() {
  return (
    <Routes>

      {/* ================= AUTHENTICATION ================= */}

      <Route path="/login" element={<Login />} />
      <Route path="/shop/login" element={<Login />} />
      <Route path="/customer/login" element={<Login />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/set-password" element={<SetPassword />} />

      <Route path="/" element={<HomeRedirect />} />


      {/* ================= CUSTOMER ROUTES ================= */}

      <Route element={<CustomerLayout />}>

        <Route path="customer" element={<CustomerHome />} />
        <Route path="customer/register" element={<CustomerRegister />} />

        <Route path="customer/categories" element={<CustomerCategories />} />
        <Route path="customer/products" element={<CustomerProducts />} />
        <Route
          path="customer/products/:id"
          element={<CustomerProductDetail />}
        />

        {/* Customer Protected Routes */}

        <Route element={<ProtectedRoute roles={['customer']} />}>

          <Route path="customer/cart" element={<CustomerCart />} />
          <Route path="customer/wishlist" element={<CustomerWishlist />} />
          <Route path="customer/checkout" element={<CustomerCheckout />} />

          <Route path="customer/orders" element={<CustomerOrders />} />
          <Route
            path="customer/orders/:id"
            element={<CustomerOrderDetail />}
          />

          <Route path="customer/payments" element={<CustomerPayments />} />
          <Route path="customer/profile" element={<CustomerProfile />} />

          {/* Existing URLs */}

          <Route path="cart" element={<CustomerCart />} />
          <Route path="wishlist" element={<CustomerWishlist />} />
          <Route path="checkout" element={<CustomerCheckout />} />
          <Route path="my-orders" element={<CustomerOrders />} />
          <Route path="my-payments" element={<CustomerPayments />} />
          <Route path="profile" element={<CustomerProfile />} />

        </Route>

        {/* Existing Public URLs */}

        <Route path="categories" element={<CustomerCategories />} />
        <Route path="products" element={<CustomerProducts />} />
        <Route path="products/:id" element={<CustomerProductDetail />} />

      </Route>


      {/* ================= ADMIN AND SHOP LAYOUT ================= */}

      <Route element={<Layout />}>

        {/* ================= SUPER ADMIN ================= */}

        <Route
          path="admin"
          element={<ProtectedRoute roles={['super_admin']} />}
        >

          <Route index element={<AdminDashboard />} />

          <Route path="shops" element={<Shops />} />
          <Route path="shops/new" element={<CreateShop />} />

          <Route path="shop-categories" element={<ShopCategories />} />

          {/* Catalog Management */}

          <Route path="catalog/categories" element={<CatalogCategories />} />
          <Route
            path="catalog/subcategories"
            element={<CatalogSubcategories />}
          />
          <Route path="catalog/brands" element={<CatalogBrands />} />
          <Route path="catalog/attributes" element={<CatalogAttributes />} />
          <Route path="catalog/products" element={<CatalogProducts />} />

          <Route path="employees" element={<ManageEmployees />} />

          <Route path="wholesalers" element={<Wholesalers />} />
          <Route path="access" element={<ShopAccess />} />
          <Route path="audit-logs" element={<AuditLogs />} />

          <Route path="orders" element={<Orders />} />
          <Route path="reports" element={<Reports />} />

          <Route path="*" element={<NotImplemented />} />

        </Route>


        {/* ================= SHOP USER ================= */}

        <Route
          path="shop"
          element={<ProtectedRoute roles={['shop_user']} />}
        >

          {/* Shop Home */}

          <Route
            index
            element={
              <ProtectedRoute permission="dashboard.view">
                <ShopDashboard />
              </ProtectedRoute>
            }
          />


          {/* Shop Owner Dashboard */}

          <Route
            path="dashboard"
            element={
              <ProtectedRoute permission="dashboard.view" />
            }
          >
            <Route index element={<ShopDashboard />} />
          </Route>


          {/* ================= WHOLESALER DASHBOARD ================= */}

          <Route
            path="wholesalers"
            element={
              <ProtectedRoute permission="wholesalers.view" />
            }
          >

            {/* Main Wholesale Dashboard Layout */}

            <Route element={<WholesaleDashboard />}>

              {/* Default: Manage Wholesalers */}

              <Route index element={<ShopWholesalers />} />

              {/* Book Wholesale Order */}

              <Route
                path="book-order"
                element={
                  <ProtectedRoute permission="wholesalers.create">
                    <BookOrder />
                  </ProtectedRoute>
                }
              />

              {/* Purchase Orders */}

              <Route
                path="purchase-orders"
                element={
                  <ProtectedRoute permission="wholesalers.view">
                    <PurchaseOrders />
                  </ProtectedRoute>
                }
              />

              {/* Upload Bills */}

              <Route
                path="bills"
                element={
                  <ProtectedRoute permission="wholesalers.view">
                    <ShopBills />
                  </ProtectedRoute>
                }
              />

              {/* Payment History */}

              <Route
                path="payment-history"
                element={
                  <ProtectedRoute permission="wholesalers.view">
                    <WholesalePayments />
                  </ProtectedRoute>
                }
              />

            </Route>

          </Route>


          {/* Delivery Associate Assignments */}

          <Route
            path="delivery"
            element={
              <ProtectedRoute permission="delivery.view" />
            }
          >
            <Route index element={<DeliveryAssignments />} />
          </Route>


          {/* Shop Owner / Manager Operations */}

          <Route
            element={
              <ProtectedRoute permission="delivery.view" />
            }
          >

            <Route
              path="delivery-management"
              element={<ShopDelivery />}
            />

          </Route>


          <Route
            path="inventory"
            element={<ProtectedRoute permission="inventory.view"><ShopInventory /></ProtectedRoute>}
          />
          <Route
            path="employees"
            element={<ProtectedRoute permission="employees.view"><ShopEmployees /></ProtectedRoute>}
          />
          <Route
            path="roles-permissions"
            element={<ProtectedRoute shopRoles={['shop_owner']}><RolesPermissions /></ProtectedRoute>}
          />
          <Route
            path="salary"
            element={<ProtectedRoute permission="employees.manage"><ShopSalary /></ProtectedRoute>}
          />
          <Route
            path="payroll"
            element={<ProtectedRoute permission="employees.manage"><ShopPayroll /></ProtectedRoute>}
          />
          <Route
            path="settings"
            element={<ProtectedRoute permission="shop_settings.manage"><ShopSettings /></ProtectedRoute>}
          />
          <Route
            path="coupons"
            element={<ProtectedRoute shopRoles={['shop_owner']}><ShopCoupons /></ProtectedRoute>}
          />

          <Route
            path="catalog/categories"
            element={<ProtectedRoute permission="categories.view"><CatalogCategories /></ProtectedRoute>}
          />
          <Route
            path="catalog/subcategories"
            element={<ProtectedRoute permission="categories.view"><CatalogSubcategories /></ProtectedRoute>}
          />
          <Route
            path="catalog/brands"
            element={<ProtectedRoute permission="products.view"><CatalogBrands /></ProtectedRoute>}
          />
          <Route
            path="catalog/attributes"
            element={<ProtectedRoute permission="products.view"><CatalogAttributes /></ProtectedRoute>}
          />
          <Route
            path="catalog/products"
            element={<ProtectedRoute permission="products.view"><CatalogProducts /></ProtectedRoute>}
          />
          <Route
            path="attendance"
            element={<ProtectedRoute permission="employees.manage"><ShopAttendance /></ProtectedRoute>}
          />
          <Route
            path="orders"
            element={<ProtectedRoute permission="orders.view"><ShopOrders /></ProtectedRoute>}
          />
          <Route
            path="payments"
            element={<ProtectedRoute permission="payments.view"><ShopPayments /></ProtectedRoute>}
          />
          <Route
            path="reports"
            element={<ProtectedRoute permission="reports.view"><ShopReports /></ProtectedRoute>}
          />


          <Route path="*" element={<NotImplemented />} />

        </Route>

      </Route>


      {/* ================= UNKNOWN ROUTES ================= */}

      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}
