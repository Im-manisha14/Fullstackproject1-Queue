import React from 'react';

const LoadingSkeleton = ({ type = 'card', count = 1 }) => {
    const SkeletonLine = ({ className }) => (
        <div className={`bg-gray-200 animate-pulse rounded ${className}`}></div>
    );

    const renderCardSkeleton = () => (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center space-x-4">
                <SkeletonLine className="w-12 h-12 rounded-full" />
                <div className="space-y-2 flex-1">
                    <SkeletonLine className="h-4 w-3/4" />
                    <SkeletonLine className="h-3 w-1/2" />
                </div>
            </div>
            <div className="space-y-2">
                <SkeletonLine className="h-3 w-full" />
                <SkeletonLine className="h-3 w-5/6" />
            </div>
        </div>
    );

    const renderListSkeleton = () => (
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100">
            <div className="flex items-center space-x-4 flex-1">
                <SkeletonLine className="w-10 h-10 rounded-lg" />
                <div className="space-y-2 flex-1">
                    <SkeletonLine className="h-4 w-1/3" />
                    <SkeletonLine className="h-3 w-1/4" />
                </div>
            </div>
            <SkeletonLine className="h-8 w-20 rounded-full" />
        </div>
    );

    const renderTableSkeleton = () => (
        <div className="space-y-4">
            <div className="flex space-x-4 mb-4">
                <SkeletonLine className="h-8 w-1/4" />
                <SkeletonLine className="h-8 w-1/4" />
            </div>
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                    <SkeletonLine className="h-12 w-full" />
                </div>
            ))}
        </div>
    );

    const renderItems = () => {
        return [...Array(count)].map((_, index) => (
            <div key={index} className="mb-4">
                {type === 'card' && renderCardSkeleton()}
                {type === 'list' && renderListSkeleton()}
                {type === 'table' && renderTableSkeleton()}
            </div>
        ));
    };

    return <div className="w-full">{renderItems()}</div>;
};

export default LoadingSkeleton;
