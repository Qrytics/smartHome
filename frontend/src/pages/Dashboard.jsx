import React, { useState, useEffect } from 'react';
import { Container, Grid, Typography, Box, Paper } from '@mui/material';
import DimmerControl from '../components/DimmerControl';
import RelayControl from '../components/RelayControl';
import AmbientLightGraph from '../components/AmbientLightGraph';
import { setDimmerBrightness, setRelayState, setDaylightHarvestMode } from '../services/api';

/**
 * Dashboard Page
 * 
 * Main dashboard displaying:
 * - Environmental sensors (temperature, humidity)
 * - Ambient light levels
 * - Lighting controls (dimmer, relays)
 */
const Dashboard = () => {
  const [deviceId] = useState('lighting-control-01');
  const [brightness, setBrightness] = useState(100);
  const [daylightHarvest, setDaylightHarvest] = useState(true);
  const [relayStates, setRelayStates] = useState([false, false, false, false]);
  const [lightData, setLightData] = useState([]);

  // Simulate real-time data updates
  useEffect(() => {
    // TODO: Replace with WebSocket connection for real-time updates
    const interval = setInterval(() => {
      // Generate sample data for demonstration
      const now = new Date();
      const newDataPoint = {
        timestamp: now.toISOString(),
        light_level: Math.random() * 100,
        light_lux: Math.random() * 1000,
      };
      
      setLightData(prev => {
        const updated = [...prev, newDataPoint];
        // Keep only last 20 data points
        return updated.slice(-20);
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleBrightnessChange = async (newBrightness) => {
    setBrightness(newBrightness);
    try {
      await setDimmerBrightness(deviceId, newBrightness);
      console.log(`Brightness set to ${newBrightness}%`);
    } catch (error) {
      console.error('Failed to set brightness:', error);
    }
  };

  const handleDaylightHarvestToggle = async (enabled) => {
    setDaylightHarvest(enabled);
    try {
      await setDaylightHarvestMode(deviceId, enabled);
      console.log(`Daylight harvesting ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle daylight harvesting:', error);
    }
  };

  const handleRelayChange = async (channel, state) => {
    const newStates = [...relayStates];
    newStates[channel - 1] = state;
    setRelayStates(newStates);
    
    try {
      await setRelayState(deviceId, channel, state);
      console.log(`Relay ${channel} set to ${state ? 'ON' : 'OFF'}`);
    } catch (error) {
      console.error('Failed to set relay state:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Smart Home Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor and control your smart home lighting system
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Ambient Light Graph */}
        <Grid item xs={12}>
          <AmbientLightGraph data={lightData} deviceId={deviceId} />
        </Grid>

        {/* Dimmer Control */}
        <Grid item xs={12} md={6}>
          <DimmerControl
            deviceId={deviceId}
            brightness={brightness}
            daylightHarvest={daylightHarvest}
            onBrightnessChange={handleBrightnessChange}
            onDaylightHarvestToggle={handleDaylightHarvestToggle}
          />
        </Grid>

        {/* Relay Control */}
        <Grid item xs={12} md={6}>
          <RelayControl
            deviceId={deviceId}
            relayStates={relayStates}
            onRelayChange={handleRelayChange}
          />
        </Grid>

        {/* System Status */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              System Status
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Device: {deviceId}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Status: Connected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Current Brightness: {brightness}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Daylight Harvesting: {daylightHarvest ? 'Enabled' : 'Disabled'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
