// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import { BrowserRouter } from 'react-router-dom';
// import App from './App.jsx';
// import AppErrorBoundary from './components/AppErrorBoundary.jsx';
// import { AuthProvider } from './context/AuthContext.jsx';
// import './index.css';

// ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <AuthProvider>
//         <AppErrorBoundary><App /></AppErrorBoundary>
//       </AuthProvider>
//     </BrowserRouter>
//   </React.StrictMode>,
// );


import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
