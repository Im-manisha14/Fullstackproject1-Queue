import React from 'react';

const LoadingSpinner = ({ size = 'large', text = 'Loading...' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
      <div className="text-center">
        <div className={`${sizeClasses[size]} border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4`}></div>
        <p className="text-gray-600 text-lg">{text}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;