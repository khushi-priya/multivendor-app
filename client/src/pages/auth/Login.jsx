


// import { useState } from 'react';
// import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
// import { useAuth, homePath } from '../../context/AuthContext.jsx';

// const rolePaths = {
//   customer: '/customer/login',
//   shop_owner: '/shop/login',
//   admin: '/login',
// };

// function getRoleFromPath(pathname) {
//   if (pathname === '/customer/login') return 'customer';
//   if (pathname === '/shop/login') return 'shop_owner';
//   return 'admin';
// }

// function userMatchesRole(user, role) {
//   if (!user) return false;

//   if (role === 'customer') {
//     return user.role === 'customer';
//   }

//   if (role === 'admin') {
//     return user.role === 'super_admin';
//   }

//   return (
//     user.role === 'shop_user' &&
//     user.shop?.role === 'shop_owner'
//   );
// }

// export default function Login() {
//  const {
//   user,
//   loading,
//   loginCustomer,
//   loginAdmin,
//   loginShopOwner,
//   register,
//   verifyEmail,
//   resendVerification,
// } = useAuth();

//   const navigate = useNavigate();
//   const location = useLocation();

//   const activeRole = getRoleFromPath(location.pathname);

//   const [isRegistering, setIsRegistering] = useState(false);

//   // Login fields
//   // const [email, setEmail] = useState('');
//   const [email, setEmail] = useState(location.state?.email || '');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
// const [otpStep, setOtpStep] = useState(false);
// const [otp, setOtp] = useState('');
// const [successMessage, setSuccessMessage] = useState(
//   location.state?.emailVerified
//     ? 'Your email has been verified successfully. Please sign in.'
//     : ''
// );
//   // Registration fields
//   const [form, setForm] = useState({
//     name: '',
//     email: '',
//     phone: '',
//     password: '',
//     confirmPassword: '',
//   });

//   const [showRegisterPassword, setShowRegisterPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

//   const [error, setError] = useState('');
//   const [busy, setBusy] = useState(false);

//   // Redirect only when the existing session matches the selected role.
//   if (!loading && userMatchesRole(user, activeRole)) {
//     return <Navigate to={homePath(user)} replace />;
//   }

//   const changeRole = (role) => {
//     setError('');
//     setPassword('');
//     setEmail('');
//     setIsRegistering(false);

//     navigate(rolePaths[role], {
//       replace: true,
//       state: location.state,
//     });
//   };

//   const updateForm = (event) => {
//     const { name, value } = event.target;

//     setForm((previous) => ({
//       ...previous,
//       [name]: value,
//     }));
//   };

//   const switchToRegistration = () => {
//     setError('');
//     setIsRegistering(true);
//   };

//   const switchToLogin = () => {
//     setError('');
//     setIsRegistering(false);
//   };

//   const submitLogin = async (event) => {
//     event.preventDefault();
//     setError('');
//     setBusy(true);

//     try {
//       let signedInUser;

//       if (activeRole === 'customer') {
//         signedInUser = await loginCustomer(email.trim(), password);
//       } else if (activeRole === 'admin') {
//         signedInUser = await loginAdmin(email.trim(), password);
//       } else {
//         signedInUser = await loginShopOwner(email.trim(), password);
//       }

//       if (!userMatchesRole(signedInUser, activeRole)) {
//         setError('This account does not match the selected sign-in type.');
//         return;
//       }

//       const destination = homePath(signedInUser);

//       const rolePrefix =
//         activeRole === 'customer'
//           ? '/customer'
//           : activeRole === 'admin'
//             ? '/admin'
//             : '/shop';

//       const requestedFrom = location.state?.from;

//       const fromPath =
//         typeof requestedFrom === 'string'
//           ? requestedFrom
//           : requestedFrom?.pathname;

//       const safeDestination =
//         typeof fromPath === 'string' &&
//         (fromPath === rolePrefix ||
//           fromPath.startsWith(`${rolePrefix}/`))
//           ? fromPath
//           : destination;

