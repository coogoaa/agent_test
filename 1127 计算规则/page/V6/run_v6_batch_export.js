const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq === -1) {
      args[a.slice(2)] = true;
      continue;
    }
    const k = a.slice(2, eq);
    const v = a.slice(eq + 1);
    args[k] = v;
  }
  return args;
}

function safeNumber(v, fallback = 0) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function calculateRoofScore(aspect) {
  const north = 0;
  let diff = Math.abs(aspect - north);
  if (diff > 180) diff = 360 - diff;
  return Math.max(0, 100 - (diff / 180) * 100);
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const houses = {};
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 4) continue;

    const houseId = (parts[0] || '').trim();
    if (!houseId) continue;

    const slopeId = (parts[1] || '').trim();
    const aspect = safeNumber(parts[2], NaN);
    const nums = parseInt((parts[3] || '').trim(), 10);
    if (!Number.isFinite(aspect) || !Number.isFinite(nums)) continue;

    if (!houses[houseId]) houses[houseId] = [];
    houses[houseId].push({
      id: slopeId,
      aspect,
      max: nums,
      score: calculateRoofScore(aspect)
    });
  }
  return houses;
}

// ================= V6: 简化版 - 使用全年日均 =================

// 小时发电占比（24小时加总为 100%）
const PV_HOURLY_SHARE = [
  0, 0, 0, 0, 0, 0,
  0.02, 0.04, 0.07, 0.10, 0.13, 0.14, 0.14, 0.13, 0.10, 0.07, 0.04, 0.02,
  0, 0, 0, 0, 0, 0
];

// 默认配置
const DEFAULT_CONFIG = {
  pv: {
    model: 'JA Solar JAM72S30 550/MR',
    pmax: 440,
    annualYieldByState: {
      TAS: 1278,
      VIC: 1314,
      NSW: 1460,
      SA: 1533,
      QLD: 1533,
      ACT: 1570,
      NT: 1606,
      WA: 1606
    }
  },
  battery: {
    v6: {
      aSurplus: 0.7,   // A 方案光伏剩余系数（调整：0.8 → 0.7）
      bSurplus: 0.55   // B 方案光伏剩余系数
    },
    standards: [5, 6.5, 9.6, 10, 13.5, 16, 20, 25, 30, 40, 50],
    useStandards: true,
    minCapacity: 5,
    maxCapacity: 50,
    dod: 0.9,
    rte: 0.95
  },
  inverter: {
    single: {
      a: [5, 6, 8, 10],
      b: [5, 8],
      c: [5, 8]
    },
    three: {
      a: [5, 8, 10, 15, 20, 30],
      b: [5, 8, 10, 15],
      c: [5, 8, 10]
    },
    enableSingleOptions: false,
    enableThreeOptions: false,
    singleMaxKw: 10,
    threeMaxKw: 30,
    targetRatio: 180,
    maxRatio: 200
  },
  expansion: {
    roofCapacityFactor: 0.7,
    replaceInverter: true
  },
  proposals: {
    premium: { targetKw: 999 },
    balanced: { 
      targetKwSmall: 10.0,
      targetKwLarge: 13.0,
      roofThreshold: 15
    },
    economy: { targetKw: 6.6 }
  },
  consumption: {
    TAS: 10148,
    NT: 10008,
    ACT: 8632,
    SA: 7129,
    NSW: 7778,
    QLD: 7270,
    WA: 7634,
    VIC: 6778
  },
  cost: {
    schemeA: {
      pvPerKw: 540,
      inverterPerKw: 280,
      batteryPerKwh: 865
    },
    gstRate: 0.1
  },
  subsidy: {
    stcPrice: 39,
    installYear: 2025,
    deemingEndYear: 2030,
    batteryStcFactor: 9.3,
    batteryCapacityCap: 50,
    zoneRating: {
      TAS: 1.382,
      NT: 1.622,
      ACT: 1.382,
      SA: 1.536,
      NSW: 1.382,
      QLD: 1.536,
      VIC: 1.382,
      WA: 1.536
    }
  }
};

