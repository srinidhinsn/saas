// import React, { useEffect, useState } from "react";
// import AuthModal from "../Modals/AuthModal";
// import { getValidToken } from "../Interceptors/Api";

// export default function ProtectedRoute({ children, clientId, requesterId }) {
//   const [showModal, setShowModal] = useState(false);
//   const [accessDenied, setAccessDenied] = useState(false);

//   // Reset accessDenied whenever token changes or component mounts
//   useEffect(() => {
//     setAccessDenied(false);
//   }, [clientId, requesterId, getValidToken()]); // you can also just run on mount if simpler

//   // Listen for 403 events from Axios interceptor
//   useEffect(() => {
//     const handle403 = () => setAccessDenied(true);
//     window.addEventListener("accessDenied", handle403);
//     return () => window.removeEventListener("accessDenied", handle403);
//   }, []);

//   // If access is denied → show the message + button
//   if (accessDenied) {
//     return (
//       <>
//         <div className="w-full h-full flex flex-col justify-center items-center text-center p-10">
//           <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
//           <p className="mt-3 text-gray-600">
//             You don't have permission to access this page.
//           </p>

//           <button
//             className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg"
//             onClick={() => setShowModal(true)}
//           >
//             Authenticate as Admin
//           </button>
//         </div>

//         <AuthModal
//           open={showModal}
//           onClose={() => setShowModal(false)}
//           onSuccess={() => window.location.reload()} // retry after getting delegate token
//           clientId={clientId}
//           requesterId={requesterId}
//         />
//       </>
//     );
//   }

//   // Normal rendering if access not denied
//   return (
//     <>
//       {children}
//       <AuthModal
//         open={showModal}
//         onClose={() => setShowModal(false)}
//         onSuccess={() => window.location.reload()}
//         clientId={clientId}
//         requesterId={requesterId}
//       />
//     </>
//   );
// }



import React, { useState } from "react";
import AuthModal from '../Modals/AuthModal'

const AccessGuard = ({ 
  screenIds, 
  requiredScreenId, 
  clientId, 
  requesterId, 
  children 
}) => {

  const [authOpen, setAuthOpen] = useState(false);

  // ❌ Not allowed
  if (!screenIds.includes(requiredScreenId)) {
    return (
      <>
        <div style={{ textAlign: "center", padding: "60px" }}>
          <h1 style={{ color: "red", fontSize: "28px" }}>Access Denied</h1>
          <p style={{ marginBottom: "20px" }}>
            You do not have permission to view this page.
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            style={{
              padding: "10px 20px",
              background: "#f97316",
              color: "white",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Authenticate
          </button>
        </div>

        {/* Auth Modal */}
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          clientId={clientId}
          requesterId={requesterId}
          onSuccess={() => window.location.reload()}
        />
      </>
    );
  }

  // Allowed
  return <>{children}</>;
};

export default AccessGuard;
