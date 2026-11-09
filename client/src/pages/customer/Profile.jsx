

// import React, { useState, useEffect } from 'react';
// import { api } from '../../services/api.js';
// import { useAuth } from '../../context/AuthContext.jsx';
// import { Alert, Button, Card, Spinner } from '../../components/ui.jsx';

// const inputClass =
//   'w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-400';

// export default function CustomerProfile() {
//   const { user, reloadSession } = useAuth();

//   const [profile, setProfile] = useState(null);
//   const [addresses, setAddresses] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [profileMsg, setProfileMsg] = useState(null);
//   const [addressMsg, setAddressMsg] = useState(null);
//   const [savingProfile, setSavingProfile] = useState(false);
//   const [passwordForm, setPasswordForm] = useState({
//     currentPassword: '',
//     newPassword: '',
//     confirmPassword: '',
//   });
//   const [passwordMessage, setPasswordMessage] = useState(null);
//   const [savingPassword, setSavingPassword] = useState(false);

//   // Profile Form state
//   const [name, setName] = useState('');
//   const [phone, setPhone] = useState('');

//   // Address Modal / Form state
//   const [editingAddr, setEditingAddr] = useState(null);
//   const [showAddrModal, setShowAddrModal] = useState(false);
//   const [addrForm, setAddrForm] = useState({
//     label: 'Home',
//     recipientName: '',
//     phone: '',
//     streetAddress: '',
//     city: '',
//     state: '',
//     postalCode: '',
//     isDefault: false,
//   });

//   useEffect(() => {
//     loadData();
//   }, []);

//   const loadData = async () => {
//     setLoading(true);

//     try {
//       const [profRes, addrRes] = await Promise.all([
//         api.get('/customer/profile'),
//         api.get('/customer/addresses'),
//       ]);

//       const p = profRes.profile || profRes;

