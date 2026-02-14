import React from 'react';
import PropTypes from 'prop-types';

const Card = ({ children, className = '', ...props }) => {
    return (
        <div
            className={`bg-white rounded-lg shadow-sm border border-gray-100 p-6 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

Card.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string
};

export default Card;
