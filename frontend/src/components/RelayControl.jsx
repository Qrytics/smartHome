import React from 'react';
import { Card, CardContent, Typography, Box, Grid, Switch, FormControlLabel } from '@mui/material';
import PowerIcon from '@mui/icons-material/Power';

/**
 * RelayControl Component
 * 
 * Provides switches for controlling 4-channel relay module
 * for high-power loads (HVAC, main lights, etc.)
 */
const RelayControl = ({ deviceId, relayStates, onRelayChange }) => {
  const handleSwitchChange = (channel) => (event) => {
    onRelayChange(channel, event.target.checked);
  };

  const relayLabels = [
    'Main Lights',
    'Secondary Lights',
    'HVAC Fan',
    'Spare Channel'
  ];

  return (
    <Card sx={{ minWidth: 275, mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <PowerIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="div">
            Relay Control
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Device: {deviceId}
        </Typography>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {relayStates.map((state, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <FormControlLabel
                control={
                  <Switch
                    checked={state}
                    onChange={handleSwitchChange(index + 1)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">
                      {relayLabels[index]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Channel {index + 1}: {state ? 'ON' : 'OFF'}
                    </Typography>
                  </Box>
                }
              />
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default RelayControl;