//       setProfile(p);
//       setName(p.name || '');
//       setPhone(p.phone || '');
//       setAddresses(addrRes.items || []);
//     } catch (err) {
//       setProfileMsg({
//         type: 'danger',
//         message: err.message || 'Failed to load profile details',
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleUpdateProfile = async (e) => {
//     e.preventDefault();
//     setSavingProfile(true);
//     setProfileMsg(null);

//     try {
//       const res = await api.patch('/customer/profile', { name, phone });

//       setProfile(res.profile || res);
//       setProfileMsg({
//         type: 'success',
//         message: 'Profile updated successfully.',
//       });

//       if (reloadSession) reloadSession();
//     } catch (err) {
//       setProfileMsg({
//         type: 'danger',
//         message: err.message || 'Failed to update profile',
//       });
//     } finally {
//       setSavingProfile(false);
//     }
//   };

//   const handleChangePassword = async (event) => {
//     event.preventDefault();
//     setPasswordMessage(null);

//     if (passwordForm.newPassword !== passwordForm.confirmPassword) {
//       setPasswordMessage({
//         type: 'error',
//         message: 'New passwords do not match.',
//       });
//       return;
//     }

//     setSavingPassword(true);

//     try {
//       const result = await api.post('/customer/profile/password', {
//         currentPassword: passwordForm.currentPassword,
//         newPassword: passwordForm.newPassword,
//       });

//       setPasswordForm({
//         currentPassword: '',
//         newPassword: '',
//         confirmPassword: '',
//       });

//       setPasswordMessage({
//         type: 'success',
//         message: result.message,
//       });
//     } catch (err) {
//       setPasswordMessage({
//         type: 'error',
//         message: err.message || 'Unable to change password.',
//       });
//     } finally {
//       setSavingPassword(false);
//     }
//   };

//   const openAddressModal = (addr = null) => {
//     if (addr) {
//       setEditingAddr(addr);

//       setAddrForm({
//         label: addr.label || 'Home',
//         recipientName: addr.recipientName || '',
//         phone: addr.phone || '',
//         streetAddress: addr.streetAddress || '',
//         city: addr.city || '',
//         state: addr.state || '',
//         postalCode: addr.postalCode || '',
//         isDefault: addr.isDefault || false,
//       });
//     } else {
//       setEditingAddr(null);

//       setAddrForm({
//         label: 'Home',
//         recipientName: name || '',
//         phone: phone || '',
//         streetAddress: '',
//         city: '',
//         state: '',
//         postalCode: '',
//         isDefault: addresses.length === 0,
//       });
//     }

//     setShowAddrModal(true);
//   };

//   const handleSaveAddress = async (e) => {
//     e.preventDefault();
//     setAddressMsg(null);

//     try {
//       if (editingAddr) {
//         await api.patch(`/customer/addresses/${editingAddr.id}`, addrForm);
//       } else {
//         await api.post('/customer/addresses', addrForm);
//       }

//       setShowAddrModal(false);
//       setEditingAddr(null);

//       const res = await api.get('/customer/addresses');
//       setAddresses(res.items || []);

//       setAddressMsg({
//         type: 'success',
//         message: 'Address saved successfully.',
//       });
//     } catch (err) {
//       setAddressMsg({
//         type: 'danger',
//         message: err.message || 'Failed to save address',
//       });
//     }
//   };

//   const handleDeleteAddress = async (addrId) => {
//     if (!window.confirm('Delete this saved delivery address?')) return;

//     try {
//       await api.delete(`/customer/addresses/${addrId}`);

//       const res = await api.get('/customer/addresses');
//       setAddresses(res.items || []);

//       setAddressMsg({
//         type: 'success',
//         message: 'Address removed successfully.',
//       });
//     } catch (err) {
//       setAddressMsg({
//         type: 'danger',
//         message: err.message || 'Failed to delete address',
//       });
//     }
//   };

//   if (loading) return <Spinner />;

//   return (
//     <div className="space-y-8">
//       {/* Page Header */}
//       <div>
//         <h1 className="text-2xl font-bold text-slate-900">
//           My Account Profile
//         </h1>

//         <p className="mt-1 text-sm text-slate-600">
//           Manage your personal information, contact numbers, and saved shipping addresses.
//         </p>
//       </div>

//       <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
//         {/* Profile Section */}
//         <div className="space-y-6 lg:col-span-1">
//           <Card className="border border-slate-200 bg-white shadow-sm">
//             <h2 className="mb-4 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">
//               Personal Information
//             </h2>

//             {profileMsg && (
//               <div className="mb-4">
//                 <Alert
//                   kind={profileMsg.type === 'success' ? 'success' : 'error'}
//                 >
//                   {profileMsg.message}
//                 </Alert>
//               </div>
//             )}

//             <form onSubmit={handleUpdateProfile} className="space-y-4">
//               <div>
//                 <label className="mb-1 block text-xs font-medium text-slate-600">
//                   Email Address
//                 </label>

//                 <input
//                   type="email"
//                   disabled
//                   value={profile?.email || ''}
//                   className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 p-2.5 text-xs text-slate-500"
//                 />

//                 <span className="text-[10px] text-slate-400">
//                   Account email cannot be modified directly.
//                 </span>
//               </div>

//               <div>
//                 <label className="mb-1 block text-xs font-medium text-slate-700">
//                   Full Name
//                 </label>

//                 <input
//                   type="text"
//                   required
//                   value={name}
//                   onChange={(e) => setName(e.target.value)}
//                   className={inputClass}
//                 />
//               </div>

//               <div>
//                 <label className="mb-1 block text-xs font-medium text-slate-700">
//                   Phone Number
//                 </label>

//                 <input
//                   type="tel"
//                   value={phone}
//                   onChange={(e) => setPhone(e.target.value)}
//                   placeholder="+91..."
//                   className={inputClass}
//                 />
//               </div>

//               <div className="pt-2">
//                 <Button
//                   type="submit"
//                   disabled={savingProfile}
//                   className="w-full bg-slate-800 py-2 text-xs text-white hover:bg-slate-700"
//                 >
//                   {savingProfile ? 'Saving...' : 'Save Profile Changes'}
//                 </Button>
//               </div>
//             </form>
//           </Card>

//           {/* Change Password */}
//           <Card className="border border-slate-200 bg-white shadow-sm">
//             <h2 className="mb-4 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">
//               Change Password
//             </h2>

//             {passwordMessage && (
//               <div className="mb-4">
//                 <Alert
//                   kind={
//                     passwordMessage.type === 'success' ? 'success' : 'error'
//                   }
//                 >
//                   {passwordMessage.message}
//                 </Alert>
//               </div>
//             )}

//             <form onSubmit={handleChangePassword} className="space-y-3">
//               <label className="block text-xs font-medium text-slate-700">
//                 Current Password

//                 <input
//                   required
//                   type="password"
//                   autoComplete="current-password"
//                   value={passwordForm.currentPassword}
//                   onChange={(event) =>
//                     setPasswordForm({
//                       ...passwordForm,
//                       currentPassword: event.target.value,
//                     })
//                   }
//                   className={`${inputClass} mt-1`}
//                 />
//               </label>

//               <label className="block text-xs font-medium text-slate-700">
//                 New Password

//                 <input
//                   required
//                   minLength={8}
//                   type="password"
//                   autoComplete="new-password"
//                   value={passwordForm.newPassword}
//                   onChange={(event) =>
//                     setPasswordForm({
//                       ...passwordForm,
//                       newPassword: event.target.value,
//                     })
//                   }
//                   className={`${inputClass} mt-1`}
//                 />

//                 <span className="mt-1 block text-[11px] text-slate-500">
//                   At least 8 characters, including a letter and a number.
//                 </span>
//               </label>

//               <label className="block text-xs font-medium text-slate-700">
//                 Confirm New Password

//                 <input
//                   required
//                   minLength={8}
//                   type="password"
//                   autoComplete="new-password"
//                   value={passwordForm.confirmPassword}
//                   onChange={(event) =>
//                     setPasswordForm({
//                       ...passwordForm,
//                       confirmPassword: event.target.value,
//                     })
//                   }
//                   className={`${inputClass} mt-1`}
//                 />
//               </label>

//               <Button
//                 type="submit"
//                 loading={savingPassword}
//                 className="w-full bg-slate-800 text-white hover:bg-slate-700"
//               >
//                 Update Password
//               </Button>
//             </form>
//           </Card>
//         </div>

//         {/* Address Book */}
//         <div className="space-y-6 lg:col-span-2">
//           <Card className="border border-slate-200 bg-white shadow-sm">
//             <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
//               <div>
//                 <h2 className="text-base font-semibold text-slate-900">
//                   Saved Delivery Addresses
//                 </h2>

//                 <p className="text-xs text-slate-500">
//                   Quickly select addresses during checkout.
//                 </p>
//               </div>

//               <Button
//                 onClick={() => openAddressModal()}
//                 className="bg-slate-800 py-1.5 text-xs text-white hover:bg-slate-700"
//               >
//                 + Add Address
//               </Button>
//             </div>

//             {addressMsg && (
//               <div className="mb-4">
//                 <Alert
//                   kind={addressMsg.type === 'success' ? 'success' : 'error'}
//                 >
//                   {addressMsg.message}
//                 </Alert>
//               </div>
//             )}

//             {addresses.length === 0 ? (
//               <div className="py-8 text-center text-xs text-slate-500">
//                 No addresses saved yet. Click "+ Add Address" to create your first delivery location.
//               </div>
//             ) : (
//               <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//                 {addresses.map((addr) => (
//                   <div
//                     key={addr.id}
//                     className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400 hover:shadow-sm"
//                   >
//                     <div>
//                       <div className="mb-1.5 flex items-center justify-between gap-2">
//                         <span className="text-xs font-bold text-slate-900">
//                           {addr.recipientName}
//                         </span>

//                         <div className="flex items-center gap-1.5">
//                           {addr.isDefault && (
//                             <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
//                               Default
//                             </span>
//                           )}

//                           <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
//                             {addr.label}
//                           </span>
//                         </div>
//                       </div>

//                       <p className="text-xs text-slate-600">
//                         {addr.streetAddress}
//                       </p>

//                       <p className="text-xs text-slate-600">
//                         {addr.city}, {addr.state} - {addr.postalCode}
//                       </p>

//                       <p className="mt-2 text-xs font-medium text-slate-500">
//                         Contact: {addr.phone}
//                       </p>
//                     </div>

//                     <div className="mt-4 flex justify-end gap-3 border-t border-slate-200 pt-3 text-xs">
//                       <button
//                         type="button"
//                         onClick={() => openAddressModal(addr)}
//                         className="font-medium text-slate-700 transition hover:text-slate-900"
//                       >
//                         Edit
//                       </button>

//                       <button
//                         type="button"
//                         onClick={() => handleDeleteAddress(addr.id)}
//                         className="font-medium text-rose-600 transition hover:text-rose-800"
//                       >
//                         Delete
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </Card>
//         </div>
//       </div>

//       {/* Address Form Modal */}
//       {showAddrModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
//           <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
//             <h3 className="mb-4 text-base font-bold text-slate-900">
//               {editingAddr ? 'Edit Address' : 'Add New Shipping Address'}
//             </h3>

//             <form onSubmit={handleSaveAddress} className="space-y-3">
//               <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
//                 <div>
//                   <label className="mb-1 block text-xs font-medium text-slate-700">
//                     Recipient Name
//                   </label>

//                   <input
//                     type="text"
//                     required
//                     value={addrForm.recipientName}
//                     onChange={(e) =>
//                       setAddrForm({
//                         ...addrForm,
//                         recipientName: e.target.value,
//                       })
//                     }
//                     className={inputClass}
//                   />
//                 </div>

//                 <div>
//                   <label className="mb-1 block text-xs font-medium text-slate-700">
//                     Phone Number
//                   </label>

//                   <input
//                     type="tel"
//                     required
//                     value={addrForm.phone}
//                     onChange={(e) =>
//                       setAddrForm({
//                         ...addrForm,
//                         phone: e.target.value,
//                       })
//                     }
//                     className={inputClass}
//                   />
//                 </div>

//                 <div className="sm:col-span-2">
//                   <label className="mb-1 block text-xs font-medium text-slate-700">
//                     Street Address
//                   </label>

//                   <input
//                     type="text"
//                     required
//                     value={addrForm.streetAddress}
//                     onChange={(e) =>
//                       setAddrForm({
//                         ...addrForm,
//                         streetAddress: e.target.value,
//                       })
//                     }
//                     className={inputClass}
//                     placeholder="House/Apartment, Street, Area"
//                   />
//                 </div>

//                 <div>
//                   <label className="mb-1 block text-xs font-medium text-slate-700">
//                     City
//                   </label>

//                   <input
//                     type="text"
//                     required
//                     value={addrForm.city}
//                     onChange={(e) =>
//                       setAddrForm({
//                         ...addrForm,
//                         city: e.target.value,
//                       })
//                     }
//                     className={inputClass}
//                   />
//                 </div>

//                 <div>
//                   <label className="mb-1 block text-xs font-medium text-slate-700">
//                     State
//                   </label>

//                   <input
//                     type="text"
//                     required
//                     value={addrForm.state}
//                     onChange={(e) =>
//                       setAddrForm({
//                         ...addrForm,
//                         state: e.target.value,
//                       })
//                     }
//                     className={inputClass}
//                   />
//                 </div>

//                 <div>
//                   <label className="mb-1 block text-xs font-medium text-slate-700">
//                     Postal Code
//                   </label>

//                   <input
//                     type="text"
//                     required
//                     value={addrForm.postalCode}
//                     onChange={(e) =>
//                       setAddrForm({
//                         ...addrForm,
//                         postalCode: e.target.value,
//                       })
//                     }
//                     className={inputClass}
//                   />
//                 </div>

//                 <div>
//                   <label className="mb-1 block text-xs font-medium text-slate-700">
//                     Address Label
//                   </label>

//                   <select
//                     value={addrForm.label}
//                     onChange={(e) =>
//                       setAddrForm({
//                         ...addrForm,
//                         label: e.target.value,
//                       })
//                     }
//                     className={inputClass}
//                   >
//                     <option value="Home">Home</option>
//                     <option value="Work">Work</option>
//                     <option value="Other">Other</option>
//                   </select>
//                 </div>
//               </div>

//               <div className="pt-2">
//                 <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
//                   <input
//                     type="checkbox"
//                     checked={addrForm.isDefault}
//                     onChange={(e) =>
//                       setAddrForm({
//                         ...addrForm,
//                         isDefault: e.target.checked,
//                       })
//                     }
//                     className="rounded border-slate-300 text-slate-700 focus:ring-slate-400"
//                   />

//                   <span>Make this my default shipping address</span>
//                 </label>
//               </div>

//               <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
//                 <Button
//                   type="button"
//                   variant="secondary"
//                   onClick={() => setShowAddrModal(false)}
//                   className="py-1 text-xs"
//                 >
//                   Cancel
//                 </Button>

//                 <Button
//                   type="submit"
//                   className="bg-slate-800 py-1 text-xs text-white hover:bg-slate-700"
//                 >
//                   Save Address
//                 </Button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Alert, Button, Card, Spinner } from '../../components/ui.jsx';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-400';

export default function CustomerProfile() {
  const { user, reloadSession } = useAuth();

  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileMsg, setProfileMsg] = useState(null);
  const [addressMsg, setAddressMsg] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordMessage, setPasswordMessage] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [editingAddr, setEditingAddr] = useState(null);
  const [showAddrModal, setShowAddrModal] = useState(false);

  const [addrForm, setAddrForm] = useState({
    label: 'Home',
    recipientName: '',
    phone: '',
    streetAddress: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      const [profRes, addrRes] = await Promise.all([
        api.get('/customer/profile'),
        api.get('/customer/addresses'),
      ]);

      const p = profRes.profile || profRes;

      setProfile(p);
      setName(p.name || '');
      setPhone(p.phone || '');
      setAddresses(addrRes.items || []);
    } catch (err) {
      setProfileMsg({
        type: 'danger',
        message: err.message || 'Failed to load profile details',
      });
    } finally {
      setLoading(false);
    }
  };

  const closeAddressModal = () => {
    setShowAddrModal(false);
    setEditingAddr(null);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await api.patch('/customer/profile', { name, phone });

      setProfile(res.profile || res);

      setProfileMsg({
        type: 'success',
        message: 'Profile updated successfully.',
      });

      if (reloadSession) reloadSession();
    } catch (err) {
      setProfileMsg({
        type: 'danger',
        message: err.message || 'Failed to update profile',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({
        type: 'error',
        message: 'New passwords do not match.',
      });
      return;
    }

    setSavingPassword(true);

    try {
      const result = await api.post('/customer/profile/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setPasswordMessage({
        type: 'success',
        message: result.message,
      });
    } catch (err) {
      setPasswordMessage({
        type: 'error',
        message: err.message || 'Unable to change password.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const openAddressModal = (addr = null) => {
    if (addr) {
      setEditingAddr(addr);

      setAddrForm({
        label: addr.label || 'Home',
        recipientName: addr.recipientName || '',
        phone: addr.phone || '',
        streetAddress: addr.streetAddress || '',
        city: addr.city || '',
        state: addr.state || '',
        postalCode: addr.postalCode || '',
        isDefault: addr.isDefault || false,
      });
    } else {
      setEditingAddr(null);

      setAddrForm({
        label: 'Home',
        recipientName: name || '',
        phone: phone || '',
        streetAddress: '',
        city: '',
        state: '',
        postalCode: '',
        isDefault: addresses.length === 0,
      });
    }

    setShowAddrModal(true);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setAddressMsg(null);

    try {
      if (editingAddr) {
        await api.patch(`/customer/addresses/${editingAddr.id}`, addrForm);
      } else {
        await api.post('/customer/addresses', addrForm);
      }

      closeAddressModal();

      const res = await api.get('/customer/addresses');
      setAddresses(res.items || []);

      setAddressMsg({
        type: 'success',
        message: 'Address saved successfully.',
      });
    } catch (err) {
      setAddressMsg({
        type: 'danger',
        message: err.message || 'Failed to save address',
      });
    }
  };

  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm('Delete this saved delivery address?')) return;

    try {
      await api.delete(`/customer/addresses/${addrId}`);

      const res = await api.get('/customer/addresses');
      setAddresses(res.items || []);

      setAddressMsg({
        type: 'success',
        message: 'Address removed successfully.',
      });
    } catch (err) {
      setAddressMsg({
        type: 'danger',
        message: err.message || 'Failed to delete address',
      });
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          My Account Profile
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          Manage your personal information, contact numbers, and saved shipping addresses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Profile Section */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <h2 className="mb-4 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">
              Personal Information
            </h2>

            {profileMsg && (
              <div className="mb-4">
                <Alert kind={profileMsg.type === 'success' ? 'success' : 'error'}>
                  {profileMsg.message}
                </Alert>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Email Address
                </label>

                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 p-2.5 text-xs text-slate-500"
                />

                <span className="text-[10px] text-slate-400">
                  Account email cannot be modified directly.
                </span>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Full Name
                </label>

                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Phone Number
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91..."
                  className={inputClass}
                />
              </div>

              <Button
                type="submit"
                disabled={savingProfile}
                className="w-full bg-slate-800 py-2 text-xs text-white hover:bg-slate-700"
              >
                {savingProfile ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </form>
          </Card>

          {/* Change Password */}
          <Card className="border border-slate-200 bg-white shadow-sm">
            <h2 className="mb-4 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">
              Change Password
            </h2>

            {passwordMessage && (
              <div className="mb-4">
                <Alert kind={passwordMessage.type === 'success' ? 'success' : 'error'}>
                  {passwordMessage.message}
                </Alert>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <label className="block text-xs font-medium text-slate-700">
                Current Password
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm({
                      ...passwordForm,
                      currentPassword: event.target.value,
                    })
                  }
                  className={`${inputClass} mt-1`}
                />
              </label>

              <label className="block text-xs font-medium text-slate-700">
                New Password
                <input
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: event.target.value,
                    })
                  }
                  className={`${inputClass} mt-1`}
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  At least 8 characters, including a letter and a number.
                </span>
              </label>

              <label className="block text-xs font-medium text-slate-700">
                Confirm New Password
                <input
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: event.target.value,
                    })
                  }
                  className={`${inputClass} mt-1`}
                />
              </label>

              <Button
                type="submit"
                loading={savingPassword}
                className="w-full bg-slate-800 text-white hover:bg-slate-700"
              >
                Update Password
              </Button>
            </form>
          </Card>
        </div>

        {/* Address Book */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Saved Delivery Addresses
                </h2>

                <p className="text-xs text-slate-500">
                  Quickly select addresses during checkout.
                </p>
              </div>

              <Button
                onClick={() => openAddressModal()}
                className="bg-slate-800 py-1.5 text-xs text-white hover:bg-slate-700"
              >
                + Add Address
              </Button>
            </div>

            {addressMsg && (
              <div className="mb-4">
                <Alert kind={addressMsg.type === 'success' ? 'success' : 'error'}>
                  {addressMsg.message}
                </Alert>
              </div>
            )}

            {addresses.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No addresses saved yet. Click "+ Add Address" to create your first delivery location.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400 hover:shadow-sm"
                  >
                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {addr.recipientName}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {addr.isDefault && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                              Default
                            </span>
                          )}

                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                            {addr.label}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600">
                        {addr.streetAddress}
                      </p>

                      <p className="text-xs text-slate-600">
                        {addr.city}, {addr.state} - {addr.postalCode}
                      </p>

                      <p className="mt-2 text-xs font-medium text-slate-500">
                        Contact: {addr.phone}
                      </p>
                    </div>

                    <div className="mt-4 flex justify-end gap-3 border-t border-slate-200 pt-3 text-xs">
                      <button
                        type="button"
                        onClick={() => openAddressModal(addr)}
                        className="font-medium text-slate-700 transition hover:text-slate-900"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="font-medium text-rose-600 transition hover:text-rose-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Address Form Modal */}
      {showAddrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAddressModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-modal-title"
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            {/* Modal Header with Cross Button */}
            <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
              <h3
                id="address-modal-title"
                className="text-base font-bold text-slate-900"
              >
                {editingAddr ? 'Edit Address' : 'Add New Shipping Address'}
              </h3>

              <button
                type="button"
                onClick={closeAddressModal}
                aria-label="Close address form"
                title="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-2xl font-light text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Recipient Name
                  </label>

                  <input
                    type="text"
                    required
                    value={addrForm.recipientName}
                    onChange={(e) =>
                      setAddrForm({
                        ...addrForm,
                        recipientName: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    required
                    value={addrForm.phone}
                    onChange={(e) =>
                      setAddrForm({
                        ...addrForm,
                        phone: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Street Address
                  </label>

                  <input
                    type="text"
                    required
                    value={addrForm.streetAddress}
                    onChange={(e) =>
                      setAddrForm({
                        ...addrForm,
                        streetAddress: e.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="House/Apartment, Street, Area"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    City
                  </label>

                  <input
                    type="text"
                    required
                    value={addrForm.city}
                    onChange={(e) =>
                      setAddrForm({
                        ...addrForm,
                        city: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    State
                  </label>

                  <input
                    type="text"
                    required
                    value={addrForm.state}
                    onChange={(e) =>
                      setAddrForm({
                        ...addrForm,
                        state: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Postal Code
                  </label>

                  <input
                    type="text"
                    required
                    value={addrForm.postalCode}
                    onChange={(e) =>
                      setAddrForm({
                        ...addrForm,
                        postalCode: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Address Label
                  </label>

                  <select
                    value={addrForm.label}
                    onChange={(e) =>
                      setAddrForm({
                        ...addrForm,
                        label: e.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={addrForm.isDefault}
                    onChange={(e) =>
                      setAddrForm({
                        ...addrForm,
                        isDefault: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                  />

                  <span>Make this my default shipping address</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeAddressModal}
                  className="py-1 text-xs"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  className="bg-slate-800 py-1 text-xs text-white hover:bg-slate-700"
                >
                  Save Address
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