//       navigate(safeDestination, { replace: true });
//     } catch (err) {
//       setError(
//         err.message || 'Unable to sign in. Please check your details.'
//       );
//     } finally {
//       setBusy(false);
//     }
//   };

//   const submitRegistration = async (event) => {
//     event.preventDefault();
//     setError('');

//     const name = form.name.trim();
//     const registerEmail = form.email.trim();
//     const phone = form.phone.trim();

//     if (name.length < 2 || name.length > 120) {
//       setError('Name must be between 2 and 120 characters.');
//       return;
//     }

//     if (phone.length > 20) {
//       setError('Phone number cannot exceed 20 characters.');
//       return;
//     }

//     if (
//       form.password.length < 8 ||
//       !/[A-Za-z]/.test(form.password) ||
//       !/[0-9]/.test(form.password)
//     ) {
//       setError(
//         'Password must contain at least 8 characters, including one letter and one number.'
//       );
//       return;
//     }

//     if (form.password !== form.confirmPassword) {
//       setError('Password and confirm password do not match.');
//       return;
//     }

//     setBusy(true);

//     try {
//       await register(
//         name,
//         registerEmail,
//         form.password,
//         phone
//       );

//       navigate('/customer', { replace: true });
//     } catch (err) {
//       setError(
//         err.message || 'Unable to create your account. Please try again.'
//       );
//     } finally {
//       setBusy(false);
//     }
//   };

//   const heading = isRegistering
//     ? 'Create Your Account'
//     : activeRole === 'customer'
//       ? 'Welcome Back!'
//       : activeRole === 'shop_owner'
//         ? 'Shop Owner Sign In'
//         : 'Administrator Sign In';

//   const description = isRegistering
//     ? 'Create an account to start shopping with us.'
//     : activeRole === 'customer'
//       ? 'Sign in to explore products and manage your orders.'
//       : activeRole === 'shop_owner'
//         ? 'Sign in to manage your shop and business operations.'
//         : 'Sign in to manage and monitor the platform.';

//   const buttonText =
//     activeRole === 'customer'
//       ? 'Sign In as Customer'
//       : activeRole === 'shop_owner'
//         ? 'Sign In as Shop Owner'
//         : 'Sign In as Admin';

//   return (
//     <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:flex lg:items-center lg:justify-center">
//       <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl lg:min-h-[600px] lg:grid-cols-2">

//         {/* Left welcome panel */}
//         <section className="relative hidden flex-col justify-between overflow-hidden bg-indigo-700 p-10 text-white lg:flex">
//           <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500 opacity-40" />
//           <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-indigo-800 opacity-60" />

//           <div className="relative z-10">
//             <div className="mb-12 flex items-center gap-3">
//               <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl font-bold text-indigo-700">
//                 M
//               </div>
//               <span className="text-xl font-bold">
//                 Multivendor Platform
//               </span>
//             </div>

//             <h1 className="max-w-md text-4xl font-bold leading-tight">
//               One Platform.
//               <br />
//               Multiple Possibilities.
//             </h1>

//             <p className="mt-5 max-w-md text-base leading-7 text-indigo-100">
//               A simple place to manage your shopping, shop operations,
//               and platform administration.
//             </p>
//           </div>

//           <div className="relative z-10 space-y-5">
//             {[
//               'Easy and secure account access',
//               'Manage your activities from one place',
//               'A dedicated experience for every role',
//             ].map((item) => (
//               <div key={item} className="flex items-center gap-3">
//                 <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-sm">
//                   ✓
//                 </span>
//                 <span className="text-sm text-indigo-50">{item}</span>
//               </div>
//             ))}
//           </div>

//           <p className="relative z-10 mt-12 text-xs text-indigo-200">
//             © {new Date().getFullYear()} Multivendor Platform
//           </p>
//         </section>

//         {/* Right authentication panel */}
//         <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
//           <div className="w-full max-w-md">

//             <div className="mb-8 text-center lg:text-left">
//               <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-xl font-bold text-indigo-700 lg:hidden">
//                 M
//               </div>

//               <h2 className="text-3xl font-bold text-slate-900">
//                 {heading}
//               </h2>

