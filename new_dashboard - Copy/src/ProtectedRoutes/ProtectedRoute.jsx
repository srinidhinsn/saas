// import React from "react";
// import { Navigate } from "react-router-dom";

// const ProtectedRoute = ({ children }) => {
//     const token = localStorage.getItem("access_token");
//     return token ? children : <Navigate to="/login" />;
// };

// export default ProtectedRoute;



// 


import React from "react";
import { Navigate, useParams } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem("access_token");
    const { clientId } = useParams();

    // If no token, redirect to client-specific login page
    if (!token) {
        return <Navigate to={`/saas/${clientId}/login`} replace />;
    }

    return children;
};

export default ProtectedRoute;