// 各州各时段用电比例（百分比形式，需除以100）
const HOURLY_PROFILE_PCT = {
  TAS: [3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 3.941, 3.941],
  NT: [2.990, 2.638, 2.405, 2.319, 2.396, 2.745, 3.486, 4.163, 4.270, 4.255, 4.252, 4.348, 4.421, 4.440, 4.486, 4.667, 5.074, 5.727, 6.229, 5.996, 5.621, 4.970, 4.421, 3.679],
  ACT: [3.400, 3.031, 2.876, 2.867, 3.055, 3.643, 4.493, 4.904, 4.317, 3.792, 3.615, 3.118, 3.053, 2.937, 3.003, 3.369, 4.434, 5.901, 6.693, 6.550, 6.142, 5.416, 5.178, 4.208],
  SA: [4.850, 5.185, 3.814, 2.956, 2.568, 2.654, 3.142, 3.655, 3.563, 3.624, 4.103, 4.366, 4.188, 3.980, 3.997, 4.111, 4.525, 5.442, 5.990, 5.715, 5.315, 4.739, 3.905, 3.607],
  NSW: [4.427, 3.912, 3.176, 2.706, 2.583, 2.805, 3.427, 3.939, 4.089, 4.050, 3.986, 3.936, 3.948, 3.908, 3.920, 4.105, 4.569, 5.328, 5.846, 5.634, 5.329, 4.947, 4.804, 4.630],
  QLD: [2.990, 2.638, 2.405, 2.319, 2.396, 2.745, 3.486, 4.163, 4.270, 4.255, 4.252, 4.348, 4.421, 4.440, 4.486, 4.667, 5.074, 5.727, 6.229, 5.996, 5.621, 4.970, 4.421, 3.679],
  VIC: [3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 3.941, 3.941],
  WA: [2.990, 2.638, 2.405, 2.319, 2.396, 2.745, 3.486, 4.163, 4.270, 4.255, 4.252, 4.348, 4.421, 4.440, 4.486, 4.667, 5.074, 5.727, 6.229, 5.996, 5.621, 4.970, 4.421, 3.679]
};

function getAnnualYieldByState(config, state) {
  const map = config.pv && config.pv.annualYieldByState;
  if (map && typeof map[state] === 'number') return map[state];
  return 1460;
}

// V6: 使用全年日均计算能量维度
function calculateV6EnergyDimensions(config, pvKw, state) {
  const annualConsumption = (config.consumption && config.consumption[state]) || 7778;
  
  // 全年日均用电
  const loadDay = annualConsumption / 365;
  
  // 逐小时用电比例
  const hourlyProfilePct = HOURLY_PROFILE_PCT[state] || HOURLY_PROFILE_PCT.NSW;
  const hourlyProfile = hourlyProfilePct.map(pct => pct / 100);
  const loadHour = hourlyProfile.map(r => loadDay * r);
  
  // 全年日均发电
  const annualYield = getAnnualYieldByState(config, state);
  const pvAnnual = pvKw * annualYield;
  const pvDay = pvAnnual / 365;
  const pvHour = PV_HOURLY_SHARE.map(r => pvDay * r);
  
  // 计算晚高峰、整夜、光伏剩余
  const eveningHours = [17, 18, 19, 20];
  const nightHours = [17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6];
  const eveningKwh = eveningHours.reduce((sum, h) => sum + (loadHour[h] || 0), 0);
  const nightKwh = nightHours.reduce((sum, h) => sum + (loadHour[h] || 0), 0);
  const surplusKwh = pvHour.reduce((sum, pv, h) => sum + Math.max(0, pv - (loadHour[h] || 0)), 0);
  
  return { pvDay, loadDay, eveningKwh, nightKwh, surplusKwh };
}

