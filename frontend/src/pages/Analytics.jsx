import React, { useEffect, useMemo, useState } from 'react';
import EnvironmentalChart from '../components/charts/EnvironmentalChart';
import LightingChart from '../components/charts/LightingChart';
import MetricCard from '../components/common/MetricCard';
import Panel from '../components/common/Panel';
import { useSmartHome } from '../contexts/SmartHomeContext';
import { downloadCsvFile, mergeSeriesForCsv, rowsToCsv } from '../utils/csv';
import { computeSeriesStats, filterSeriesByRange, formatTempC } from '../utils/formatters';

const RANGE_OPTIONS = [
  { value: '1h', label: '1 hour', hours: 1 },
  { value: '6h', label: '6 hours', hours: 6 },
  { value: '24h', label: '24 hours', hours: 24 },
  { value: '7d', label: '7 days', hours: 24 * 7 },
  { value: 'custom', label: 'Custom', hours: null },
];

function toDatetimeLocalInput(date) {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';

  const tzOffset = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function Analytics() {
  const {
    environmentalData,
    lightingData,
    loading,
    refreshEnvironmentalHistory,
    refreshLightingHistory,
  } = useSmartHome();
  const [rangeKey, setRangeKey] = useState('24h');
  const [customStart, setCustomStart] = useState(
    toDatetimeLocalInput(new Date(Date.now() - 24 * 60 * 60 * 1000))
  );
  const [customEnd, setCustomEnd] = useState(toDatetimeLocalInput(new Date()));

  useEffect(() => {
    const option = RANGE_OPTIONS.find((item) => item.value === rangeKey);
    if (!option || !option.hours) return;
    refreshLightingHistory(option.hours);
    refreshEnvironmentalHistory(option.hours);
  }, [rangeKey, refreshEnvironmentalHistory, refreshLightingHistory]);

  const { startTime, endTime } = useMemo(() => {
    if (rangeKey === 'custom') {
      return {
        startTime: customStart ? new Date(customStart).toISOString() : null,
        endTime: customEnd ? new Date(customEnd).toISOString() : null,
      };
    }

    const option = RANGE_OPTIONS.find((item) => item.value === rangeKey);
    const hours = option?.hours || 24;
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    return {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };
  }, [customEnd, customStart, rangeKey]);

  const filteredEnvironmental = useMemo(
    () => filterSeriesByRange(environmentalData, startTime, endTime),
    [environmentalData, startTime, endTime]
  );
  const filteredLighting = useMemo(
    () => filterSeriesByRange(lightingData, startTime, endTime),
    [lightingData, startTime, endTime]
  );

  const tempStats = useMemo(
    () => computeSeriesStats(filteredEnvironmental, 'temperature'),
    [filteredEnvironmental]
  );
  const humidityStats = useMemo(
    () => computeSeriesStats(filteredEnvironmental, 'humidity'),
    [filteredEnvironmental]
  );
  const luxStats = useMemo(() => computeSeriesStats(filteredLighting, 'light_lux'), [filteredLighting]);
  const dimmerStats = useMemo(
    () => computeSeriesStats(filteredLighting, 'dimmer_brightness'),
    [filteredLighting]
  );

  function handleExportCsv() {
    const mergedRows = mergeSeriesForCsv(filteredEnvironmental, filteredLighting);
    const csv = rowsToCsv(mergedRows, [
      'timestamp',
      'temperature',
      'humidity',
      'pressure',
      'light_level',
      'light_lux',
      'dimmer_brightness',
      'daylight_harvest_mode',
      'relays',
    ]);
    downloadCsvFile(`smarthome-analytics-${Date.now()}.csv`, csv);
  }

  function applyCustomRange() {
    setRangeKey('custom');
    refreshLightingHistory(24 * 7);
    refreshEnvironmentalHistory(24 * 7);
  }

  return (
    <div className="page-stack">
      <Panel
        title="Historical Analytics"
        subtitle="Compare environmental and lighting behavior over historical windows"
        actions={
          <div className="button-row">
            <button className="btn btn-ghost btn-small" type="button" onClick={handleExportCsv}>
              Export CSV
            </button>
          </div>
        }
      >
        <div className="toolbar">
          <label className="field inline">
            <span>Range</span>
            <select
              className="input"
              value={rangeKey}
              onChange={(event) => setRangeKey(event.target.value)}
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field inline">
            <span>Custom start</span>
            <input
              className="input"
              type="datetime-local"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
            />
          </label>

          <label className="field inline">
            <span>Custom end</span>
            <input
              className="input"
              type="datetime-local"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
            />
          </label>

          <div className="field inline">
            <span>&nbsp;</span>
            <button className="btn btn-primary" type="button" onClick={applyCustomRange}>
              Apply custom range
            </button>
          </div>
        </div>
      </Panel>

      <section className="metric-grid">
        <MetricCard
          label="Temperature Avg"
          value={tempStats.avg !== null ? formatTempC(tempStats.avg, 2) : '--'}
          subtext={
            tempStats.count ? `Min ${tempStats.min.toFixed(2)} C / Max ${tempStats.max.toFixed(2)} C` : 'No samples'
          }
          accent="cyan"
        />
        <MetricCard
          label="Humidity Avg"
          value={humidityStats.avg !== null ? `${humidityStats.avg.toFixed(2)}%` : '--'}
          subtext={
            humidityStats.count
              ? `Min ${humidityStats.min.toFixed(2)}% / Max ${humidityStats.max.toFixed(2)}%`
              : 'No samples'
          }
          accent="amber"
        />
        <MetricCard
          label="Ambient Lux Avg"
          value={luxStats.avg !== null ? `${luxStats.avg.toFixed(1)} lux` : '--'}
          subtext={
            luxStats.count
              ? `Min ${luxStats.min.toFixed(1)} / Max ${luxStats.max.toFixed(1)}`
              : 'No samples'
          }
          accent="green"
        />
        <MetricCard
          label="Dimmer Avg"
          value={dimmerStats.avg !== null ? `${dimmerStats.avg.toFixed(1)}%` : '--'}
          subtext={
            dimmerStats.count
              ? `Min ${dimmerStats.min.toFixed(1)}% / Max ${dimmerStats.max.toFixed(1)}%`
              : 'No samples'
          }
          accent="violet"
        />
      </section>

      <section className="split-grid">
        <Panel
          title="Environmental History"
          subtitle={loading.environmentalHistory ? 'Refreshing environmental history...' : 'Temperature, humidity, and pressure'}
        >
          <EnvironmentalChart data={filteredEnvironmental} height={340} />
        </Panel>

        <Panel
          title="Lighting History"
          subtitle={loading.lightingHistory ? 'Refreshing lighting history...' : 'Ambient level, lux, and dimmer'}
        >
          <LightingChart data={filteredLighting} height={340} />
        </Panel>
      </section>
    </div>
  );
}

