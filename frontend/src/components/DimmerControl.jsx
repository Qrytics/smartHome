import React from 'react';
import { Card, CardContent, Typography, Slider, Switch, FormControlLabel, Box } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

/**
 * DimmerControl Component
 * 
 * Provides a user interface for controlling LED brightness with:
 * - Brightness slider (0-100%)
 * - Daylight harvesting toggle
 * - Real-time status display
 */
const DimmerControl = ({ deviceId, brightness, daylightHarvest, onBrightnessChange, onDaylightHarvestToggle }) => {
  const handleSliderChange = (event, newValue) => {
    onBrightnessChange(newValue);
  };

  const handleSwitchChange = (event) => {
    onDaylightHarvestToggle(event.target.checked);
  };

  return (
    <Card sx={{ minWidth: 275, mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <LightbulbIcon sx={{ mr: 1, color: brightness > 0 ? 'primary.main' : 'grey.500' }} />
          <Typography variant="h6" component="div">
            Lighting Control
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Device: {deviceId}
        </Typography>

        <Box sx={{ mt: 3, mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Brightness: {brightness}%
          </Typography>
          <Slider
            value={brightness}
            onChange={handleSliderChange}
            aria-labelledby="brightness-slider"
            valueLabelDisplay="auto"
            step={1}
            marks
            min={0}
            max={100}
            disabled={daylightHarvest}
            sx={{ mt: 1 }}
          />
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={daylightHarvest}
              onChange={handleSwitchChange}
              color="primary"
            />
          }
          label="Daylight Harvesting (Auto)"
        />

        {daylightHarvest && (
          <Typography variant="caption" display="block" sx={{ mt: 1, color: 'info.main' }}>
            Brightness is automatically adjusted based on ambient light
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default DimmerControl;
