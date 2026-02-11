import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import WbSunnyIcon from '@mui/icons-material/WbSunny';

/**
 * AmbientLightGraph Component
 * 
 * Displays real-time ambient light level readings over time
 * with visualization of light intensity (0-100% or lux)
 */
const AmbientLightGraph = ({ data, deviceId }) => {
  // Format data for recharts
  const formattedData = data.map(point => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    lightLevel: point.light_level,
    lightLux: point.light_lux,
  }));

  return (
    <Card sx={{ minWidth: 275, mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <WbSunnyIcon sx={{ mr: 1, color: 'warning.main' }} />
          <Typography variant="h6" component="div">
            Ambient Light Levels
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Device: {deviceId}
        </Typography>

        <Box sx={{ width: '100%', height: 300, mt: 2 }}>
          <ResponsiveContainer>
            <LineChart
              data={formattedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                yAxisId="left"
                label={{ value: 'Light Level (%)', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                label={{ value: 'Lux', angle: 90, position: 'insideRight' }}
              />
              <Tooltip />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="lightLevel" 
                stroke="#FFA726" 
                name="Light Level (%)"
                strokeWidth={2}
                dot={false}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="lightLux" 
                stroke="#66BB6A" 
                name="Lux"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        {data.length === 0 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            No data available
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default AmbientLightGraph;
