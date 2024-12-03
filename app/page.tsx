'use client';

import Link from 'next/link';
import WorkOrderDashboard from '@/components/work_order';
import TimeAnalysis from '@/components/TIME_AANAYSIS';
import TimeAnalysisNew from '@/components/TIME_AANAYSIS_NEW';
import CategoryDistribution from '@/components/READER_ID';
import TenantDashboard from '@/components/TENANTS';
import { useState } from 'react';

export default function HomePage() {
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [showOldVersion, setShowOldVersion] = useState(false);

  const handleBack = () => {
    if (showOldVersion) {
      setShowOldVersion(false);
    } else {
      setSelectedView(null);
    }
  };

  if (selectedView === 'workorder') {
    return <WorkOrderDashboard onBack={handleBack} />;
  }

  if (selectedView === 'timeanalysis') {
    if (showOldVersion) {
      return <TimeAnalysis onBack={handleBack} />;
    }
    return <TimeAnalysisNew onBack={handleBack} onShowOldVersion={() => setShowOldVersion(true)} />;
  }

  if (selectedView === 'readerid') {
    return <CategoryDistribution onBack={handleBack} />;
  }

  if (selectedView === 'tenant') {
    return <TenantDashboard onBack={handleBack} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold text-white mb-12">
        Kode Aggregation Analysis
      </h1>
      
      <div className="space-y-4">
        <button
          onClick={() => setSelectedView('workorder')}
          className="w-64 px-6 py-3 text-lg font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200"
        >
          Work Order
        </button>
        
        <button
          onClick={() => setSelectedView('timeanalysis')}
          className="w-64 px-6 py-3 text-lg font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200"
        >
          Time Analysis
        </button>
        
        <button
          onClick={() => setSelectedView('readerid')}
          className="w-64 px-6 py-3 text-lg font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200"
        >
          Reader Analysis
        </button>

        <button
          onClick={() => setSelectedView('tenant')}
          className="w-64 px-6 py-3 text-lg font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200"
        >
          Tenant Analysis
        </button>
      </div>
    </div>
  );
}