function selectStandardBattery(config, capacity) {
  if (!(capacity > 0)) return 0;
  const maxCap = safeNumber(config.battery && config.battery.maxCapacity, 50);
  if (config.battery && config.battery.useStandards) {
    const standards = (config.battery && config.battery.standards) || [5, 6.5, 9.6, 10, 13.5, 16, 20, 25, 30, 40, 50];
    return standards.find(s => s >= capacity) || maxCap;
  }
  return capacity;
}

function calculateBatteryCapacity(config, pvKw, state, type) {
  const dims = calculateV6EnergyDimensions(config, pvKw, state);
  const RTE = safeNumber(config.battery && config.battery.rte, 0.95);
  const DOD = safeNumber(config.battery && config.battery.dod, 0.9);
  const efficiency = RTE * DOD;
  
  const maxCap = safeNumber(config.battery && config.battery.maxCapacity, 50);
  const minCap = safeNumber(config.battery && config.battery.minCapacity, 5);
  
  const aSurplus = (config.battery && config.battery.v6 && typeof config.battery.v6.aSurplus === 'number') ? config.battery.v6.aSurplus : 0.8;
  const bSurplus = (config.battery && config.battery.v6 && typeof config.battery.v6.bSurplus === 'number') ? config.battery.v6.bSurplus : 0.55;
  
  let targetEnergy = 0;
  let methodDesc = '';
  
  if (type === 'premium') {
    const m1 = dims.nightKwh;
    const m2 = aSurplus * dims.surplusKwh;
    targetEnergy = Math.max(m1, m2);
    methodDesc = `A: max(整夜, ${aSurplus}×剩余)`;
  } else if (type === 'economy') {
    targetEnergy = dims.eveningKwh;
    methodDesc = 'C: 晚高峰';
  } else {
    const m1 = dims.eveningKwh;
    const m2 = bSurplus * dims.surplusKwh;
    targetEnergy = Math.max(m1, m2);
    methodDesc = `B: max(晚高峰, ${bSurplus}×剩余)`;
  }
  
  const safeTarget = Number.isFinite(targetEnergy) ? targetEnergy : 0;
  let capacity = safeTarget > 0 ? safeTarget / efficiency : 0;
  
  if (capacity > 0) {
    capacity = Math.max(minCap, Math.min(maxCap, capacity));
  }
  
  const standard = selectStandardBattery(config, capacity);
  return {
    nominal: standard,
    calculatedNominal: capacity,
    recommendedEnergy: safeTarget,
    methodDesc,
    dims
  };
}

function calculateCostSchemeA(config, pvKw, inverterKw, batteryNominalKwh) {
  const schemeA = (config.cost && config.cost.schemeA) || {};
  const gstRate = safeNumber(config.cost && config.cost.gstRate, 0.1);
  const pvPerKw = safeNumber(schemeA.pvPerKw, 540);
  const inverterPerKw = safeNumber(schemeA.inverterPerKw, 280);
  const batteryPerKwh = safeNumber(schemeA.batteryPerKwh, 865);
  
  const pvCost = pvKw * pvPerKw;
  const inverterCost = inverterKw * inverterPerKw;
  const batteryCost = batteryNominalKwh * batteryPerKwh;
  const preTaxTotal = pvCost + inverterCost + batteryCost;
  const taxTotal = preTaxTotal * (1 + gstRate);
  
  return { pvCost, inverterCost, batteryCost, preTaxTotal, taxTotal };
}

