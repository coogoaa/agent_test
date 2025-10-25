// Australian States Consumption Data
const AUSTRALIAN_STATES_CONSUMPTION = {
    TAS: 8619,
    NT: 8500,
    ACT: 6407,
    SA: 4950,
    NSW: 5662,
    QLD: 5650,
    WA: 5198,
    VIC: 4615
};

// Monthly Consumption Percentages by State
const defaultConsumptionProfile = [8.55, 7.78, 7.51, 7.14, 8.47, 10.55, 10.67, 9.45, 7.36, 7.21, 7.30, 8.03];
const qldConsumptionProfile = [9.27, 9.22, 8.69, 8.14, 7.90, 8.23, 8.19, 7.93, 7.60, 7.67, 8.19, 8.96];

const STATE_MONTHLY_CONSUMPTION_PERCENTAGES = {
    TAS: defaultConsumptionProfile,
    NT: defaultConsumptionProfile,
    ACT: defaultConsumptionProfile,
    SA: defaultConsumptionProfile,
    NSW: defaultConsumptionProfile,
    QLD: qldConsumptionProfile,
    WA: defaultConsumptionProfile,
    VIC: defaultConsumptionProfile
};

// Hourly Consumption Percentages by State
const tasVicHourly = [3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 3.941, 3.941];
const ntQldWaHourly = [2.990, 2.638, 2.405, 2.319, 2.396, 2.745, 3.486, 4.163, 4.270, 4.255, 4.252, 4.348, 4.421, 4.440, 4.486, 4.667, 5.074, 5.727, 6.229, 5.996, 5.621, 4.970, 4.421, 3.679];
const actHourly = [3.400, 3.031, 2.876, 2.867, 3.055, 3.643, 4.493, 4.904, 4.317, 3.792, 3.615, 3.118, 3.053, 2.937, 3.003, 3.369, 4.434, 5.901, 6.693, 6.550, 6.142, 5.416, 5.178, 4.208];
const saHourly = [4.850, 5.185, 3.814, 2.956, 2.568, 2.654, 3.142, 3.655, 3.563, 3.624, 4.103, 4.366, 4.188, 3.980, 3.997, 4.111, 4.525, 5.442, 5.990, 5.715, 5.315, 4.739, 3.905, 3.607];
const nswHourly = [4.427, 3.912, 3.176, 2.706, 2.583, 2.805, 3.427, 3.939, 4.089, 4.050, 3.986, 3.936, 3.948, 3.908, 3.920, 4.105, 4.569, 5.328, 5.846, 5.634, 5.329, 4.947, 4.804, 4.630];

const STATE_HOURLY_CONSUMPTION_PERCENTAGES = {
    TAS: tasVicHourly,
    NT: ntQldWaHourly,
    ACT: actHourly,
    SA: saHourly,
    NSW: nswHourly,
    QLD: ntQldWaHourly,
    WA: ntQldWaHourly,
    VIC: tasVicHourly
};

// Generation Factors
const HOURLY_GENERATION_FACTORS = [0, 0, 0, 0, 0, 0, 0.01, 0.05, 0.1, 0.12, 0.13, 0.14, 0.14, 0.12, 0.1, 0.05, 0.01, 0, 0, 0, 0, 0, 0, 0];
const MONTHLY_GENERATION_PERCENTAGES = [10, 9, 9, 8, 7, 6, 7, 8, 9, 9, 9, 9];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Month names for display
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
