export const SYSTEM_SIZES = [
  'Under 3kW',
  '3kW - 5kW',
  '5kW - 6.6kW',
  '6.6kW - 8kW',
  '8kW - 10kW',
  '10kW - 15kW',
  '15kW - 30kW',
  'Over 30kW',
];

export const RESPONSE_TIMES = [
  { value: '24h', label: 'Within 24 hours' },
  { value: '72h', label: 'Within 72 hours' },
  { value: '1week', label: 'Within 1 week' },
  { value: 'slow', label: 'More than 1 week' },
];

export const INSTALLERS = [
  'Origin Energy',
  'AGL Solar',
  'SolarHub',
  'EnergyAustralia',
  'Solargain',
  'Infinite Energy',
  'SunBoost',
  'Smart Energy',
  'Solar Hart',
  'Natural Solar',
  'Empower Solar',
  'Arise Solar'
];

// Mock data for brands
export const BRANDS = {
  inverter: ['Fronius', 'SMA', 'Sungrow', 'GoodWe', 'Enphase', 'SolarEdge', 'Huawei', 'Growatt', 'Other'],
  panel: ['Jinko', 'Longi', 'Trina', 'SunPower', 'REC', 'Canadian Solar', 'Qcells', 'Risen', 'Other'],
  battery: ['Tesla Powerwall', 'BYD', 'Sungrow', 'AlphaESS', 'LG Chem', 'Sonnen', 'GoodWe', 'Other'],
  evCharger: ['Tesla', 'Zappi', 'Wallbox', 'Fronius Wattpilot', 'SMA EV Charger', 'Other'],
  heatPump: ['Reclaim', 'Sanden', 'iStore', 'Quantum', 'Rheem', 'Other'],
};

export const RATING_LABELS: Record<number, string> = {
  1: 'Very Dissatisfied',
  2: 'Dissatisfied',
  3: 'Neutral',
  4: 'Satisfied',
  5: 'Very Satisfied',
};