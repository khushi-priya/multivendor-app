
// import {
//   createContext,
//   useCallback,
//   useContext,
//   useEffect,
//   useMemo,
//   useState
// } from 'react';

// import { api } from '../services/api.js';

// const AuthContext = createContext(null);

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const refreshSession = useCallback(async () => {
//     try {
//       const d = await api.get('/auth/me');
//       const currentUser = d?.user || null;

//       setUser(currentUser);
//       return currentUser;
//     } catch (error) {
//       setUser(null);
//       return null;
//     }
//   }, []);

//   // Existing general login (kept for compatibility).
//   const login = useCallback(async (email, password) => {
//     const d = await api.post('/auth/login', {
//       email,
//       password
//     });

//     setUser(d.user);
//     return d.user;
//   }, []);

//   // Customer login.
//   const loginCustomer = useCallback(async (email, password) => {
//     const d = await api.post('/auth/customer/login', {
//       email,
//       password
//     });

//     setUser(d.user);
//     return d.user;
//   }, []);

//   // Admin login.
//   const loginAdmin = useCallback(async (email, password) => {
//     const d = await api.post('/auth/admin/login', {
//       email,
//       password
//     });

//     setUser(d.user);
//     return d.user;
//   }, []);

//   // Shop owner login.
//   const loginShopOwner = useCallback(async (email, password) => {
//     const d = await api.post('/auth/shop-owner/login', {
//       email,
//       password
//     });

//     setUser(d.user);
//     return d.user;
//   }, []);

//   const register = useCallback(async (name, email, password, phone) => {
//     const d = await api.post('/auth/register', {
//       name,
//       email,
//       password,
//       phone
//     });

//     setUser(d.user);
//     return d.user;
//   }, []);

//   const logout = useCallback(async () => {
//     try {
//       await api.post('/auth/logout');
//     } finally {
//       setUser(null);
//     }
//   }, []);

//   useEffect(() => {
//     let mounted = true;

//     const initializeSession = async () => {
//       try {
//         await refreshSession();
//       } finally {
//         if (mounted) {
//           setLoading(false);
//         }
//       }
//     };

//     initializeSession();

//     return () => {
//       mounted = false;
//     };
//   }, [refreshSession]);

//   const value = useMemo(() => ({
//     user,
//     setUser,
//     loading,
//     login,
//     loginCustomer,
//     loginAdmin,
//     loginShopOwner,
//     register,
//     logout,
//     reloadSession: refreshSession
//   }), [
//     user,
//     loading,
//     login,
//     loginCustomer,
//     loginAdmin,
//     loginShopOwner,
//     register,
//     logout,
//     refreshSession
//   ]);

//   return (
//     <AuthContext.Provider value={value}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export const useAuth = () => useContext(AuthContext);

// // Redirect users according to their role.
// export function homePath(user) {
//   if (!user) {
//     return '/customer';
//   }

//   if (user.role === 'super_admin') {
//     return '/admin';
//   }

//   if (user.role === 'shop_user') {
//     const shopRole = user.shop?.role;

//     if (shopRole === 'delivery_associate') {
//       return '/shop/delivery';
//     }

//     if (shopRole === 'shop_owner') {
//       return '/shop/dashboard';
//     }

//     return '/shop';
//   }

//   if (user.role === 'customer') {
//     return '/customer';
//   }

//   return '/login';
// }

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const d = await api.get('/auth/me');
      const currentUser = d?.user || null;

      setUser(currentUser);
      return currentUser;
    } catch (error) {
      setUser(null);
      return null;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await api.post('/auth/login', {
      email,
      password
    });

    setUser(d.user);
    return d.user;
  }, []);

  const loginCustomer = useCallback(async (email, password) => {
    const d = await api.post('/auth/customer/login', {
      email,
      password
    });

    setUser(d.user);
    return d.user;
  }, []);

  const loginAdmin = useCallback(async (email, password) => {
    const d = await api.post('/auth/admin/login', {
      email,
      password
    });

    setUser(d.user);
    return d.user;
  }, []);

  const loginShopOwner = useCallback(async (email, password) => {
    const d = await api.post('/auth/shop-owner/login', {
      email,
      password
    });

    setUser(d.user);
    return d.user;
  }, []);

  // Registration sends OTP but does not log in the customer.
  const register = useCallback(async (name, email, password, phone) => {
    return api.post('/auth/register', {
      name,
      email,
      password,
      phone
    });
  }, []);

  const verifyEmail = useCallback(async (email, otp) => {
    return api.post('/auth/verify-email', {
      email,
      otp
    });
  }, []);

  const resendVerification = useCallback(async (email) => {
    return api.post('/auth/resend-verification', {
      email
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      try {
        await refreshSession();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeSession();

    return () => {
      mounted = false;
    };
  }, [refreshSession]);

  const value = useMemo(() => ({
    user,
    setUser,
    loading,
    login,
    loginCustomer,
    loginAdmin,
    loginShopOwner,
    register,
    verifyEmail,
    resendVerification,
    logout,
    reloadSession: refreshSession
  }), [
    user,
    loading,
    login,
    loginCustomer,
    loginAdmin,
    loginShopOwner,
    register,
    verifyEmail,
    resendVerification,
    logout,
    refreshSession
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function homePath(user) {
  if (!user) {
    return '/customer';
  }

  if (user.role === 'super_admin') {
    return '/admin';
  }

  if (user.role === 'shop_user') {
    if (user.shop?.role === 'delivery_associate') {
      return '/shop/delivery';
    }
    return '/shop/dashboard';
  }

  if (user.role === 'customer') {
    return '/customer';
  }

  return '/login';
}