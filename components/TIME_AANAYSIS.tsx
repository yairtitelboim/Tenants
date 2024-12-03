import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from 'lucide-react';

const TimeAnalysis = ({ onBack }: { onBack: () => void }) => {
  const rawData = [
    {"PropertyName":"555 Greenwich","hour_of_day":0,"event_count":958,"percentage_within_property":1.192417321168},
    {"PropertyName":"555 Greenwich","hour_of_day":1,"event_count":809,"percentage_within_property":1.006957842197},
    {"PropertyName":"555 Greenwich","hour_of_day":2,"event_count":768,"percentage_within_property":0.955925368118},
    {"PropertyName":"555 Greenwich","hour_of_day":3,"event_count":1908,"percentage_within_property":2.374877086419},
    {"PropertyName":"555 Greenwich","hour_of_day":4,"event_count":1475,"percentage_within_property":1.835924372362},
    {"PropertyName":"555 Greenwich","hour_of_day":5,"event_count":829,"percentage_within_property":1.031851731992},
    {"PropertyName":"555 Greenwich","hour_of_day":6,"event_count":751,"percentage_within_property":0.934765561792},
    {"PropertyName":"555 Greenwich","hour_of_day":7,"event_count":869,"percentage_within_property":1.081639511581},
    {"PropertyName":"555 Greenwich","hour_of_day":8,"event_count":1305,"percentage_within_property":1.624326309107},
    {"PropertyName":"555 Greenwich","hour_of_day":9,"event_count":2510,"percentage_within_property":3.124183169241},
    {"PropertyName":"555 Greenwich","hour_of_day":10,"event_count":2425,"percentage_within_property":3.018384137613},
    {"PropertyName":"555 Greenwich","hour_of_day":11,"event_count":3453,"percentage_within_property":4.297930073063},
    {"PropertyName":"555 Greenwich","hour_of_day":12,"event_count":8601,"percentage_within_property":10.705617306232},
    {"PropertyName":"555 Greenwich","hour_of_day":13,"event_count":10471,"percentage_within_property":13.033196002041},
    {"PropertyName":"555 Greenwich","hour_of_day":14,"event_count":7313,"percentage_within_property":9.102450803450},
    {"PropertyName":"555 Greenwich","hour_of_day":15,"event_count":5655,"percentage_within_property":7.038747339465},
    {"PropertyName":"555 Greenwich","hour_of_day":16,"event_count":6393,"percentage_within_property":7.957331872891},
    {"PropertyName":"555 Greenwich","hour_of_day":17,"event_count":6543,"percentage_within_property":8.144036046352},
    {"PropertyName":"555 Greenwich","hour_of_day":18,"event_count":5231,"percentage_within_property":6.510996875816},
    {"PropertyName":"555 Greenwich","hour_of_day":19,"event_count":4443,"percentage_within_property":5.530177617903},
    {"PropertyName":"555 Greenwich","hour_of_day":20,"event_count":2832,"percentage_within_property":3.524974794936},
    {"PropertyName":"555 Greenwich","hour_of_day":21,"event_count":2121,"percentage_within_property":2.639997012733},
    {"PropertyName":"555 Greenwich","hour_of_day":22,"event_count":1410,"percentage_within_property":1.755019230529},
    {"PropertyName":"555 Greenwich","hour_of_day":23,"event_count":1268,"percentage_within_property":1.578272612987},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":0,"event_count":7809,"percentage_within_property":15.245402366170},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":1,"event_count":3418,"percentage_within_property":6.672913982273},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":2,"event_count":2719,"percentage_within_property":5.308265979461},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":3,"event_count":3764,"percentage_within_property":7.348404982234},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":4,"event_count":873,"percentage_within_property":1.704345788918},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":9,"event_count":1018,"percentage_within_property":1.987427277341},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":10,"event_count":7331,"percentage_within_property":14.312209597438},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":11,"event_count":586,"percentage_within_property":1.144039670454},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":12,"event_count":1492,"percentage_within_property":2.912810901565},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":13,"event_count":1549,"percentage_within_property":3.024091210807},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":14,"event_count":2322,"percentage_within_property":4.533208387021},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":15,"event_count":2506,"percentage_within_property":4.892429034399},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":16,"event_count":652,"percentage_within_property":1.272890554839},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":17,"event_count":638,"percentage_within_property":1.245558549060},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":18,"event_count":1779,"percentage_within_property":3.473117020030},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":19,"event_count":869,"percentage_within_property":1.696536644410},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":20,"event_count":289,"percentage_within_property":0.564210690718},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":21,"event_count":59,"percentage_within_property":0.115184881496},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":22,"event_count":834,"percentage_within_property":1.628206629963},
    {"PropertyName":"Hudson Square Portfolio - 345 Hudson Street","hour_of_day":23,"event_count":10715,"percentage_within_property":20.918745851391},
    {"PropertyName":"Wolf Point South","hour_of_day":0,"event_count":15550,"percentage_within_property":1.583386961444},
    {"PropertyName":"Wolf Point South","hour_of_day":1,"event_count":15106,"percentage_within_property":1.538176426982},
    {"PropertyName":"Wolf Point South","hour_of_day":2,"event_count":14927,"percentage_within_property":1.519949657458},
    {"PropertyName":"Wolf Point South","hour_of_day":3,"event_count":17647,"percentage_within_property":1.796915093801},
    {"PropertyName":"Wolf Point South","hour_of_day":4,"event_count":12171,"percentage_within_property":1.239318502105},
    {"PropertyName":"Wolf Point South","hour_of_day":5,"event_count":14840,"percentage_within_property":1.511090836517},
    {"PropertyName":"Wolf Point South","hour_of_day":6,"event_count":6441,"percentage_within_property":0.655858226280},
    {"PropertyName":"Wolf Point South","hour_of_day":7,"event_count":6391,"percentage_within_property":0.650766949877},
    {"PropertyName":"Wolf Point South","hour_of_day":8,"event_count":5836,"percentage_within_property":0.594253781800},
    {"PropertyName":"Wolf Point South","hour_of_day":9,"event_count":9846,"percentage_within_property":1.002574149349},
    {"PropertyName":"Wolf Point South","hour_of_day":10,"event_count":25713,"percentage_within_property":2.618239803191},
    {"PropertyName":"Wolf Point South","hour_of_day":11,"event_count":51534,"percentage_within_property":5.247476763414},
    {"PropertyName":"Wolf Point South","hour_of_day":12,"event_count":91100,"percentage_within_property":9.276305606920},
    {"PropertyName":"Wolf Point South","hour_of_day":13,"event_count":176050,"percentage_within_property":17.926384216228},
    {"PropertyName":"Wolf Point South","hour_of_day":14,"event_count":97547,"percentage_within_property":9.932774786370},
    {"PropertyName":"Wolf Point South","hour_of_day":15,"event_count":54813,"percentage_within_property":5.581362669946},
    {"PropertyName":"Wolf Point South","hour_of_day":16,"event_count":55726,"percentage_within_property":5.674329377072},
    {"PropertyName":"Wolf Point South","hour_of_day":17,"event_count":73448,"percentage_within_property":7.478881385478},
    {"PropertyName":"Wolf Point South","hour_of_day":18,"event_count":64400,"percentage_within_property":6.557564007526},
    {"PropertyName":"Wolf Point South","hour_of_day":19,"event_count":48417,"percentage_within_property":4.930086592429},
    {"PropertyName":"Wolf Point South","hour_of_day":20,"event_count":39550,"percentage_within_property":4.027199635057},
    {"PropertyName":"Wolf Point South","hour_of_day":21,"event_count":40042,"percentage_within_property":4.077297794866},
    {"PropertyName":"Wolf Point South","hour_of_day":22,"event_count":27267,"percentage_within_property":2.776476673808},
    {"PropertyName":"Wolf Point South","hour_of_day":23,"event_count":17710,"percentage_within_property":1.803330102069}
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
        <button
          onClick={onBack}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
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