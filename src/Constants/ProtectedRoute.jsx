import React from "react";
import { Navigate, useParams } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem("access_token");
    const { clientId } = useParams();

    if (!token) {
        return <Navigate to={`/saas/${clientId}/login`} replace />;
    }

    return children;
};

export default ProtectedRoute;
