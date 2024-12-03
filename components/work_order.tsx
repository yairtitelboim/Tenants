import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertCircle, Calendar, Building2, ClipboardList, ArrowLeft } from 'lucide-react';

const buildingData = [
  { name: "CIBC SQUARE", orders: 12357, daily: 124.8, days: 99 },
  { name: "River Point", orders: 4341, daily: 22.4, days: 194 },
  { name: "75 Varick St", orders: 3294, daily: 27.7, days: 119 },
  { name: "180 N LaSalle", orders: 3103, daily: 30.4, days: 102 },
  { name: "Other Buildings", orders: 17426, daily: 15.2, days: 140 }
];

const priorityData = [
  { name: "P1 Critical", value: 3, description: "Elevators, Critical HVAC", color: "#ef4444" },
  { name: "P2 High", value: 24, description: "Security, Plumbing", color: "#f59e0b" },
  { name: "P3 Normal", value: 38, description: "Maintenance, Cleaning", color: "#3b82f6" }
];

const coverageData = [
  { name: "Description", percent: 92, category: "Content" },
  { name: "Priority", percent: 66, category: "Classification" },
  { name: "Location", percent: 47, category: "Location" },
  { name: "Cost", percent: 14, category: "Financial" }
];

const StatCard = ({ icon: Icon, title, value, subtitle, className }) => (
  <Card className="bg-gray-800 border-gray-700">
    <CardContent className="pt-6">
      <div className="flex items-start">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Icon className="h-6 w-6 text-blue-500" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <h4 className="text-2xl font-bold text-white mt-1">{value}</h4>
          <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 p-3 border border-gray-700 rounded-lg shadow">
        <p className="text-white font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm text-gray-300">
            {entry.name}: {entry.value.toFixed(1)} orders/day
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function WorkOrderDashboard({ onBack }) {
  return (
    <div className="p-6 space-y-6 bg-gray-900 text-white min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Work Order Analysis - Nov 22 2024</h1>
        <button
          onClick={onBack}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          icon={Building2}
          title="Buildings Monitored"
          value="17"
          subtitle="Across multiple regions"
        />
        <StatCard 
          icon={ClipboardList}
          title="Total Work Orders"
          value="40,521"
          subtitle="Dec 2023 - Nov 2024"
        />
        <StatCard 
          icon={Calendar}
          title="Average Collection Period"
          value="140 days"
          subtitle="Per building"
        />
        <StatCard 
          icon={AlertCircle}
          title="Data Completeness"
          value="92%"
          subtitle="Core fields populated"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value, percent }) => 
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#1f2937'}} />
                <Legend 
                  verticalAlign="bottom" 
                  align="center"
                  formatter={(value, entry, index) => (
                    <span className="text-gray-300">{value}: {priorityData[index].description}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Field Coverage Analysis</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coverageData} layout="vertical">
                <XAxis 
                  type="number" 
                  domain={[0, 100]} 
                  tickFormatter={value => `${value}%`}
                  stroke="#fff"
                />
                <YAxis 
                  type="category" 
                  dataKey="name"
                  stroke="#fff"
                  width={100}
                />
                <Tooltip 
                  contentStyle={{backgroundColor: '#1f2937'}}
                  formatter={(value) => [`${value}%`, 'Coverage']}
                />
                <Bar 
                  dataKey="percent" 
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Daily Work Order Volume by Building</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buildingData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis 
                dataKey="name" 
                stroke="#fff"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#fff"
                label={{ 
                  value: 'Average Daily Orders',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#fff' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="daily" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}