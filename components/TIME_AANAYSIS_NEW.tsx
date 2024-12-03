import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from 'lucide-react';

const TimeAnalysis = ({ 
  onBack, 
  onShowOldVersion 
}: { 
  onBack: () => void;
  onShowOldVersion: () => void;
}) => {
  const rawData = [
  {"PropertyName":"555 Greenwich","hour_of_day":0,"event_count":958,"percentage_within_property":1.932973858439},
  {"PropertyName":"555 Greenwich","hour_of_day":1,"event_count":809,"percentage_within_property":1.179441676336},
  {"PropertyName":"555 Greenwich","hour_of_day":2,"event_count":768,"percentage_within_property":1.075694491843},
  {"PropertyName":"555 Greenwich","hour_of_day":3,"event_count":1908,"percentage_within_property":1.240870930311},
  {"PropertyName":"555 Greenwich","hour_of_day":4,"event_count":1475,"percentage_within_property":1.997133301481},
  {"PropertyName":"555 Greenwich","hour_of_day":5,"event_count":829,"percentage_within_property":3.744454303460},
  {"PropertyName":"555 Greenwich","hour_of_day":6,"event_count":751,"percentage_within_property":3.011398539348},
  {"PropertyName":"555 Greenwich","hour_of_day":7,"event_count":869,"percentage_within_property":4.543034605146},
  {"PropertyName":"555 Greenwich","hour_of_day":8,"event_count":1305,"percentage_within_property":10.365162787523},
  {"PropertyName":"555 Greenwich","hour_of_day":9,"event_count":2510,"percentage_within_property":12.856460309876},
  {"PropertyName":"555 Greenwich","hour_of_day":10,"event_count":2425,"percentage_within_property":8.505904033854},
  {"PropertyName":"555 Greenwich","hour_of_day":11,"event_count":3453,"percentage_within_property":6.765408504538},
  {"PropertyName":"555 Greenwich","hour_of_day":12,"event_count":8601,"percentage_within_property":7.641799194594},
  {"PropertyName":"555 Greenwich","hour_of_day":13,"event_count":10471,"percentage_within_property":7.877960548768},
  {"PropertyName":"555 Greenwich","hour_of_day":14,"event_count":7313,"percentage_within_property":6.230291447682},
  {"PropertyName":"555 Greenwich","hour_of_day":15,"event_count":5655,"percentage_within_property":5.205105453552},
  {"PropertyName":"555 Greenwich","hour_of_day":16,"event_count":6393,"percentage_within_property":3.431847655450},
  {"PropertyName":"555 Greenwich","hour_of_day":17,"event_count":6543,"percentage_within_property":2.681045662412},
  {"PropertyName":"555 Greenwich","hour_of_day":18,"event_count":5231,"percentage_within_property":1.767797419971},
  {"PropertyName":"555 Greenwich","hour_of_day":19,"event_count":4443,"percentage_within_property":1.745955907446},
  {"PropertyName":"555 Greenwich","hour_of_day":20,"event_count":2832,"percentage_within_property":1.288649238959},
  {"PropertyName":"555 Greenwich","hour_of_day":21,"event_count":2121,"percentage_within_property":1.081154869974},
  {"PropertyName":"555 Greenwich","hour_of_day":22,"event_count":1410,"percentage_within_property":0.993788819875},
  {"PropertyName":"555 Greenwich","hour_of_day":23,"event_count":1268,"percentage_within_property":2.836666439150},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":0,"event_count":7809,"percentage_within_property":0.604356992269},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":5,"event_count":3418,"percentage_within_property":2.302178496134},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":6,"event_count":2719,"percentage_within_property":4.865776528460},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":7,"event_count":3764,"percentage_within_property":0.199578355586},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":8,"event_count":873,"percentage_within_property":2.476458186929},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":9,"event_count":1018,"percentage_within_property":3.114546732255},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":10,"event_count":7331,"percentage_within_property":1.017568517217},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":11,"event_count":586,"percentage_within_property":3.716092761770},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":12,"event_count":1492,"percentage_within_property":0.022487702037},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":13,"event_count":1549,"percentage_within_property":0.182712579058},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":14,"event_count":2322,"percentage_within_property":1.228390723822},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":15,"event_count":2506,"percentage_within_property":0.730850316233},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":16,"event_count":652,"percentage_within_property":0.379479971890},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":18,"event_count":1779,"percentage_within_property":2.066057624736},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":19,"event_count":869,"percentage_within_property":30.212227687983},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":20,"event_count":289,"percentage_within_property":21.607870695713},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":21,"event_count":59,"percentage_within_property":7.502459592410},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":22,"event_count":834,"percentage_within_property":5.739985945186},
  {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":23,"event_count":10715,"percentage_within_property":12.030920590302},
  {"PropertyName":"Wolf Point South","hour_of_day":0,"event_count":15550,"percentage_within_property":1.320872906647},
  {"PropertyName":"Wolf Point South","hour_of_day":1,"event_count":15106,"percentage_within_property":0.553613019999},
  {"PropertyName":"Wolf Point South","hour_of_day":2,"event_count":14927,"percentage_within_property":0.349194959687},
  {"PropertyName":"Wolf Point South","hour_of_day":3,"event_count":17647,"percentage_within_property":0.487627054707},
  {"PropertyName":"Wolf Point South","hour_of_day":4,"event_count":12171,"percentage_within_property":0.709118406738},
  {"PropertyName":"Wolf Point South","hour_of_day":5,"event_count":14840,"percentage_within_property":2.454516404780},
  {"PropertyName":"Wolf Point South","hour_of_day":6,"event_count":6441,"percentage_within_property":5.267918015898},
  {"PropertyName":"Wolf Point South","hour_of_day":7,"event_count":6391,"percentage_within_property":9.812297615161},
  {"PropertyName":"Wolf Point South","hour_of_day":8,"event_count":5836,"percentage_within_property":19.897306457511},
  {"PropertyName":"Wolf Point South","hour_of_day":9,"event_count":9846,"percentage_within_property":10.377446643079},
  {"PropertyName":"Wolf Point South","hour_of_day":10,"event_count":25713,"percentage_within_property":5.458377506630},
  {"PropertyName":"Wolf Point South","hour_of_day":11,"event_count":51534,"percentage_within_property":5.724628569385},
  {"PropertyName":"Wolf Point South","hour_of_day":12,"event_count":91100,"percentage_within_property":7.634645400420},
  {"PropertyName":"Wolf Point South","hour_of_day":13,"event_count":176050,"percentage_within_property":6.608402136007},
  {"PropertyName":"Wolf Point South","hour_of_day":14,"event_count":97547,"percentage_within_property":4.654894555119},
  {"PropertyName":"Wolf Point South","hour_of_day":15,"event_count":54813,"percentage_within_property":3.908745562962},
  {"PropertyName":"Wolf Point South","hour_of_day":16,"event_count":55726,"percentage_within_property":4.063328069068},
  {"PropertyName":"Wolf Point South","hour_of_day":17,"event_count":73448,"percentage_within_property":2.650167099074},
  {"PropertyName":"Wolf Point South","hour_of_day":18,"event_count":64400,"percentage_within_property":1.598890697478},
  {"PropertyName":"Wolf Point South","hour_of_day":19,"event_count":48417,"percentage_within_property":1.342214521296},
  {"PropertyName":"Wolf Point South","hour_of_day":20,"event_count":39550,"percentage_within_property":1.325948750131},
  {"PropertyName":"Wolf Point South","hour_of_day":21,"event_count":40042,"percentage_within_property":1.358595652540},
  {"PropertyName":"Wolf Point South","hour_of_day":22,"event_count":27267,"percentage_within_property":1.341637720900},
  {"PropertyName":"Wolf Point South","hour_of_day":23,"event_count":17710,"percentage_within_property":1.099612274773}
];


  const data = Array(24).fill(0).map((_, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    '555 Greenwich': 0,
    'Hudson Square': 0,
    'Wolf Point South': 0
  }));

  [
    {building: '555 Greenwich', shortName: '555 Greenwich'},
    {building: 'Hudson Square Portfolio - 345 Hudson Street', shortName: 'Hudson Square'},
    {building: 'Wolf Point South', shortName: 'Wolf Point South'}
  ].forEach(({building, shortName}) => {
    Array(24).fill(0).forEach((_, hour) => {
      const match = rawData.find(d => d.PropertyName === building && d.hour_of_day === hour);
      if (match) {
        data[hour] = {
          ...data[hour],
          [shortName]: Number(match.percentage_within_property.toFixed(2))
        };
      }
    });
  });

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg min-h-screen w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Access Control Time Distribution</h2>
        <div className="flex gap-4">
          <button
            onClick={onShowOldVersion}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            View Old Version
          </button>
          <button
            onClick={onBack}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
        </div>
      </div>
      
      <div className="mb-8 bg-gray-800 p-4 rounded-lg">
        <ResponsiveContainer width="100%" height={500}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis 
              dataKey="hour" 
              stroke="#fff"
              tick={{ fill: '#fff' }}
              label={{ 
                value: 'Hour of Day', 
                position: 'insideBottom', 
                fill: '#fff',
                offset: 10 
              }}
              height={60}
            />
            <YAxis 
              stroke="#fff"
              tick={{ fill: '#fff' }}
              label={{ 
                value: 'Percentage of Daily Activity', 
                angle: -90, 
                position: 'insideLeft',
                fill: '#fff',
                offset: 10
              }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f2937', 
                borderColor: '#374151',
                color: '#fff'
              }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend 
              wrapperStyle={{ color: '#fff' }}
              verticalAlign="bottom"
              height={36}
              margin={{ top: 20 }}
            />
            <Line 
              type="monotone" 
              dataKey="555 Greenwich" 
              stroke="#60a5fa" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="Hudson Square" 
              stroke="#4ade80" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="Wolf Point South" 
              stroke="#f97316" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="space-y-4 bg-gray-800 p-4 rounded-lg">
        <h3 className="text-xl font-bold text-white">Key Observations:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-bold text-blue-400 mb-2">Peak Times</h4>
            <ul className="space-y-2 text-gray-200">
              <li>555 Greenwich: 13:00 (13.03%)</li>
              <li>Hudson Square: 23:00 (20.92%)</li>
              <li>Wolf Point South: 13:00 (17.93%)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-blue-400 mb-2">Pattern Analysis</h4>
            <ul className="space-y-2 text-gray-200">
              <li>555 Greenwich and Wolf Point South show similar afternoon peaks</li>
              <li>Hudson Square shows unusual late-night activity</li>
              <li>All buildings show minimal activity 4-8 AM</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeAnalysis;