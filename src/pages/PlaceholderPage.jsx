import React from 'react';

const PlaceholderPage = ({ title }) => (
    <div className="poppins-regular">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-gray-600">This is the {title} module.</p>
    </div>
);

export default PlaceholderPage;