function calculateSubsidy(config, pvKw, batteryNominalKwh, state) {
  const sub = config.subsidy || {};
  const deemingPeriod = safeNumber(sub.deemingEndYear, 2030) - safeNumber(sub.installYear, 2025) + 1;
  const zoneRating = (sub.zoneRating && typeof sub.zoneRating[state] === 'number') ? sub.zoneRating[state] : 1.382;
  
  const pvStc = Math.floor(pvKw * zoneRating * deemingPeriod);
  
  const dod = safeNumber(config.battery && config.battery.dod, 0.9);
  const usableCapacity = batteryNominalKwh * dod;
  const cap = safeNumber(sub.batteryCapacityCap, 50);
  const cappedUsable = Math.min(usableCapacity, cap);
  const batteryStcFactor = safeNumber(sub.batteryStcFactor, 9.3);
  const batteryStc = Math.floor(cappedUsable * batteryStcFactor);
  
  const totalStc = pvStc + batteryStc;
  const stcPrice = safeNumber(sub.stcPrice, 39);
  const subsidyAmount = totalStc * stcPrice;
  
  return { pvStc, batteryStc, totalStc, subsidyAmount, usableCapacity };
}

function getPhaseMaxLimit(config, phaseType) {
  const inv = config.inverter || {};
  return phaseType === 'single' ? safeNumber(inv.singleMaxKw, 10) : safeNumber(inv.threeMaxKw, 30);
}

function getPhaseLabel(phaseType) {
  return phaseType === 'single' ? '单相' : '三相';
}

function getInverterOptions(config, planKey, phaseType) {
  const inv = config.inverter || {};
  const useOptions = phaseType === 'single' ? !!inv.enableSingleOptions : !!inv.enableThreeOptions;
  const baseOptions = phaseType === 'single' ? ((inv.single && inv.single[planKey]) || []) : ((inv.three && inv.three[planKey]) || []);
  const phaseMax = getPhaseMaxLimit(config, phaseType);
  const filtered = baseOptions.filter(size => size <= phaseMax);
  
  let options = useOptions ? filtered : [phaseMax];
  let injectedLimit = false;
  if (options.length === 0) {
    if (baseOptions.length > 0) {
      options = [Math.min(phaseMax, baseOptions[baseOptions.length - 1])];
    } else {
      options = [phaseMax];
    }
    injectedLimit = true;
  }
  
  return {
    options,
    baseOptions,
    phaseMax,
    limitInjected: injectedLimit,
    limitedByConfig: useOptions && baseOptions.some(size => size > phaseMax),
    enforceList: useOptions
  };
}

function selectInverterForPlan(config, planKey, phaseType, requiredKw, rawKw = requiredKw) {
  const optionsInfo = getInverterOptions(config, planKey, phaseType);
  const options = optionsInfo.options;
  const availableMax = optionsInfo.enforceList && options.length ? options[options.length - 1] : optionsInfo.phaseMax;
  
  let selected;
  if (optionsInfo.enforceList && options.length) {
    selected = options.find(s => s >= requiredKw) || availableMax;
  } else {
    selected = Math.min(Math.max(Math.ceil(requiredKw), 1), optionsInfo.phaseMax);
  }
  
  const meta = {
    rawKw,
    requiredKw,
    finalKw: selected,
    phaseMax: optionsInfo.phaseMax,
    phaseLabel: getPhaseLabel(phaseType),
    availableMax,
    limitedByPhase: rawKw > optionsInfo.phaseMax,
    limitedByConfig: rawKw <= optionsInfo.phaseMax && rawKw > availableMax,
    adjustmentReason: null
  };
  
  return { kw: selected, meta, optionsInfo };
}