//               <p className="mt-2 text-sm leading-6 text-slate-500">
//                 {description}
//               </p>
//             </div>

//             {/* Role tabs */}
//             <div className="mb-7 grid grid-cols-3 rounded-xl bg-slate-100 p-1">
//               {[
//                 { key: 'customer', label: 'Customer' },
//                 { key: 'shop_owner', label: 'Shop Owner' },
//                 { key: 'admin', label: 'Admin' },
//               ].map((role) => (
//                 <button
//                   key={role.key}
//                   type="button"
//                   onClick={() => changeRole(role.key)}
//                   className={`rounded-lg px-2 py-3 text-xs font-semibold transition sm:text-sm ${
//                     activeRole === role.key
//                       ? 'bg-indigo-600 text-white shadow'
//                       : 'text-slate-600 hover:bg-white'
//                   }`}
//                 >
//                   {role.label}
//                 </button>
//               ))}
//             </div>

//             {!loading && user && (
//               <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
//                 You are currently signed in as {user.name}. Sign in
//                 with another account here to switch accounts.
//               </div>
//             )}

//             {/* Customer registration form */}
//             {activeRole === 'customer' && isRegistering ? (
//               <form
//                 onSubmit={submitRegistration}
//                 className="space-y-4"
//               >
//                 {error && (
//                   <div
//                     role="alert"
//                     className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
//                   >
//                     {error}
//                   </div>
//                 )}

//                 <div>
//                   <label
//                     htmlFor="register-name"
//                     className="mb-2 block text-sm font-medium text-slate-700"
//                   >
//                     Full Name
//                   </label>

//                   <input
//                     id="register-name"
//                     name="name"
//                     type="text"
//                     autoComplete="name"
//                     placeholder="Enter your full name"
//                     value={form.name}
//                     onChange={updateForm}
//                     minLength={2}
//                     maxLength={120}
//                     required
//                     className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
//                   />
//                 </div>

//                 <div>
//                   <label
//                     htmlFor="register-email"
//                     className="mb-2 block text-sm font-medium text-slate-700"
//                   >
//                     Email Address
//                   </label>

//                   <input
//                     id="register-email"
//                     name="email"
//                     type="email"
//                     autoComplete="email"
//                     placeholder="Enter your email"
//                     value={form.email}
//                     onChange={updateForm}
//                     required
//                     className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
//                   />
//                 </div>

//                 <div>
//                   <label
//                     htmlFor="register-phone"
//                     className="mb-2 block text-sm font-medium text-slate-700"
//                   >
//                     Phone Number <span className="text-slate-400">(Optional)</span>
//                   </label>

//                   <input
//                     id="register-phone"
//                     name="phone"
//                     type="tel"
//                     autoComplete="tel"
//                     placeholder="Enter your phone number"
//                     value={form.phone}
//                     onChange={updateForm}
//                     maxLength={20}
//                     className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
//                   />
//                 </div>

//                 <div>
//                   <label
//                     htmlFor="register-password"
//                     className="mb-2 block text-sm font-medium text-slate-700"
//                   >
//                     Password
//                   </label>

//                   <div className="relative">
//                     <input
//                       id="register-password"
//                       name="password"
//                       type={showRegisterPassword ? 'text' : 'password'}
//                       autoComplete="new-password"
//                       placeholder="Create a password"
//                       value={form.password}
//                       onChange={updateForm}
//                       required
//                       className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-16 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
//                     />

//                     <button
//                       type="button"
//                       onClick={() =>
//                         setShowRegisterPassword((value) => !value)
//                       }
//                       className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-indigo-600"
//                     >
//                       {showRegisterPassword ? 'Hide' : 'Show'}
//                     </button>
//                   </div>

//                   <p className="mt-1 text-xs text-slate-400">
//                     Minimum 8 characters, with at least one letter and one number.
//                   </p>
//                 </div>

//                 <div>
//                   <label
//                     htmlFor="register-confirm-password"
//                     className="mb-2 block text-sm font-medium text-slate-700"
//                   >
//                     Confirm Password
//                   </label>

