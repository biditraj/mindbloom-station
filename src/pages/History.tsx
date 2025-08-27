import React from 'react';
import Layout from '@/components/Layout';
import MoodHistory from '@/components/MoodHistory';

const HistoryPage = () => {
  return (
    <Layout>
      <div className="p-4 bg-white/80 backdrop-blur-sm min-h-full">
        <div className="mb-6 pb-4 border-b border-gray-200/60">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Mood History</h1>
          <p className="text-slate-600 text-sm">View your complete mood tracking journey</p>
        </div>
        <div className="pb-8">
          <MoodHistory />
        </div>
      </div>
    </Layout>
  );
};

export default HistoryPage;