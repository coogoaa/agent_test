/**
 * V6 版本配置加载器
 * 核心变化：光伏剩余估算从 6 月份数据改为全年日均数据
 * 电池容量计算参数：aSurplus=0.7, bSurplus=0.55
 */

// ================= V6 核心预设数据 =================

// 各州年发电系数 (kWh/kW/年)
const ANNUAL_YIELD_BY_STATE = {
    TAS: 1277,
    VIC: 1361,
    ACT: 1494,
    NSW: 1494,
    SA: 1536,
    QLD: 1584,
    WA: 1584,
    NT: 1622
};

// 各州全年用电量 (kWh/年)
const ANNUAL_CONSUMPTION_BY_STATE = {
    TAS: 10148,
    NT: 10008,
    ACT: 8632,
    SA: 7129,
    NSW: 7778,
    QLD: 7270,
    WA: 7634,
    VIC: 6778
};

// 各州各时段用电比例 (24小时)
const HOURLY_PROFILE_PCT = {
    TAS: [0.0238, 0.0221, 0.0205, 0.0193, 0.0189, 0.0205, 0.0267, 0.0357, 0.0402, 0.0398, 0.0390, 0.0398, 0.0414, 0.0422, 0.0426, 0.0430, 0.0471, 0.0586, 0.0614, 0.0586, 0.0520, 0.0455, 0.0373, 0.0295],
    NT: [0.0234, 0.0217, 0.0201, 0.0189, 0.0185, 0.0201, 0.0262, 0.0350, 0.0394, 0.0390, 0.0382, 0.0390, 0.0406, 0.0414, 0.0418, 0.0422, 0.0462, 0.0574, 0.0602, 0.0574, 0.0510, 0.0446, 0.0366, 0.0289],
    ACT: [0.0240, 0.0223, 0.0207, 0.0195, 0.0191, 0.0207, 0.0269, 0.0360, 0.0405, 0.0401, 0.0393, 0.0401, 0.0417, 0.0425, 0.0429, 0.0433, 0.0474, 0.0590, 0.0618, 0.0590, 0.0524, 0.0458, 0.0376, 0.0297],
    SA: [0.0246, 0.0229, 0.0212, 0.0200, 0.0196, 0.0212, 0.0276, 0.0369, 0.0415, 0.0411, 0.0403, 0.0411, 0.0427, 0.0435, 0.0439, 0.0443, 0.0485, 0.0604, 0.0633, 0.0604, 0.0537, 0.0469, 0.0385, 0.0304],
    NSW: [0.0248, 0.0230, 0.0214, 0.0201, 0.0197, 0.0214, 0.0278, 0.0372, 0.0418, 0.0414, 0.0406, 0.0414, 0.0430, 0.0438, 0.0442, 0.0446, 0.0489, 0.0609, 0.0638, 0.0609, 0.0541, 0.0473, 0.0388, 0.0307],
    QLD: [0.0249, 0.0231, 0.0215, 0.0202, 0.0198, 0.0215, 0.0279, 0.0374, 0.0420, 0.0416, 0.0408, 0.0416, 0.0432, 0.0440, 0.0444, 0.0448, 0.0491, 0.0611, 0.0641, 0.0611, 0.0543, 0.0475, 0.0390, 0.0308],
    VIC: [0.0252, 0.0234, 0.0217, 0.0205, 0.0201, 0.0217, 0.0283, 0.0379, 0.0426, 0.0422, 0.0414, 0.0422, 0.0438, 0.0446, 0.0450, 0.0454, 0.0498, 0.0619, 0.0649, 0.0619, 0.0550, 0.0481, 0.0395, 0.0312],
    WA: [0.0254, 0.0236, 0.0219, 0.0206, 0.0202, 0.0219, 0.0285, 0.0381, 0.0429, 0.0425, 0.0417, 0.0425, 0.0441, 0.0449, 0.0453, 0.0457, 0.0501, 0.0623, 0.0654, 0.0623, 0.0554, 0.0484, 0.0398, 0.0314]
};

