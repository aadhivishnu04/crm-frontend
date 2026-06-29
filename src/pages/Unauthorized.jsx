import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center poppins-regular">
            <h1 className="text-6xl font-bold text-gray-300 mb-4">403</h1>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-500 mb-6">You do not have permission to view this page.</p>
            <Link to="/dashboard" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md transition-colors">
                Return to Dashboard
            </Link>
        </div>
    );
};

export default Unauthorized;