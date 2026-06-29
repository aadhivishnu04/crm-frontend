import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';

const ProtectedRoute = ({ allowedRoles }) => {
    const user = getCurrentUser();

    // If no user is found, redirect to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If user role is not in the allowed list, redirect to unauthorized
    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    // If authorized, render the child routes (Outlet)
    return <Outlet />;
};

export default ProtectedRoute;