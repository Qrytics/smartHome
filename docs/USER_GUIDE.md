# User Guide

Welcome to the Smart Home System user guide. This document will help you use the dashboard and understand system features.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Monitoring Temperature](#monitoring-temperature)
4. [Managing Access Control](#managing-access-control)
5. [Viewing Access Logs](#viewing-access-logs)
6. [System Status](#system-status)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Accessing the Dashboard

1. Open your web browser
2. Navigate to: `http://localhost:3000` (development) or your deployed URL
3. The dashboard will load and automatically connect to the backend

### Dashboard Layout

The dashboard consists of four main sections:

- **Temperature Monitoring** - Real-time temperature and humidity graphs
- **Access Control** - RFID card management
- **Access Logs** - Historical access attempt records
- **System Status** - Device health indicators

## Dashboard Overview

### Navigation

Use the sidebar menu to navigate between different sections:

- 🏠 **Dashboard** - Overview of all systems
- 🌡️ **Temperature** - Detailed environmental data
- 🔐 **Access Control** - Manage RFID cards
- 📊 **Analytics** - Historical data analysis
- ⚙️ **Settings** - System configuration

### Real-Time Updates

The dashboard automatically updates in real-time using WebSocket connections. You'll see:

- 🟢 **Green indicator** - Connected and receiving updates
- 🟡 **Yellow indicator** - Connecting...
- 🔴 **Red indicator** - Disconnected

## Monitoring Temperature

### Live Temperature Graph

The temperature graph shows real-time readings from the BME280 sensor:

- **Blue line** - Temperature (°C)
- **Orange line** - Humidity (%)
- **Green line** - Pressure (hPa) - if enabled

**Features:**
- Hover over the graph to see exact values
- Graph auto-scales to fit data range
- Shows last 100 data points by default

### Current Readings

The current readings panel displays:

```
Temperature: 23.5°C
Humidity: 45.2%
Pressure: 1013.25 hPa
Last Updated: 2 seconds ago
```

### Historical Data

To view historical temperature data:

1. Click **Analytics** in the sidebar
2. Select date range using the date picker
3. Choose aggregation interval (1m, 5m, 1h, 1d)
4. Click **Load Data**

### Downloading Data

To export temperature data:

1. Navigate to **Analytics**
2. Select desired date range
3. Click **Export CSV** button
4. Save the downloaded file

## Managing Access Control

### Viewing Authorized Cards

The **Access Control** page shows all authorized RFID cards:

| Card UID | User Name | Added Date | Expires | Status | Actions |
|----------|-----------|------------|---------|--------|---------|
| 04:A3:2B:F2:1C:80 | John Doe | 2026-01-15 | Never | Active | Edit / Delete |

### Adding a New Card

To authorize a new RFID card:

1. Click **Add Card** button
2. Fill in the form:
   - **Card UID**: Enter the card's unique ID (format: XX:XX:XX:XX:XX:XX)
   - **User Name**: Enter the cardholder's name
   - **Expiration Date**: (Optional) Set an expiration date
3. Click **Save**

**Note:** To find a card's UID, tap it on the RFID reader and check the access logs for denied entries.

### Removing a Card

To revoke access for a card:

1. Find the card in the list
2. Click the **Delete** button (🗑️ icon)
3. Confirm the deletion
4. Access is immediately revoked

### Editing Card Details

To update card information:

1. Click the **Edit** button (✏️ icon)
2. Modify user name or expiration date
3. Click **Save Changes**

### Card Expiration

Cards with expiration dates:
- Automatically become inactive after expiration
- Show "Expired" status in red
- Can be reactivated by updating the expiration date

## Viewing Access Logs

### Access Log Table

The access logs show all card swipe attempts:

| Timestamp | Device | Card UID | User | Result | Latency |
|-----------|--------|----------|------|--------|---------|
| 2026-02-09 19:59:04 | door-control-01 | 04:A3:2B:F2:1C:80 | John Doe | ✅ Granted | 42ms |
| 2026-02-09 19:58:32 | door-control-01 | FF:FF:FF:FF:FF:FF | Unknown | ❌ Denied | 38ms |

**Columns:**
- **Timestamp** - When the card was scanned
- **Device** - Which door/reader was used
- **Card UID** - RFID card identifier
- **User** - Cardholder name (if known)
- **Result** - Access granted or denied
- **Latency** - Response time in milliseconds

### Filtering Logs

Use the filter controls to narrow down results:

- **Date Range** - Select start and end dates
- **Device** - Filter by specific door/reader
- **Result** - Show only granted or denied attempts
- **Search** - Search by card UID or user name

### Understanding Results

**✅ Granted** - Access was allowed because:
- Card is in the whitelist
- Card has not expired
- System is functioning normally

**❌ Denied** - Access was refused because:
- Card not in whitelist
- Card has expired
- System is in lockdown mode

### Exporting Logs

To generate a report:

1. Apply desired filters
2. Click **Export** button
3. Choose format (CSV or PDF)
4. Save the downloaded report

## System Status

### Device Health Indicators

The system status panel shows the health of all components:

```
Backend API:       🟢 Online
Redis Cache:       🟢 Connected
Database:          🟢 Connected
Door Control:      🟢 Online (Last seen: 5s ago)
Sensor Monitor:    🟢 Online (Last seen: 2s ago)
```

**Status Indicators:**
- 🟢 **Online/Connected** - Operating normally
- 🟡 **Warning** - Degraded performance
- 🔴 **Offline/Disconnected** - Service unavailable

### Performance Metrics

View system performance:

- **Access Control Latency** - Average: 42ms, P99: 85ms
- **Sensor Data Rate** - 1.0 readings/second
- **WebSocket Clients** - 3 connected
- **Database Size** - 234 MB

### Alerts and Notifications

System alerts appear in the top-right corner:

- 🔔 **Info** - Informational message (blue)
- ⚠️ **Warning** - Potential issue (yellow)
- ❌ **Error** - System error (red)

Click on an alert to view details and recommended actions.

## Troubleshooting

### Dashboard Not Loading

**Problem:** Page shows "Loading..." indefinitely

**Solutions:**
1. Check if backend server is running:
   ```bash
   curl http://localhost:8000/health
   ```
2. Verify `.env` file has correct `REACT_APP_API_URL`
3. Clear browser cache and reload page

### No Real-Time Updates

**Problem:** Temperature graph not updating

**Solutions:**
1. Check WebSocket connection indicator (top-right)
2. Ensure ESP32 sensor monitor is powered on
3. Check network connectivity between ESP32 and backend
4. Open browser console (F12) for error messages

### Card Not Recognized

**Problem:** RFID card shows as "Denied" even after adding

**Solutions:**
1. Verify card UID matches exactly (check access logs)
2. Confirm card status is "Active" (not expired)
3. Allow 1-2 seconds for Redis cache to update
4. Check RFID reader LED indicators on ESP32

### Slow Access Control

**Problem:** Door takes >3 seconds to unlock

**Solutions:**
1. Check access log latency column
2. Verify WiFi signal strength on ESP32
3. Ensure backend server isn't overloaded
4. Check Redis service is running

### Temperature Readings Stuck

**Problem:** Same temperature shown for several minutes

**Solutions:**
1. Check ESP32 sensor monitor is connected to WiFi
2. Verify BME280 sensor is properly connected (I2C)
3. Check OLED display shows current readings
4. Restart ESP32 sensor monitor

### Cannot Add New Card

**Problem:** "Add Card" button doesn't work

**Solutions:**
1. Verify card UID format: `XX:XX:XX:XX:XX:XX` (uppercase hex)
2. Check if card already exists in the list
3. Ensure backend API is accessible
4. Check browser console for error messages

## Tips and Best Practices

### For Best Performance

- Keep firmware updated to latest version
- Use strong WiFi signal (ESP32 near router)
- Regularly clean RFID reader surface
- Monitor system alerts proactively

### For Security

- Regularly review access logs for suspicious activity
- Remove expired or unused cards promptly
- Use unique card UIDs (don't reuse)
- Keep backup of authorized card list

### For Data Analysis

- Export logs monthly for long-term records
- Use 1-hour aggregation for daily trends
- Compare temperature across weeks/months
- Set up alerts for unusual patterns

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [Setup Guide](SETUP.md) for configuration help
2. Review [Architecture Documentation](ARCHITECTURE.md) for system details
3. Open an issue on GitHub with:
   - Description of the problem
   - Steps to reproduce
   - Screenshots if applicable
   - Browser console logs (F12)

---

Last updated: 2026-02-09
