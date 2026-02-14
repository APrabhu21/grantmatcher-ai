
import React from 'react';

export default function GrantCardSkeleton() {
    return (
        <div className="catalogue-card flex flex-col h-full bg-white opacity-60">
            <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-slate-100 skeleton-pulse"></div>
                    <div className="w-24 h-5 bg-slate-100 skeleton-pulse"></div>
                </div>

                <div className="h-7 w-3/4 bg-slate-100 skeleton-pulse mb-2"></div>
                <div className="h-7 w-1/2 bg-slate-100 skeleton-pulse mb-2"></div>
                <div className="h-4 w-1/3 bg-slate-50 skeleton-pulse mb-4"></div>

                <div className="space-y-2 mb-6">
                    <div className="h-3 w-full bg-slate-50 skeleton-pulse"></div>
                    <div className="h-3 w-full bg-slate-50 skeleton-pulse"></div>
                    <div className="h-3 w-2/3 bg-slate-50 skeleton-pulse"></div>
                </div>

                <div className="space-y-3 mb-6 pt-4 border-t border-slate-50">
                    <div className="flex justify-between">
                        <div className="h-3 w-16 bg-slate-50 skeleton-pulse"></div>
                        <div className="h-3 w-24 bg-slate-50 skeleton-pulse"></div>
                    </div>
                    <div className="flex justify-between">
                        <div className="h-3 w-20 bg-slate-50 skeleton-pulse"></div>
                        <div className="h-3 w-16 bg-slate-50 skeleton-pulse"></div>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-auto">
                <div className="flex gap-3">
                    <div className="flex-1 h-9 bg-slate-100 skeleton-pulse"></div>
                    <div className="w-16 h-9 bg-slate-100 skeleton-pulse"></div>
                </div>
            </div>
        </div>
    );
}