// 光伏逐小时发电比例 (全年平均)
const PV_HOURLY_SHARE = [
    0, 0, 0, 0, 0, 0,           // 0-5点: 无发电
    0.02, 0.06, 0.10, 0.13,    // 6-9点: 上升
    0.14, 0.15, 0.15, 0.14,    // 10-13点: 高峰
    0.12, 0.08, 0.04, 0.01,    // 14-17点: 下降
    0, 0, 0, 0, 0, 0            // 18-23点: 无发电
];

// ================= V6 默认配置 =================

const DEFAULT_CONFIG = {
    // 版本标识
    version: 'V6',
    versionDesc: 'V6: 全年日均光伏剩余估算',
    
    // PV 组件参数
    pv: {
        model: 'JA Solar JAM54D40-440/LB',
        pmax: 440,
        annualYieldByState: ANNUAL_YIELD_BY_STATE
    },
    
    // 电池计算参数 - V6 核心逻辑
    battery: {
        // V6 电池容量计算参数
        v6: {
            aSurplus: 0.7,    // A方案: 0.7 × 光伏剩余 (从0.8调整)
            bSurplus: 0.55    // B方案: 0.55 × 光伏剩余 (从0.5调整)
        },
        // 电池效率参数
        dod: 0.9,             // Depth of Discharge (放电深度)
        rte: 0.95,            // Round Trip Efficiency (往返效率)
        // 标准电池规格
        standards: [5, 6.5, 9.6, 10, 13.5, 16, 20, 25, 30, 40, 50],
        useStandards: true,
        minCapacity: 5,
        maxCapacity: 50
    },
    
    // 逆变器规格配置
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
    
    // 储能扩容参数
    expansion: {
        roofCapacityFactor: 0.7,
        replaceInverter: true
    },
    
    // 方案目标容量配置
    proposals: {
        premium: { targetKw: 999 },
        balanced: { 
            targetKwSmall: 10.0,
            targetKwLarge: 13.0,
            roofThreshold: 15
        },
        economy: { targetKw: 6.6 }
    },
    
    // 各州用电量数据
    consumption: ANNUAL_CONSUMPTION_BY_STATE,
    
    // 成本参数
    cost: {
        scheme: 'D',
        schemeA: {
            pvPerKw: 540,
            inverterPerKw: 280,
            batteryPerKwh: 865
        },
        schemeB: {
            baseKw: 6.6,
            basePrice: 4500,
            adderPricePerKw: 500,
            batteryInstallFee: 1500,
            batteryPerKwh: 700
        },
        schemeC: {
            solarOnly: { exGstExStc: 750, incGstIncStc: 600 },
            hybridPv: { exGstExStc: 800, incGstIncStc: 650 },
            battery: { exGstExStc: 700, incGstIncStc: 450 }
        },
        schemeD: {
            solarOnly: { exGstExStc: 750, incGstIncStc: 600 },
            hybridPv: { exGstExStc: 650, incGstIncStc: 520 },
            batteryInstallFee: { exGstExStc: 1800, incGstIncStc: 1500 },
            batteryPerKwh: { exGstExStc: 550, incGstIncStc: 450 },
            standardBatteries: {}
        },
        gstRate: 0.1
    },
    
    // 补贴参数
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

// ================= V6 核心计算函数 =================

/**
 * V6 核心：计算能量维度（全年日均）
 * 与 V4 的区别：使用全年日均数据而非 6 月份数据
 */
function calculateV6EnergyDimensions(config, pvKw, state) {
    // 获取参数
    const annualConsumption = config.consumption[state] || config.consumption.NSW;
    const annualYield = config.pv.annualYieldByState[state] || config.pv.annualYieldByState.NSW;
    const hourlyProfile = HOURLY_PROFILE_PCT[state] || HOURLY_PROFILE_PCT.NSW;
    
    // V6 核心变化：使用全年日均数据
    const dailyConsumption = annualConsumption / 365;
    const dailyGeneration = (pvKw * annualYield) / 365;
    
    // 计算逐小时用电量
    const loadHour = hourlyProfile.map(r => dailyConsumption * r);
    
    // 计算逐小时发电量
    const pvHour = PV_HOURLY_SHARE.map(r => dailyGeneration * r);
    
    // 计算晚高峰用电 (17:00-20:00)
    const eveningHours = [17, 18, 19, 20];
    const eveningKwh = eveningHours.reduce((sum, h) => sum + (loadHour[h] || 0), 0);
    
    // 计算整夜用电 (17:00-次日6:00)
    const nightHours = [17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6];
    const nightKwh = nightHours.reduce((sum, h) => sum + (loadHour[h] || 0), 0);
    
    // 计算光伏剩余 (发电 - 用电，取正值累加)
    const surplusKwh = pvHour.reduce((sum, pv, h) => sum + Math.max(0, pv - (loadHour[h] || 0)), 0);
    
    return {
        dailyConsumption,
        dailyGeneration,
        eveningKwh,
        nightKwh,
        surplusKwh,
        loadHour,
        pvHour,
        method: 'V6-全年日均'
    };
}

/**
 * 选择标准电池规格
 */
function selectStandardBattery(config, capacity) {
    if (!config.battery.useStandards) {
        return Math.round(capacity * 10) / 10;
    }
    
    const standards = config.battery.standards || [5, 6.5, 9.6, 10, 13.5, 16, 20, 25, 30, 40, 50];
    const minCap = config.battery.minCapacity || 5;
    const maxCap = config.battery.maxCapacity || 50;
    
    if (capacity <= 0) return 0;
    if (capacity < minCap) return minCap;
    if (capacity > maxCap) return maxCap;
    
    // 找到第一个 >= capacity 的标准规格
    const selected = standards.find(s => s >= capacity);
    return selected || standards[standards.length - 1];
}

/**
 * V6 核心：计算电池容量
 * A方案: max(整夜用电, 0.7 × 光伏剩余)
 * B方案: max(晚高峰用电, 0.55 × 光伏剩余)
 * C方案: 晚高峰用电
 */
function calculateV6BatteryCapacity(config, pvKw, state, type) {
    const dims = calculateV6EnergyDimensions(config, pvKw, state);
    
    const RTE = config.battery.rte || 0.95;
    const DOD = config.battery.dod || 0.9;
    const efficiency = RTE * DOD;
    
    const aSurplus = config.battery.v6?.aSurplus || 0.7;
    const bSurplus = config.battery.v6?.bSurplus || 0.55;
    
    let targetEnergy = 0;
    let methodDesc = '';
    let calcDetail = {};
    
    if (type === 'premium') {
        // A方案: max(整夜用电, 0.7 × 光伏剩余)
        const m1 = dims.nightKwh;
        const m2 = aSurplus * dims.surplusKwh;
        targetEnergy = Math.max(m1, m2);
        methodDesc = `A: max(整夜${m1.toFixed(2)}, ${aSurplus}×剩余${(aSurplus * dims.surplusKwh).toFixed(2)})`;
        calcDetail = {
            method1: { name: '整夜用电', value: m1 },
            method2: { name: `${aSurplus}×光伏剩余`, value: m2 },
            winner: m1 >= m2 ? 'method1' : 'method2'
        };
    } else if (type === 'economy') {
        // C方案: 晚高峰用电
        targetEnergy = dims.eveningKwh;
        methodDesc = `C: 晚高峰${dims.eveningKwh.toFixed(2)}`;
        calcDetail = {
            method1: { name: '晚高峰用电', value: dims.eveningKwh },
            winner: 'method1'
        };
    } else {
        // B方案: max(晚高峰用电, 0.55 × 光伏剩余)
        const m1 = dims.eveningKwh;
        const m2 = bSurplus * dims.surplusKwh;
        targetEnergy = Math.max(m1, m2);
        methodDesc = `B: max(晚高峰${m1.toFixed(2)}, ${bSurplus}×剩余${(bSurplus * dims.surplusKwh).toFixed(2)})`;
        calcDetail = {
            method1: { name: '晚高峰用电', value: m1 },
            method2: { name: `${bSurplus}×光伏剩余`, value: m2 },
            winner: m1 >= m2 ? 'method1' : 'method2'
        };
    }
    
    // 计算电池容量 = 目标能量 / 效率
    const safeTarget = Number.isFinite(targetEnergy) ? targetEnergy : 0;
    let capacity = safeTarget > 0 ? safeTarget / efficiency : 0;
    
    // 应用最小/最大限制
    const minCap = config.battery.minCapacity || 5;
    const maxCap = config.battery.maxCapacity || 50;
    if (capacity > 0) {
        capacity = Math.max(minCap, Math.min(maxCap, capacity));
    }
    
    // 选择标准规格
    const standard = selectStandardBattery(config, capacity);
    
    return {
        nominal: standard,
        calculatedNominal: capacity,
        recommendedEnergy: safeTarget,
        methodDesc,
        calcDetail,
        dims,
        efficiency,
        params: { aSurplus, bSurplus, RTE, DOD }
    };
}

// ================= 配置加载函数 =================

/**
 * 从 localStorage 加载配置
 */
function loadConfig() {
    try {
        const stored = localStorage.getItem('solarConfigV6');
        if (stored) {
            const config = JSON.parse(stored);
            console.log('✅ V6 已加载保存的配置');
            return config;
        }
    } catch (error) {
        console.error('❌ 加载配置失败:', error);
    }
    
    console.log('ℹ️ V6 使用默认配置');
    return DEFAULT_CONFIG;
}

/**
 * 保存配置到 localStorage
 */
function saveConfig(config) {
    try {
        localStorage.setItem('solarConfigV6', JSON.stringify(config));
        console.log('✅ V6 配置已保存');
        return true;
    } catch (error) {
        console.error('❌ 保存配置失败:', error);
        return false;
    }
}

/**
 * 获取配置的特定部分
 */
function getConfig(section) {
    const config = loadConfig();
    return section ? config[section] : config;
}

/**
 * 重置为默认配置
 */
function resetConfig() {
    localStorage.removeItem('solarConfigV6');
    console.log('✅ V6 配置已重置为默认值');
    return DEFAULT_CONFIG;
}

// ================= 辅助函数 =================

/**
 * 计算屋顶评分
 */
function calculateRoofScore(aspect) {
    const north = 0;
    let diff = Math.abs(aspect - north);
    if (diff > 180) diff = 360 - diff;
    const score = Math.max(0, 100 - (diff / 180) * 100);
    return score;
}

/**
 * 格式化 kW 值
 */
function formatKwValue(value) {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

/**
 * 获取相位标签
 */
function getPhaseLabel(phaseType) {
    return phaseType === 'single' ? '单相' : '三相';
}

/**
 * 获取相位最大功率限制
 */
function getPhaseMaxLimit(config, phaseType) {
    if (phaseType === 'single') {
        return config.inverter.singleMaxKw ?? 10;
    }
    return config.inverter.threeMaxKw ?? 30;
}

/**
 * 计算补贴
 */
function calculateSubsidy(config, pvKw, batteryNominalKwh, state) {
    const subsidyConfig = config.subsidy;
    const deemingPeriod = subsidyConfig.deemingEndYear - subsidyConfig.installYear + 1;
    const zoneRating = subsidyConfig.zoneRating[state] || subsidyConfig.zoneRating.NSW;
    
    // PV STC
    const pvStc = Math.floor(pvKw * zoneRating * deemingPeriod);
    
    // Battery STC - 使用可用容量 (标称容量 × DoD)
    const usableCapacity = batteryNominalKwh * (config.battery.dod || 0.9);
    const cappedUsableCapacity = Math.min(usableCapacity, subsidyConfig.batteryCapacityCap);
    const batteryStc = Math.floor(cappedUsableCapacity * subsidyConfig.batteryStcFactor);
    
    // 总补贴
    const totalStc = pvStc + batteryStc;
    const subsidyAmount = totalStc * subsidyConfig.stcPrice;
    
    return {
        deemingPeriod,
        zoneRating,
        pvStc,
        batteryStc,
        totalStc,
        subsidyAmount,
        usableCapacity
    };
}

/**
 * 成本计算函数
 */
function calculateCostByScheme(config, pvKw, inverterKw, batteryKwh, schemeType, state = null) {
    const COST_CONFIG = config.cost;
    const gstRate = COST_CONFIG.gstRate;
    let pvCost, inverterCost, batteryCost, systemCost;
    
    if (schemeType === 'D') {
        const params = COST_CONFIG.schemeD;
        const isHybrid = batteryKwh > 0;
        const pvParams = isHybrid ? params.hybridPv : params.solarOnly;
        
        const pvCostExGstExStc = pvKw * pvParams.exGstExStc;
        let batteryCostExGstExStc = 0;
        let batteryInstallFeeEx = 0;
        let batteryCapacityCostEx = 0;
        
        if (isHybrid) {
            batteryInstallFeeEx = params.batteryInstallFee.exGstExStc;
            batteryCapacityCostEx = batteryKwh * params.batteryPerKwh.exGstExStc;
            batteryCostExGstExStc = batteryInstallFeeEx + batteryCapacityCostEx;
        }
        const totalExGstExStc = pvCostExGstExStc + batteryCostExGstExStc;
        
        const pvCostIncGstIncStc = pvKw * pvParams.incGstIncStc;
        let batteryCostIncGstIncStc = 0;
        let batteryInstallFeeInc = 0;
        let batteryCapacityCostInc = 0;
        
        if (isHybrid) {
            batteryInstallFeeInc = params.batteryInstallFee.incGstIncStc;
            batteryCapacityCostInc = batteryKwh * params.batteryPerKwh.incGstIncStc;
            batteryCostIncGstIncStc = batteryInstallFeeInc + batteryCapacityCostInc;
        }
        const totalIncGstIncStc = pvCostIncGstIncStc + batteryCostIncGstIncStc;
        
        return {
            pvCost: pvCostExGstExStc,
            inverterCost: 0,
            batteryCost: batteryCostExGstExStc,
            systemCost: pvCostExGstExStc,
            preTaxTotal: totalExGstExStc,
            taxTotal: totalExGstExStc * (1 + gstRate),
            scheme: schemeType,
            schemeD: {
                isHybrid,
                exGstExStc: { pv: pvCostExGstExStc, batteryInstall: batteryInstallFeeEx, batteryCapacity: batteryCapacityCostEx, battery: batteryCostExGstExStc, total: totalExGstExStc },
                incGstIncStc: { pv: pvCostIncGstIncStc, batteryInstall: batteryInstallFeeInc, batteryCapacity: batteryCapacityCostInc, battery: batteryCostIncGstIncStc, total: totalIncGstIncStc }
            }
        };
    } else if (schemeType === 'C') {
        const params = COST_CONFIG.schemeC;
        const isHybrid = batteryKwh > 0;
        const pvParams = isHybrid ? params.hybridPv : params.solarOnly;
        
        const pvCostExGstExStc = pvKw * pvParams.exGstExStc;
        const batteryCostExGstExStc = batteryKwh * params.battery.exGstExStc;
        const totalExGstExStc = pvCostExGstExStc + batteryCostExGstExStc;
        
        const pvCostIncGstIncStc = pvKw * pvParams.incGstIncStc;
        const batteryCostIncGstIncStc = batteryKwh * params.battery.incGstIncStc;
        const totalIncGstIncStc = pvCostIncGstIncStc + batteryCostIncGstIncStc;
        
        return {
            pvCost: pvCostExGstExStc,
            inverterCost: 0,
            batteryCost: batteryCostExGstExStc,
            systemCost: pvCostExGstExStc,
            preTaxTotal: totalExGstExStc,
            taxTotal: totalExGstExStc * (1 + gstRate),
            scheme: schemeType,
            schemeC: {
                isHybrid,
                exGstExStc: { pv: pvCostExGstExStc, battery: batteryCostExGstExStc, total: totalExGstExStc },
                incGstIncStc: { pv: pvCostIncGstIncStc, battery: batteryCostIncGstIncStc, total: totalIncGstIncStc }
            }
        };
    } else if (schemeType === 'B') {
        const params = COST_CONFIG.schemeB;
        const baseKw = params.baseKw || 6.6;
        const basePrice = params.basePrice || 4500;
        const adderPrice = params.adderPricePerKw || 500;
        const batteryInstallFee = params.batteryInstallFee || 1500;
        const batteryUnitCost = params.batteryPerKwh || 700;
        
        if (pvKw <= baseKw) {
            systemCost = (pvKw / baseKw) * basePrice;
        } else {
            const extraKw = pvKw - baseKw;
            systemCost = basePrice + (extraKw * adderPrice);
        }
        
        if (batteryKwh > 0) {
            batteryCost = batteryInstallFee + (batteryKwh * batteryUnitCost);
        } else {
            batteryCost = 0;
        }
        
        pvCost = systemCost * 0.7;
        inverterCost = systemCost * 0.3;
    } else {
        // 方案A: 线性定价
        const params = COST_CONFIG.schemeA;
        pvCost = pvKw * params.pvPerKw;
        inverterCost = inverterKw * params.inverterPerKw;
        batteryCost = batteryKwh * params.batteryPerKwh;
        systemCost = pvCost + inverterCost;
    }
    
    const preTaxTotal = systemCost + batteryCost;
    const taxTotal = preTaxTotal * (1 + gstRate);
    
    // 计算补贴后的价格
    const subsidy = calculateSubsidy(config, pvKw, batteryKwh, state);
    const exGstExStc = preTaxTotal;
    const incGstIncStc = (preTaxTotal - subsidy.subsidyAmount) * (1 + gstRate);
    
    return {
        pvCost,
        inverterCost,
        batteryCost,
        systemCost,
        preTaxTotal,
        taxTotal,
        exGstExStc,
        incGstIncStc,
        scheme: schemeType
    };
}

/**
 * 同时计算四套方案的成本
 */
function calculateCostAllSchemes(config, pvKw, inverterKw, batteryKwh, state = null) {
    return {
        schemeA: calculateCostByScheme(config, pvKw, inverterKw, batteryKwh, 'A', state),
        schemeB: calculateCostByScheme(config, pvKw, inverterKw, batteryKwh, 'B', state),
        schemeC: calculateCostByScheme(config, pvKw, inverterKw, batteryKwh, 'C', state),
        schemeD: calculateCostByScheme(config, pvKw, inverterKw, batteryKwh, 'D', state)
    };
}

// ================= 导出 =================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEFAULT_CONFIG,
        ANNUAL_YIELD_BY_STATE,
        ANNUAL_CONSUMPTION_BY_STATE,
        HOURLY_PROFILE_PCT,
        PV_HOURLY_SHARE,
        loadConfig,
        saveConfig,
        getConfig,
        resetConfig,
        calculateV6EnergyDimensions,
        calculateV6BatteryCapacity,
        selectStandardBattery,
        calculateRoofScore,
        formatKwValue,
        getPhaseLabel,
        getPhaseMaxLimit,
        calculateSubsidy,
        calculateCostByScheme,
        calculateCostAllSchemes
    };
}