//                   <div className="relative">
//                     <input
//                       id="register-confirm-password"
//                       name="confirmPassword"
//                       type={showConfirmPassword ? 'text' : 'password'}
//                       autoComplete="new-password"
//                       placeholder="Re-enter your password"
//                       value={form.confirmPassword}
//                       onChange={updateForm}
//                       required
//                       className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-16 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
//                     />

//                     <button
//                       type="button"
//                       onClick={() =>
//                         setShowConfirmPassword((value) => !value)
//                       }
//                       className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-indigo-600"
//                     >
//                       {showConfirmPassword ? 'Hide' : 'Show'}
//                     </button>
//                   </div>
//                 </div>

//                 <button
//                   type="submit"
//                   disabled={busy || loading}
//                   className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
//                 >
//                   {busy ? 'Creating Account...' : 'Create Account'}
//                 </button>

//                 <p className="pt-2 text-center text-sm text-slate-600">
//                   Already have an account?{' '}
//                   <button
//                     type="button"
//                     onClick={switchToLogin}
//                     className="font-semibold text-indigo-600 hover:underline"
//                   >
//                     Sign In
//                   </button>
//                 </p>
//               </form>
//             ) : (
//               /* Login form */
//               <form onSubmit={submitLogin} className="space-y-5">
//                 {error && (
//                   <div
//                     role="alert"
//                     className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
//                   >
//                     {error}
//                   </div>
//                 )}

//                 <div>
//                   <label
//                     htmlFor="login-email"
//                     className="mb-2 block text-sm font-medium text-slate-700"
//                   >
//                     Email Address
//                   </label>

//                   <input
//                     id="login-email"
//                     type="email"
//                     autoComplete="username"
//                     placeholder="Enter your email"
//                     value={email}
//                     onChange={(event) => setEmail(event.target.value)}
//                     required
//                     className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
//                   />
//                 </div>

//                 <div>
//                   <label
//                     htmlFor="login-password"
//                     className="mb-2 block text-sm font-medium text-slate-700"
//                   >
//                     Password
//                   </label>

//                   <div className="relative">
//                     <input
//                       id="login-password"
//                       type={showPassword ? 'text' : 'password'}
//                       autoComplete="current-password"
//                       placeholder="Enter your password"
//                       value={password}
//                       onChange={(event) => setPassword(event.target.value)}
//                       required
//                       className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-16 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
//                     />

//                     <button
//                       type="button"
//                       onClick={() => setShowPassword((value) => !value)}
//                       className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
//                     >
//                       {showPassword ? 'Hide' : 'Show'}
//                     </button>
//                   </div>
//                 </div>

//                 <div className="flex justify-end">
//                   <Link
//                     to="/forgot-password"
//                     className="text-sm font-medium text-indigo-600 hover:underline"
//                   >
//                     Forgot password?
//                   </Link>
//                 </div>

//                 <button
//                   type="submit"
//                   disabled={busy || loading}
//                   className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
//                 >
//                   {busy ? 'Signing in...' : buttonText}
//                 </button>

//                 {activeRole === 'customer' && (
//                   <p className="pt-2 text-center text-sm text-slate-600">
//                     Don't have an account?{' '}
//                     <button
//                       type="button"
//                       onClick={switchToRegistration}
//                       className="font-semibold text-indigo-600 hover:underline"
//                     >
//                       Create an account
//                     </button>
//                   </p>
//                 )}
//               </form>
//             )}

//             {activeRole === 'shop_owner' && (
//               <p className="mt-7 text-center text-xs leading-5 text-slate-500">
//                 Shop owners must use the account created or invited by
//                 the platform administrator.
//               </p>
//             )}

//             {activeRole === 'admin' && (
//               <p className="mt-7 text-center text-xs leading-5 text-slate-500">
//                 Administrator access is restricted to authorized
//                 platform accounts.
//               </p>
//             )}

//             <p className="mt-8 text-center text-xs text-slate-400 lg:hidden">
//               © {new Date().getFullYear()} Multivendor Platform
//             </p>
//           </div>
//         </section>
//       </div>
//     </main>
//   );
// }


import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homePath } from '../../context/AuthContext.jsx';

