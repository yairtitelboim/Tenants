'use client';
import { useState } from 'react';
import TenantDashboard from '@/components/TENANTS';
import PLACER from '@/components/PLACER';

export default function Page() {
  const [currentView, setCurrentView] = useState<'tenant' | 'placer'>('tenant');

  return (
    <div>
      <div className="p-4 flex gap-4">
        <button
          onClick={() => setCurrentView('tenant')}
          className={`px-4 py-2 rounded-lg ${
            currentView === 'tenant' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          Tenant Dashboard
        </button>
        <button
          onClick={() => setCurrentView('placer')}
          className={`px-4 py-2 rounded-lg ${
            currentView === 'placer' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          PLACER
        </button>
      </div>

      {currentView === 'tenant' ? (
        <TenantDashboard onBack={() => {}} />
      ) : (
        <PLACER onBack={() => setCurrentView('tenant')} />
      )}
    </div>
  );
}
