import type { AustralianState } from '../types';

export const AUSTRALIAN_STATES_CONSUMPTION: Record<AustralianState, number> = {
  TAS: 8619,
  NT: 8500,
  ACT: 6407,
  SA: 4950,
  NSW: 5662,
  QLD: 5650,
  WA: 5198,
  VIC: 4615,
};

export const stateOptions: { value: AustralianState; label: string }[] = [
  { value: 'NSW', label: '新南威尔士州 (NSW)' },
  { value: 'VIC', label: '维多利亚州 (VIC)' },
  { value: 'QLD', label: '昆士兰州 (QLD)' },
  { value: 'SA', label: '南澳大利亚州 (SA)' },
  { value: 'WA', label: '西澳大利亚州 (WA)' },
  { value: 'TAS', label: '塔斯马尼亚州 (TAS)' },
  { value: 'NT', label: '北领地 (NT)' },
  { value: 'ACT', label: '首都领地 (ACT)' },
];

const defaultConsumptionProfile = [8.55, 7.78, 7.51, 7.14, 8.47, 10.55, 10.67, 9.45, 7.36, 7.21, 7.30, 8.03];
const qldConsumptionProfile = [9.27, 9.22, 8.69, 8.14, 7.90, 8.23, 8.19, 7.93, 7.60, 7.67, 8.19, 8.96];

export const STATE_MONTHLY_CONSUMPTION_PERCENTAGES: Record<AustralianState, number[]> = {
  TAS: defaultConsumptionProfile,
  NT: defaultConsumptionProfile,
  ACT: defaultConsumptionProfile,
  SA: defaultConsumptionProfile,
  NSW: defaultConsumptionProfile,
  QLD: qldConsumptionProfile,
  WA: defaultConsumptionProfile,
  VIC: defaultConsumptionProfile,
};

const tasVicHourly = [3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 3.941, 3.941];
const ntQldWaHourly = [2.990, 2.638, 2.405, 2.319, 2.396, 2.745, 3.486, 4.163, 4.270, 4.255, 4.252, 4.348, 4.421, 4.440, 4.486, 4.667, 5.074, 5.727, 6.229, 5.996, 5.621, 4.970, 4.421, 3.679];
const actHourly = [3.400, 3.031, 2.876, 2.867, 3.055, 3.643, 4.493, 4.904, 4.317, 3.792, 3.615, 3.118, 3.053, 2.937, 3.003, 3.369, 4.434, 5.901, 6.693, 6.550, 6.142, 5.416, 5.178, 4.208];
const saHourly = [4.850, 5.185, 3.814, 2.956, 2.568, 2.654, 3.142, 3.655, 3.563, 3.624, 4.103, 4.366, 4.188, 3.980, 3.997, 4.111, 4.525, 5.442, 5.990, 5.715, 5.315, 4.739, 3.905, 3.607];
const nswHourly = [4.427, 3.912, 3.176, 2.706, 2.583, 2.805, 3.427, 3.939, 4.089, 4.050, 3.986, 3.936, 3.948, 3.908, 3.920, 4.105, 4.569, 5.328, 5.846, 5.634, 5.329, 4.947, 4.804, 4.630];

export const STATE_HOURLY_CONSUMPTION_PERCENTAGES: Record<AustralianState, number[]> = {
    TAS: tasVicHourly,
    NT: ntQldWaHourly,
    ACT: actHourly,
    SA: saHourly,
    NSW: nswHourly,
    QLD: ntQldWaHourly,
    WA: ntQldWaHourly,
    VIC: tasVicHourly,
};