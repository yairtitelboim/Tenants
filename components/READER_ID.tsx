import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RawDataItem {
  PropertyName: string;
  reader_category: string;
  total_events: number;
}

const CategoryDistribution = ({ onBack }: { onBack: () => void }) => {
  const formatData = (rawData: RawDataItem[]) => {
    const categories = Array.from(new Set(rawData.map(d => d.reader_category))).sort((a, b) => {
      const totalA = rawData.filter(d => d.reader_category === a).reduce((sum, d) => sum + d.total_events, 0);
      const totalB = rawData.filter(d => d.reader_category === b).reduce((sum, d) => sum + d.total_events, 0);
      return totalB - totalA;
    });
    
    return categories.map(category => ({
      category: category.replace(/_/g, ' '),
      "CIBC Square": rawData.find(d => d.PropertyName.includes('CIBC') && d.reader_category === category)?.total_events || 0,
      "Wolf Point": rawData.find(d => d.PropertyName.includes('Wolf') && d.reader_category === category)?.total_events || 0
    }));
  };

  const data = formatData([
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Primary_Entry","total_events":305960},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Secondary_Entry","total_events":220823},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Vertical_Transport","total_events":128865},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Floor_Access","total_events":75878},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Other","total_events":74239},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Common_Areas","total_events":33918},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Amenities","total_events":32947},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Tenant_Space","total_events":16798},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Parking_Transport","total_events":15160},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Building_Operations","total_events":3637},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Security_BOH","total_events":1618},
    {"PropertyName":"Wolf Point South","reader_category":"Secondary_Entry","total_events":527399},
    {"PropertyName":"Wolf Point South","reader_category":"Floor_Access","total_events":119858},
    {"PropertyName":"Wolf Point South","reader_category":"Vertical_Transport","total_events":89793},
    {"PropertyName":"Wolf Point South","reader_category":"Other","total_events":84548},
    {"PropertyName":"Wolf Point South","reader_category":"Parking_Transport","total_events":57510},
    {"PropertyName":"Wolf Point South","reader_category":"Security_BOH","total_events":44595},
    {"PropertyName":"Wolf Point South","reader_category":"Common_Areas","total_events":27700},
    {"PropertyName":"Wolf Point South","reader_category":"Building_Operations","total_events":16383},
    {"PropertyName":"Wolf Point South","reader_category":"Amenities","total_events":14005},
    {"PropertyName":"Wolf Point South","reader_category":"Tenant_Space","total_events":281}
  ]);

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen w-full">
      <button
        onClick={onBack}
        className="mb-4 px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200"
      >
        Back
      </button>
      
      <h2 className="text-2xl font-bold mb-6">Access Control Events by Category</h2>
      <div className="mb-8 bg-gray-800 p-4 rounded-lg">
        <ResponsiveContainer width="100%" height={600}>
          <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 150, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis 
              type="number" 
              tick={{ fill: '#fff', fontSize: 12 }}
              label={{ 
                value: "Number of Events", 
                position: "bottom", 
                fill: "#fff",
                fontSize: 14,
                offset: 0
              }}
              tickFormatter={value => new Intl.NumberFormat().format(value)}
            />
            <YAxis 
              type="category" 
              dataKey="category" 
              tick={{ fill: '#fff', fontSize: 12 }}
              width={140}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                borderColor: '#374151',
                color: '#fff',
                fontSize: 12
              }}
              formatter={(value) => {
                const num = Number(value);
                return !isNaN(num) ? new Intl.NumberFormat().format(num) : value.toString();
              }}
            />
            <Legend 
              wrapperStyle={{
                fontSize: '14px',
                paddingTop: '20px'
              }}
            />
            <Bar dataKey="CIBC Square" fill="#60a5fa" />
            <Bar dataKey="Wolf Point" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CategoryDistribution;