const rolePaths = {
  customer: '/customer/login',
  shop_owner: '/shop/login',
  admin: '/login',
};

function getRoleFromPath(pathname) {
  if (pathname === '/customer/login') return 'customer';
  if (pathname === '/shop/login') return 'shop_owner';
  return 'admin';
}

function userMatchesRole(user, role) {
  if (!user) return false;

  if (role === 'customer') {
    return user.role === 'customer';
  }

  if (role === 'admin') {
    return user.role === 'super_admin';
  }

  return (
    user.role === 'shop_user' &&
    Boolean(user.shop?.role)
  );
}

export default function Login() {
  const {
    user,
    loading,
    loginCustomer,
    loginAdmin,
    loginShopOwner,
    register,
    verifyEmail,
    resendVerification,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const activeRole = getRoleFromPath(location.pathname);

  const [isRegistering, setIsRegistering] = useState(false);

  // Login fields
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Email verification fields
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');

  const [successMessage, setSuccessMessage] = useState(
    location.state?.emailVerified
      ? 'Your email has been verified successfully. Please sign in.'
      : ''
  );

  // Registration fields
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Redirect only when the existing session matches the selected role.
  if (!loading && userMatchesRole(user, activeRole)) {
    return <Navigate to={homePath(user)} replace />;
  }

  // Change login role.
  const changeRole = (role) => {
    setError('');
    setSuccessMessage('');
    setPassword('');
    setEmail('');
    setOtp('');
    setOtpStep(false);
    setIsRegistering(false);

    navigate(rolePaths[role], {
      replace: true,
      state: null,
    });
  };

  // Update registration form.
  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Switch to registration.
  const switchToRegistration = () => {
    setError('');
    setSuccessMessage('');
    setOtp('');
    setOtpStep(false);
    setIsRegistering(true);
  };

  // Switch to login.
  const switchToLogin = () => {
    setError('');
    setOtp('');
    setOtpStep(false);
    setIsRegistering(false);
  };

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  const submitLogin = async (event) => {
    event.preventDefault();

    setError('');
    setSuccessMessage('');
    setBusy(true);

    try {
      let signedInUser;

      if (activeRole === 'customer') {
        signedInUser = await loginCustomer(
          email.trim().toLowerCase(),
          password
        );
      } else if (activeRole === 'admin') {
        signedInUser = await loginAdmin(
          email.trim().toLowerCase(),
          password
        );
      } else {
        signedInUser = await loginShopOwner(
          email.trim().toLowerCase(),
          password
        );
      }

      if (!userMatchesRole(signedInUser, activeRole)) {
        setError(
          'This account does not match the selected sign-in type.'
        );
        return;
      }

      const destination = homePath(signedInUser);

      const rolePrefix =
        activeRole === 'customer'
          ? '/customer'
          : activeRole === 'admin'
            ? '/admin'
            : '/shop';

      const requestedFrom = location.state?.from;

      const fromPath =
        typeof requestedFrom === 'string'
          ? requestedFrom
          : requestedFrom?.pathname;

      const safeDestination =
        typeof fromPath === 'string' &&
        (fromPath === rolePrefix ||
          fromPath.startsWith(`${rolePrefix}/`))
          ? fromPath
          : destination;

      navigate(safeDestination, {
        replace: true,
      });
    } catch (err) {
      setError(
        err.message || 'Unable to sign in. Please check your details.'
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // CUSTOMER REGISTRATION
  // --------------------------------------------------

  const submitRegistration = async (event) => {
    event.preventDefault();

    setError('');
    setSuccessMessage('');

    const name = form.name.trim();
    const registerEmail = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (name.length < 2 || name.length > 120) {
      setError('Name must be between 2 and 120 characters.');
      return;
    }

    if (phone.length > 20) {
      setError('Phone number cannot exceed 20 characters.');
      return;
    }

    if (
      form.password.length < 8 ||
      !/[A-Za-z]/.test(form.password) ||
      !/[0-9]/.test(form.password)
    ) {
      setError(
        'Password must contain at least 8 characters, including one letter and one number.'
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    setBusy(true);

    try {
      await register(
        name,
        registerEmail,
        form.password,
        phone
      );

      // Keep email for OTP verification and later sign-in.
      setEmail(registerEmail);

      setOtp('');
      setOtpStep(true);
      setIsRegistering(false);

      setSuccessMessage(
        'A 6-digit verification OTP has been sent to your email address.'
      );
    } catch (err) {
      setError(
        err.message || 'Unable to create your account. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // VERIFY EMAIL OTP
  // --------------------------------------------------

  const submitOtp = async (event) => {
    event.preventDefault();

    setError('');
    setSuccessMessage('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    setBusy(true);

    try {
      await verifyEmail(
        email.trim().toLowerCase(),
        otp
      );

      // Do not automatically log in.
      setOtpStep(false);
      setIsRegistering(false);
      setOtp('');
      setPassword('');

      setSuccessMessage(
        'Your email has been verified successfully. Please sign in with your password.'
      );

      // Redirect to customer sign-in page.
      navigate('/customer/login', {
        replace: true,
        state: {
          email: email.trim().toLowerCase(),
          emailVerified: true,
        },
      });
    } catch (err) {
      setError(
        err.message || 'Invalid or expired OTP. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // RESEND OTP
  // --------------------------------------------------

  const handleResendOtp = async () => {
    setError('');
    setSuccessMessage('');
    setBusy(true);

    try {
      const result = await resendVerification(
        email.trim().toLowerCase()
      );

      setOtp('');

      setSuccessMessage(
        result?.message || 'A new OTP has been requested.'
      );
    } catch (err) {
      setError(
        err.message || 'Unable to resend OTP. Please try again later.'
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // PAGE TEXT
  // --------------------------------------------------

  const heading = otpStep
    ? 'Verify Your Email'
    : isRegistering
      ? 'Create Your Account'
      : activeRole === 'customer'
        ? 'Welcome Back!'
        : activeRole === 'shop_owner'
          ? 'Shop Owner Sign In'
          : 'Administrator Sign In';

  const description = otpStep
    ? 'Enter the verification code sent to your email address.'
    : isRegistering
      ? 'Create an account to start shopping with us.'
      : activeRole === 'customer'
        ? 'Sign in to explore products and manage your orders.'
        : activeRole === 'shop_owner'
          ? 'Sign in to manage your shop and business operations.'
          : 'Sign in to manage and monitor the platform.';

  const buttonText =
    activeRole === 'customer'
      ? 'Sign In as Customer'
      : activeRole === 'shop_owner'
        ? 'Sign In as Shop Owner'
        : 'Sign In as Admin';

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:flex lg:items-center lg:justify-center">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl lg:min-h-[600px] lg:grid-cols-2">

        {/* Left welcome panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-indigo-700 p-10 text-white lg:flex">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500 opacity-40" />
          <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-indigo-800 opacity-60" />

          <div className="relative z-10">
            <div className="mb-12 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl font-bold text-indigo-700">
                M
              </div>

              <span className="text-xl font-bold">
                Multivendor Platform
              </span>
            </div>

            <h1 className="max-w-md text-4xl font-bold leading-tight">
              One Platform.
              <br />
              Multiple Possibilities.
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-indigo-100">
              A simple place to manage your shopping, shop operations,
              and platform administration.
            </p>
          </div>

          <div className="relative z-10 space-y-5">
            {[
              'Easy and secure account access',
              'Manage your activities from one place',
              'A dedicated experience for every role',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-sm">
                  ✓
                </span>

                <span className="text-sm text-indigo-50">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <p className="relative z-10 mt-12 text-xs text-indigo-200">
            © {new Date().getFullYear()} Multivendor Platform
          </p>
        </section>

        {/* Right authentication panel */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-md">

            <div className="mb-8 text-center lg:text-left">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-xl font-bold text-indigo-700 lg:hidden">
                M
              </div>

              <h2 className="text-3xl font-bold text-slate-900">
                {heading}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>

            {/* Role tabs */}
            <div className="mb-7 grid grid-cols-3 rounded-xl bg-slate-100 p-1">
              {[
                { key: 'customer', label: 'Customer' },
                { key: 'shop_owner', label: 'Shop Owner' },
                { key: 'admin', label: 'Admin' },
              ].map((role) => (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => changeRole(role.key)}
                  className={`rounded-lg px-2 py-3 text-xs font-semibold transition sm:text-sm ${
                    activeRole === role.key
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>

            {!loading && user && (
              <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                You are currently signed in as {user.name}. Sign in
                with another account here to switch accounts.
              </div>
            )}

            {/* Success message */}
            {successMessage && (
              <div
                role="status"
                className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              >
                {successMessage}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* ===================================== */}
            {/* OTP VERIFICATION FORM */}
            {/* ===================================== */}

            {activeRole === 'customer' && otpStep ? (
              <form
                onSubmit={submitOtp}
                className="space-y-5"
              >
                <div>
                  <p className="text-sm leading-6 text-slate-500">
                    We have sent a six-digit verification code to:
                  </p>

                  <p className="mt-2 break-all font-semibold text-indigo-700">
                    {email}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="verification-otp"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Enter Verification OTP
                  </label>

                  <input
                    id="verification-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 6)
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-xl tracking-[0.5em] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy || otp.length !== 6}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? 'Verifying...' : 'Verify Email'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={busy}
                    className="text-sm font-semibold text-indigo-600 hover:underline disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                </div>

                <p className="text-center text-sm text-slate-600">
                  Want to use another email?{' '}
                  <button
                    type="button"
                    onClick={switchToRegistration}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    Register again
                  </button>
                </p>
              </form>
            ) : activeRole === 'customer' && isRegistering ? (

              /* ===================================== */
              /* CUSTOMER REGISTRATION FORM */
              /* ===================================== */

              <form
                onSubmit={submitRegistration}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="register-name"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Full Name
                  </label>

                  <input
                    id="register-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={updateForm}
                    minLength={2}
                    maxLength={120}
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="register-email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Email Address
                  </label>

                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={updateForm}
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="register-phone"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Phone Number{' '}
                    <span className="text-slate-400">(Optional)</span>
                  </label>

                  <input
                    id="register-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="Enter your phone number"
                    value={form.phone}
                    onChange={updateForm}
                    maxLength={20}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="register-password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="register-password"
                      name="password"
                      type={showRegisterPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Create a password"
                      value={form.password}
                      onChange={updateForm}
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-16 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowRegisterPassword((value) => !value)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-indigo-600"
                    >
                      {showRegisterPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    Minimum 8 characters, with at least one letter and one number.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="register-confirm-password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Confirm Password
                  </label>

                  <div className="relative">
                    <input
                      id="register-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      value={form.confirmPassword}
                      onChange={updateForm}
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-16 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((value) => !value)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-indigo-600"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy || loading}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? 'Creating Account...' : 'Create Account'}
                </button>

                <p className="pt-2 text-center text-sm text-slate-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </form>
            ) : (

              /* ===================================== */
              /* LOGIN FORM */
              /* ===================================== */

              <form
                onSubmit={submitLogin}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Email Address
                  </label>

                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-16 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((value) => !value)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-indigo-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={busy || loading}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? 'Signing in...' : buttonText}
                </button>

                {activeRole === 'customer' && (
                  <p className="pt-2 text-center text-sm text-slate-600">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={switchToRegistration}
                      className="font-semibold text-indigo-600 hover:underline"
                    >
                      Create an account
                    </button>
                  </p>
                )}
              </form>
            )}

            {activeRole === 'shop_owner' && (
              <p className="mt-7 text-center text-xs leading-5 text-slate-500">
                Shop owners must use the account created or invited by
                the platform administrator.
              </p>
            )}

            {activeRole === 'admin' && (
              <p className="mt-7 text-center text-xs leading-5 text-slate-500">
                Administrator access is restricted to authorized
                platform accounts.
              </p>
            )}

            <p className="mt-8 text-center text-xs text-slate-400 lg:hidden">
              © {new Date().getFullYear()} Multivendor Platform
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