function applyInverterRules(config, result, planKey, phaseType) {
  const inv = config.inverter || {};
  const targetRatio = safeNumber(inv.targetRatio, 180) / 100;
  const maxRatio = safeNumber(inv.maxRatio, 200) / 100;
  
  const rawRequirement = result.totalKw / targetRatio;
  let { kw, meta, optionsInfo } = selectInverterForPlan(config, planKey, phaseType, Math.ceil(rawRequirement), rawRequirement);
  let ratio = (result.totalKw / kw) * 100;
  
  if (ratio > safeNumber(inv.maxRatio, 200)) {
    const minInvForCompliance = Math.ceil(result.totalKw / maxRatio);
    const upgradedSelection = selectInverterForPlan(config, planKey, phaseType, minInvForCompliance, meta.rawKw);
    
    if (upgradedSelection.kw > kw) {
      kw = upgradedSelection.kw;
      meta = upgradedSelection.meta;
      optionsInfo = upgradedSelection.optionsInfo;
      meta.adjustmentReason = 'inverterUpgrade';
      ratio = (result.totalKw / kw) * 100;
    } else {
      const maxInv = optionsInfo.options[optionsInfo.options.length - 1];
      const maxAllowedKw = maxInv * maxRatio;
      if (result.totalKw > maxAllowedKw) {
        result.totalKw = maxAllowedKw;
        result.count = Math.floor((maxAllowedKw * 1000) / config.pv.pmax);
      }
      kw = maxInv;
      meta.adjustmentReason = 'panelReduction';
      ratio = (result.totalKw / kw) * 100;
    }
  }
  
  meta.finalKw = kw;
  return { kw, meta, ratio: Math.round(ratio) };
}

function fillRoof(pvWatt, sortedPlanes, targetKw) {
  const neededPanels = Math.ceil((targetKw * 1000) / pvWatt);
  let currentPanels = 0;
  const usedPlanes = [];
  
  for (const p of sortedPlanes) {
    if (p.max === 0) continue;
    const remainingNeed = neededPanels - currentPanels;
    if (remainingNeed <= 0) break;
    const take = Math.min(p.max, remainingNeed);
    currentPanels += take;
    usedPlanes.push({ id: p.id, count: take, score: p.score });
  }
  
  return {
    count: currentPanels,
    totalKw: (currentPanels * pvWatt) / 1000,
    usedPlanes
  };
}

function generateProposals(config, houseId, roofData, state, phaseType, calcMode) {
  const pvWatt = config.pv.pmax;
  const roofPlanes = roofData.map(p => ({ ...p })).sort((a, b) => b.score - a.score);
  
  if (calcMode === 'expansion') {
    const roofCapacityFactor = safeNumber(config.expansion && config.expansion.roofCapacityFactor, 0.7);
    roofPlanes.forEach(p => { p.max = Math.floor(p.max * roofCapacityFactor); });
  }
  
  const totalMaxPanels = roofPlanes.reduce((sum, p) => sum + p.max, 0);
  const totalMaxKw = roofPlanes.reduce((sum, p) => sum + (p.max * pvWatt) / 1000, 0);
  
  if (totalMaxPanels === 0) {
    return null;
  }
  
  const resultA = fillRoof(pvWatt, roofPlanes, 999);
  const invA = applyInverterRules(config, resultA, 'a', phaseType);
  const batA = calculateBatteryCapacity(config, resultA.totalKw, state, 'premium');
  
  const targetKwB = totalMaxKw > 15 ? 13.0 : 10.0;
  const resultB = fillRoof(pvWatt, roofPlanes, targetKwB);
  const invB = applyInverterRules(config, resultB, 'b', phaseType);
  const batB = calculateBatteryCapacity(config, resultB.totalKw, state, 'balanced');
  
  const resultC = fillRoof(pvWatt, roofPlanes, 6.6);
  const invC = applyInverterRules(config, resultC, 'c', phaseType);
  const batC = calculateBatteryCapacity(config, resultC.totalKw, state, 'economy');
  
  return {
    houseId,
    state,
    phaseType,
    calcMode,
    totalMaxKw,
    planA: { label: 'A', name: '高端型', pv: resultA, inverter: invA, battery: batA },
    planB: { label: 'B', name: '平衡型', pv: resultB, inverter: invB, battery: batB },
    planC: { label: 'C', name: '经济型', pv: resultC, inverter: invC, battery: batC }
  };
}

function toTsvLine(fields) {
  return fields.map(v => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  }).join('\t');
}

function main() {
  const args = parseArgs(process.argv);
  
  const defaultCsv = path.resolve(__dirname, '../../验证数据/agent_sample_data - 坡面信息.csv');
  const csvPath = args.csv ? path.resolve(process.cwd(), args.csv) : defaultCsv;
  
  const states = (args.states || args.state || 'NSW').split(',').map(s => s.trim()).filter(Boolean);
  const phases = (args.phases || args.phase || 'single').split(',').map(s => s.trim()).filter(Boolean);
  
  const config = DEFAULT_CONFIG;
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV不存在: ${csvPath}`);
    process.exit(1);
  }
  
  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const houses = parseCSV(csvText);
  const houseIds = Object.keys(houses);
  
  const outDir = path.resolve(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  
  const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '');
  const outPath = path.join(outDir, `v6_full_${ts}.tsv`);
  
  const header = [
    'house_id',
    'calc_mode',
    'state',
    'phase',
    'plan',
    'plan_name',
    'roof_max_kw',
    'pv_model',
    'pv_watt',
    'pv_kw',
    'panel_count',
    'inverter_kw',
    'ratio_percent',
    'battery_nominal_kwh',
    'battery_calculated_nominal_kwh',
    'battery_method',
    'pv_day_kwh',
    'load_day_kwh',
    'evening_kwh',
    'night_kwh',
    'surplus_kwh',
    'tax_total_aud',
    'subsidy_aud',
    'final_price_aud'
  ];
  
  const lines = [toTsvLine(header)];
  
  for (const state of states) {
    for (const phaseType of phases) {
      for (const houseId of houseIds) {
        const roofData = houses[houseId];
        
        for (const calcMode of ['new', 'expansion']) {
          const proposal = generateProposals(config, houseId, roofData, state, phaseType, calcMode);
          if (!proposal) continue;
          
          for (const key of ['planA', 'planB', 'planC']) {
            const plan = proposal[key];
            const pvKw = safeNumber(plan.pv.totalKw, 0);
            const panels = safeNumber(plan.pv.count, 0);
            const inverterKw = safeNumber(plan.inverter.kw, 0);
            const ratio = safeNumber(plan.inverter.ratio, 0);
            const batteryNominal = safeNumber(plan.battery.nominal, 0);
            const batteryCalculatedNominal = safeNumber(plan.battery.calculatedNominal, 0);
            
            const dims = plan.battery.dims;
            
            const costA = calculateCostSchemeA(config, pvKw, inverterKw, batteryNominal);
            const subsidy = calculateSubsidy(config, pvKw, batteryNominal, state);
            const finalPrice = costA.taxTotal - subsidy.subsidyAmount;
            
            lines.push(toTsvLine([
              houseId,
              calcMode,
              state,
              phaseType,
              plan.label,
              plan.name,
              proposal.totalMaxKw.toFixed(2),
              config.pv.model,
              config.pv.pmax,
              pvKw.toFixed(2),
              panels,
              inverterKw,
              ratio,
              batteryNominal,
              batteryCalculatedNominal ? batteryCalculatedNominal.toFixed(2) : '0.00',
              plan.battery.methodDesc,
              dims.pvDay.toFixed(2),
              dims.loadDay.toFixed(2),
              dims.eveningKwh.toFixed(2),
              dims.nightKwh.toFixed(2),
              dims.surplusKwh.toFixed(2),
              Math.round(costA.taxTotal),
              Math.round(subsidy.subsidyAmount),
              Math.round(finalPrice)
            ]));
          }
        }
      }
    }
  }
  
  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log(`✅ 已输出: ${outPath}`);
  console.log(`📊 房屋数: ${houseIds.length}, states: ${states.join(',')}, phases: ${phases.join(',')}`);
  console.log(`📝 总行数: ${lines.length - 1} (不含表头)`);
}

main();
