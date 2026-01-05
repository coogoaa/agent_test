/**
 * V6 新建系统页面逻辑 - 详细推导过程版本
 * 使用方案 A 线性定价
 */

// 房屋数据
const HOUSE_DATA_RAW = `
id_0	slope	aspect	nums
1	slope 1	359.8	1
1	slope 2	269.8	0
1	slope 3	179.8	1
1	slope 4	89.8	0
3	slope 1	299.3	1
3	slope 4	209.3	12
3	slope 6	29.3	2
3	slope 10	29.3	3
4	slope 1	285.9	3
4	slope 2	195.9	2
4	slope 9	105.9	1
4	slope 10	15.9	3
5	slope 1	276.6	15
5	slope 4	186.6	2
5	slope 7	96.6	6
5	slope 8	6.6	3
27	slope 4	269.9	17
27	slope 5	180.0	3
27	slope 6	90.0	4
27	slope 7	180.0	15
27	slope 12	90.0	4
27	slope 13	0	20
44	slope 2	274.6	22
44	slope 3	184.6	3
44	slope 4	94.6	18
44	slope 5	184.6	1
44	slope 7	4.6	2
`;

// 全局数据
const AppData = { houses: {}, currentState: 'TAS', config: null };

// 加载配置
const CONFIG = loadConfig();
AppData.config = CONFIG;
console.log('📋 V6 配置已加载:', CONFIG);

const PV_WATT = CONFIG.pv.pmax;
const INVERTER_CONFIG = CONFIG.inverter;
const TARGET_RATIO = INVERTER_CONFIG.targetRatio / 100;
const MAX_RATIO = INVERTER_CONFIG.maxRatio / 100;

// 解析房屋数据
function parseHouseData(raw) {
    const lines = raw.trim().split('\n');
    const houses = {};
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        if (parts.length < 4) continue;
        const houseId = parts[0].trim();
        const slopeId = parts[1].trim();
        const aspect = parseFloat(parts[2]);
        const nums = parseInt(parts[3]);
        if (!houses[houseId]) houses[houseId] = [];
        houses[houseId].push({
            id: slopeId,
            aspect: aspect,
            max: nums,
            score: calculateRoofScore(aspect)
        });
    }
    return houses;
}

// 逆变器选型
function getInverterOptions(planKey, phaseType) {
    const useOptions = phaseType === 'single' ? !!INVERTER_CONFIG.enableSingleOptions : !!INVERTER_CONFIG.enableThreeOptions;
    const baseOptions = phaseType === 'single' ? (INVERTER_CONFIG.single[planKey] || []) : (INVERTER_CONFIG.three[planKey] || []);
    const phaseMax = getPhaseMaxLimit(CONFIG, phaseType);
    const filtered = baseOptions.filter(size => size <= phaseMax);
    let options = useOptions ? filtered : [phaseMax];
    if (options.length === 0) {
        options = baseOptions.length > 0 ? [Math.min(phaseMax, baseOptions[baseOptions.length - 1])] : [phaseMax];
    }
    return { options, baseOptions, phaseMax, enforceList: useOptions };
}

function selectInverterForPlan(planKey, phaseType, requiredKw) {
    const optionsInfo = getInverterOptions(planKey, phaseType);
    const options = optionsInfo.options;
    const availableMax = optionsInfo.enforceList && options.length ? options[options.length - 1] : optionsInfo.phaseMax;
    let selected;
    if (optionsInfo.enforceList && options.length) {
        selected = options.find(s => s >= requiredKw) || availableMax;
    } else {
        selected = Math.min(Math.max(Math.ceil(requiredKw), 1), optionsInfo.phaseMax);
    }
    return { kw: selected, optionsInfo };
}

function applyInverterRules(result, planKey, phaseType) {
    const rawRequirement = result.totalKw / TARGET_RATIO;
    let { kw, optionsInfo } = selectInverterForPlan(planKey, phaseType, Math.ceil(rawRequirement));
    let ratio = (result.totalKw / kw) * 100;

    if (ratio > INVERTER_CONFIG.maxRatio) {
        const minInvForCompliance = Math.ceil(result.totalKw / MAX_RATIO);
        const upgraded = selectInverterForPlan(planKey, phaseType, minInvForCompliance);
        if (upgraded.kw > kw) {
            kw = upgraded.kw;
            ratio = (result.totalKw / kw) * 100;
        } else {
            const maxInv = optionsInfo.options[optionsInfo.options.length - 1];
            const maxAllowedKw = maxInv * MAX_RATIO;
            if (result.totalKw > maxAllowedKw) {
                result.totalKw = maxAllowedKw;
                result.count = Math.floor((maxAllowedKw * 1000) / PV_WATT);
            }
            kw = maxInv;
            ratio = (result.totalKw / kw) * 100;
        }
    }
    return { kw, ratio: ratio.toFixed(0) };
}

// 屋顶填充
function fillRoof(sortedPlanes, targetKw) {
    const neededPanels = Math.ceil((targetKw * 1000) / PV_WATT);
    let currentPanels = 0;
    let usedPlanes = [];
    
    for (let p of sortedPlanes) {
        if (p.max === 0) continue;
        let remainingNeed = neededPanels - currentPanels;
        if (remainingNeed <= 0) break;
        let take = Math.min(p.max, remainingNeed);
        currentPanels += take;
        usedPlanes.push({ id: p.id, count: take, score: p.score });
    }
    
    return {
        count: currentPanels,
        totalKw: currentPanels * PV_WATT / 1000,
        usedPlanes: usedPlanes
    };
}

// 生成方案
function generateProposals(houseId, roofData, state, phaseType) {
    const roofPlanes = roofData.map(p => ({...p})).sort((a, b) => b.score - a.score);
    const totalMaxKw = roofPlanes.reduce((sum, p) => sum + (p.max * PV_WATT / 1000), 0);

    // 方案A: 高端型 (满铺)
    const resultA = fillRoof(roofPlanes, 999);
    const inverterA = applyInverterRules(resultA, 'a', phaseType);
    const batteryA = calculateV6BatteryCapacity(CONFIG, resultA.totalKw, state, 'premium');

    // 方案B: 平衡型 (10-13kW)
    const targetKwB = totalMaxKw > 15 ? 13.2 : 10.0;
    const resultB = fillRoof(roofPlanes, targetKwB);
    const inverterB = applyInverterRules(resultB, 'b', phaseType);
    const batteryB = calculateV6BatteryCapacity(CONFIG, resultB.totalKw, state, 'balanced');

    // 方案C: 经济型 (6.6kW)
    const resultC = fillRoof(roofPlanes, 6.6);
    const inverterC = applyInverterRules(resultC, 'c', phaseType);
    const batteryC = calculateV6BatteryCapacity(CONFIG, resultC.totalKw, state, 'economy');

    // 计算补贴和成本 - 使用方案 A 线性定价
    const subsidyA = calculateSubsidy(CONFIG, resultA.totalKw, batteryA.nominal, state);
    const subsidyB = calculateSubsidy(CONFIG, resultB.totalKw, batteryB.nominal, state);
    const subsidyC = calculateSubsidy(CONFIG, resultC.totalKw, batteryC.nominal, state);

    const costA = calculateCostByScheme(CONFIG, resultA.totalKw, inverterA.kw, batteryA.nominal, 'A', state);
    const costB = calculateCostByScheme(CONFIG, resultB.totalKw, inverterB.kw, batteryB.nominal, 'A', state);
    const costC = calculateCostByScheme(CONFIG, resultC.totalKw, inverterC.kw, batteryC.nominal, 'A', state);

    return {
        houseId, state, phaseType,
        roofSummary: {
            totalPlanes: roofPlanes.length,
            validPlanes: roofPlanes.filter(p => p.max > 0).length,
            totalMaxPanels: roofPlanes.reduce((sum, p) => sum + p.max, 0),
            totalMaxKw: totalMaxKw.toFixed(2)
        },
        planA: { result: resultA, inverter: inverterA, battery: batteryA, subsidy: subsidyA, cost: costA },
        planB: { result: resultB, inverter: inverterB, battery: batteryB, subsidy: subsidyB, cost: costB },
        planC: { result: resultC, inverter: inverterC, battery: batteryC, subsidy: subsidyC, cost: costC }
    };
}

// UI 更新
function updateUI(proposals) {
    // 方案 A
    document.getElementById('propA-kw').textContent = formatKwValue(proposals.planA.result.totalKw);
    document.getElementById('propA-count').textContent = proposals.planA.result.count;
    document.getElementById('propA-inv').textContent = proposals.planA.inverter.kw;
    document.getElementById('propA-ratio').textContent = proposals.planA.inverter.ratio;
    document.getElementById('propA-battery').textContent = proposals.planA.battery.nominal;
    document.getElementById('propA-batteryDetail').textContent = proposals.planA.battery.methodDesc;
    document.getElementById('propA-subsidy').textContent = `$${Math.round(proposals.planA.subsidy.subsidyAmount).toLocaleString()}`;
    document.getElementById('propA-price-exGst').textContent = `$${Math.round(proposals.planA.cost.exGstExStc).toLocaleString()}`;
    document.getElementById('propA-price-incGst').textContent = `$${Math.round(proposals.planA.cost.incGstIncStc).toLocaleString()}`;

    // 方案 B
    document.getElementById('propB-kw').textContent = formatKwValue(proposals.planB.result.totalKw);
    document.getElementById('propB-count').textContent = proposals.planB.result.count;
    document.getElementById('propB-inv').textContent = proposals.planB.inverter.kw;
    document.getElementById('propB-ratio').textContent = proposals.planB.inverter.ratio;
    document.getElementById('propB-battery').textContent = proposals.planB.battery.nominal;
    document.getElementById('propB-batteryDetail').textContent = proposals.planB.battery.methodDesc;
    document.getElementById('propB-subsidy').textContent = `$${Math.round(proposals.planB.subsidy.subsidyAmount).toLocaleString()}`;
    document.getElementById('propB-price-exGst').textContent = `$${Math.round(proposals.planB.cost.exGstExStc).toLocaleString()}`;
    document.getElementById('propB-price-incGst').textContent = `$${Math.round(proposals.planB.cost.incGstIncStc).toLocaleString()}`;

    // 方案 C
    document.getElementById('propC-kw').textContent = formatKwValue(proposals.planC.result.totalKw);
    document.getElementById('propC-count').textContent = proposals.planC.result.count;
    document.getElementById('propC-inv').textContent = proposals.planC.inverter.kw;
    document.getElementById('propC-ratio').textContent = proposals.planC.inverter.ratio;
    document.getElementById('propC-battery').textContent = proposals.planC.battery.nominal;
    document.getElementById('propC-batteryDetail').textContent = proposals.planC.battery.methodDesc;
    document.getElementById('propC-subsidy').textContent = `$${Math.round(proposals.planC.subsidy.subsidyAmount).toLocaleString()}`;
    document.getElementById('propC-price-exGst').textContent = `$${Math.round(proposals.planC.cost.exGstExStc).toLocaleString()}`;
    document.getElementById('propC-price-incGst').textContent = `$${Math.round(proposals.planC.cost.incGstIncStc).toLocaleString()}`;

    // 更新详细推导过程
    updateDetailedDerivation(proposals);
}

function updateDetailedDerivation(proposals) {
    const container = document.getElementById('derivationSteps');
    const state = proposals.state;
    const annualYield = CONFIG.pv.annualYieldByState[state];
    const annualConsumption = CONFIG.consumption[state];
    
    // 使用方案 B 作为示例展示详细推导
    const planB = proposals.planB;
    const dims = planB.battery.dims;
    
    container.innerHTML = `
        <!-- Step 1: 屋顶潜力评估 -->
        <div class="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
            <h3 class="text-lg font-bold text-blue-900 mb-4 flex items-center">
                <span class="text-2xl mr-2">🏠</span>
                Step 1: 屋顶潜力评估
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white p-4 rounded-lg border border-blue-200">
                    <h4 class="font-semibold text-blue-800 mb-2">GIS 分析结果</h4>
                    <div class="text-sm text-gray-700 space-y-1">
                        <p>• 总坡面数: <span class="font-bold">${proposals.roofSummary.totalPlanes}</span></p>
                        <p>• 有效坡面: <span class="font-bold text-green-600">${proposals.roofSummary.validPlanes}</span></p>
                        <p>• 最大可装板数: <span class="font-bold">${proposals.roofSummary.totalMaxPanels}</span> 片</p>
                        <p>• 屋顶最大容量: <span class="font-bold text-blue-600">${proposals.roofSummary.totalMaxKw}</span> kW</p>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-lg border border-blue-200">
                    <h4 class="font-semibold text-blue-800 mb-2">组件参数</h4>
                    <div class="text-sm text-gray-700 space-y-1">
                        <p>• 型号: <span class="font-bold">${CONFIG.pv.model}</span></p>
                        <p>• 单片功率: <span class="font-bold">${PV_WATT} W</span></p>
                        <p>• 计算公式: 板数 × ${PV_WATT}W ÷ 1000 = kW</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 2: V6 能量维度计算 -->
        <div class="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
            <h3 class="text-lg font-bold text-green-900 mb-4 flex items-center">
                <span class="text-2xl mr-2">⚡</span>
                Step 2: V6 能量维度计算 (全年日均数据)
            </h3>
            
            <div class="bg-white p-4 rounded-lg border border-green-200 mb-4">
                <h4 class="font-semibold text-green-800 mb-3">基础参数</h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div class="bg-green-50 p-2 rounded">
                        <p class="text-gray-500 text-xs">所在州</p>
                        <p class="font-bold text-green-700">${state}</p>
                    </div>
                    <div class="bg-green-50 p-2 rounded">
                        <p class="text-gray-500 text-xs">年发电系数</p>
                        <p class="font-bold text-green-700">${annualYield} kWh/kW</p>
                    </div>
                    <div class="bg-green-50 p-2 rounded">
                        <p class="text-gray-500 text-xs">年用电量</p>
                        <p class="font-bold text-green-700">${annualConsumption.toLocaleString()} kWh</p>
                    </div>
                    <div class="bg-green-50 p-2 rounded">
                        <p class="text-gray-500 text-xs">PV 容量</p>
                        <p class="font-bold text-green-700">${formatKwValue(planB.result.totalKw)} kW</p>
                    </div>
                </div>
            </div>

            <div class="space-y-3">
                <div class="calculation-box bg-white border border-green-300">
                    <p class="text-green-800 font-semibold mb-1">📊 日均用电量计算</p>
                    <p class="text-gray-700">年用电量 ÷ 365 = ${annualConsumption} ÷ 365 = <span class="font-bold text-green-600">${dims.dailyConsumption.toFixed(2)} kWh/天</span></p>
                </div>

                <div class="calculation-box bg-white border border-green-300">
                    <p class="text-green-800 font-semibold mb-1">☀️ 日均发电量计算</p>
                    <p class="text-gray-700">PV容量 × 年发电系数 ÷ 365</p>
                    <p class="text-gray-700">= ${formatKwValue(planB.result.totalKw)} × ${annualYield} ÷ 365 = <span class="font-bold text-green-600">${dims.dailyGeneration.toFixed(2)} kWh/天</span></p>
                </div>

                <div class="calculation-box bg-white border border-green-300">
                    <p class="text-green-800 font-semibold mb-1">🌙 晚高峰用电 (17:00-20:00)</p>
                    <p class="text-gray-700">日均用电 × 晚高峰比例 = ${dims.dailyConsumption.toFixed(2)} × ${(dims.eveningKwh / dims.dailyConsumption).toFixed(3)}</p>
                    <p class="text-gray-700">= <span class="font-bold text-green-600">${dims.eveningKwh.toFixed(2)} kWh</span></p>
                </div>

                <div class="calculation-box bg-white border border-green-300">
                    <p class="text-green-800 font-semibold mb-1">🌃 整夜用电 (17:00-06:00)</p>
                    <p class="text-gray-700">日均用电 × 整夜比例 = ${dims.dailyConsumption.toFixed(2)} × ${(dims.nightKwh / dims.dailyConsumption).toFixed(3)}</p>
                    <p class="text-gray-700">= <span class="font-bold text-green-600">${dims.nightKwh.toFixed(2)} kWh</span></p>
                </div>

                <div class="calculation-box bg-white border border-amber-300">
                    <p class="text-amber-800 font-semibold mb-1">✨ V6 光伏剩余 (全年日均)</p>
                    <p class="text-gray-700">逐小时计算: Σ max(0, 发电 - 用电)</p>
                    <p class="text-gray-700">= <span class="font-bold text-amber-600">${dims.surplusKwh.toFixed(2)} kWh/天</span></p>
                    <p class="text-xs text-amber-600 mt-1">💡 V6 核心变化：使用全年日均数据，而非 6 月份数据</p>
                </div>
            </div>
        </div>

        <!-- Step 3: 电池容量推导 -->
        <div class="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg">
            <h3 class="text-lg font-bold text-purple-900 mb-4 flex items-center">
                <span class="text-2xl mr-2">🔋</span>
                Step 3: V6 电池容量推导 (三种方案对比)
            </h3>

            <div class="bg-white p-4 rounded-lg border border-purple-200 mb-4">
                <h4 class="font-semibold text-purple-800 mb-2">电池效率参数</h4>
                <div class="grid grid-cols-3 gap-3 text-sm">
                    <div class="bg-purple-50 p-2 rounded text-center">
                        <p class="text-gray-500 text-xs">DOD (放电深度)</p>
                        <p class="font-bold text-purple-700">${CONFIG.battery.dod}</p>
                    </div>
                    <div class="bg-purple-50 p-2 rounded text-center">
                        <p class="text-gray-500 text-xs">RTE (往返效率)</p>
                        <p class="font-bold text-purple-700">${CONFIG.battery.rte}</p>
                    </div>
                    <div class="bg-purple-50 p-2 rounded text-center">
                        <p class="text-gray-500 text-xs">总效率</p>
                        <p class="font-bold text-purple-700">${(CONFIG.battery.dod * CONFIG.battery.rte).toFixed(3)}</p>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- 方案 A -->
                <div class="bg-white p-4 rounded-lg border-2 border-purple-400">
                    <h4 class="font-bold text-purple-800 mb-3">方案 A: 高端型</h4>
                    <div class="space-y-2 text-sm">
                        <div class="calculation-box bg-purple-50 border-purple-300">
                            <p class="font-semibold text-purple-700">目标能量</p>
                            <p>max(整夜, 0.7×剩余)</p>
                            <p>= max(${proposals.planA.battery.dims.nightKwh.toFixed(2)}, 0.7×${proposals.planA.battery.dims.surplusKwh.toFixed(2)})</p>
                            <p>= max(${proposals.planA.battery.dims.nightKwh.toFixed(2)}, ${(0.7 * proposals.planA.battery.dims.surplusKwh).toFixed(2)})</p>
                            <p class="font-bold text-purple-600">= ${proposals.planA.battery.recommendedEnergy.toFixed(2)} kWh</p>
                        </div>
                        <div class="calculation-box bg-purple-50 border-purple-300">
                            <p class="font-semibold text-purple-700">电池容量</p>
                            <p>${proposals.planA.battery.recommendedEnergy.toFixed(2)} ÷ ${(CONFIG.battery.dod * CONFIG.battery.rte).toFixed(3)}</p>
                            <p class="font-bold text-purple-600">= ${proposals.planA.battery.calculatedNominal.toFixed(2)} kWh</p>
                        </div>
                        <div class="bg-purple-100 p-2 rounded text-center">
                            <p class="text-xs text-purple-600">标准化后</p>
                            <p class="text-2xl font-bold text-purple-700">${proposals.planA.battery.nominal} kWh</p>
                        </div>
                    </div>
                </div>

                <!-- 方案 B -->
                <div class="bg-white p-4 rounded-lg border-2 border-blue-500">
                    <h4 class="font-bold text-blue-800 mb-3">方案 B: 平衡型 ⭐</h4>
                    <div class="space-y-2 text-sm">
                        <div class="calculation-box bg-blue-50 border-blue-300">
                            <p class="font-semibold text-blue-700">目标能量</p>
                            <p>max(晚高峰, 0.55×剩余)</p>
                            <p>= max(${dims.eveningKwh.toFixed(2)}, 0.55×${dims.surplusKwh.toFixed(2)})</p>
                            <p>= max(${dims.eveningKwh.toFixed(2)}, ${(0.55 * dims.surplusKwh).toFixed(2)})</p>
                            <p class="font-bold text-blue-600">= ${planB.battery.recommendedEnergy.toFixed(2)} kWh</p>
                        </div>
                        <div class="calculation-box bg-blue-50 border-blue-300">
                            <p class="font-semibold text-blue-700">电池容量</p>
                            <p>${planB.battery.recommendedEnergy.toFixed(2)} ÷ ${(CONFIG.battery.dod * CONFIG.battery.rte).toFixed(3)}</p>
                            <p class="font-bold text-blue-600">= ${planB.battery.calculatedNominal.toFixed(2)} kWh</p>
                        </div>
                        <div class="bg-blue-100 p-2 rounded text-center">
                            <p class="text-xs text-blue-600">标准化后</p>
                            <p class="text-2xl font-bold text-blue-700">${planB.battery.nominal} kWh</p>
                        </div>
                    </div>
                </div>

                <!-- 方案 C -->
                <div class="bg-white p-4 rounded-lg border-2 border-green-400">
                    <h4 class="font-bold text-green-800 mb-3">方案 C: 经济型</h4>
                    <div class="space-y-2 text-sm">
                        <div class="calculation-box bg-green-50 border-green-300">
                            <p class="font-semibold text-green-700">目标能量</p>
                            <p>晚高峰用电</p>
                            <p class="font-bold text-green-600">= ${proposals.planC.battery.dims.eveningKwh.toFixed(2)} kWh</p>
                        </div>
                        <div class="calculation-box bg-green-50 border-green-300">
                            <p class="font-semibold text-green-700">电池容量</p>
                            <p>${proposals.planC.battery.dims.eveningKwh.toFixed(2)} ÷ ${(CONFIG.battery.dod * CONFIG.battery.rte).toFixed(3)}</p>
                            <p class="font-bold text-green-600">= ${proposals.planC.battery.calculatedNominal.toFixed(2)} kWh</p>
                        </div>
                        <div class="bg-green-100 p-2 rounded text-center">
                            <p class="text-xs text-green-600">标准化后</p>
                            <p class="text-2xl font-bold text-green-700">${proposals.planC.battery.nominal} kWh</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 4: 成本计算 (方案 A 线性定价) -->
        <div class="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg">
            <h3 class="text-lg font-bold text-amber-900 mb-4 flex items-center">
                <span class="text-2xl mr-2">💰</span>
                Step 4: 成本计算 (方案 A 线性定价)
            </h3>

            <div class="bg-white p-4 rounded-lg border border-amber-200 mb-4">
                <h4 class="font-semibold text-amber-800 mb-2">方案 A 定价参数</h4>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div class="bg-amber-50 p-2 rounded">
                        <p class="text-gray-500 text-xs">PV 单价</p>
                        <p class="font-bold text-amber-700">$${CONFIG.cost.schemeA.pvPerKw}/kW</p>
                    </div>
                    <div class="bg-amber-50 p-2 rounded">
                        <p class="text-gray-500 text-xs">逆变器单价</p>
                        <p class="font-bold text-amber-700">$${CONFIG.cost.schemeA.inverterPerKw}/kW</p>
                    </div>
                    <div class="bg-amber-50 p-2 rounded">
                        <p class="text-gray-500 text-xs">电池单价</p>
                        <p class="font-bold text-amber-700">$${CONFIG.cost.schemeA.batteryPerKwh}/kWh</p>
                    </div>
                </div>
            </div>

            <div class="space-y-3">
                <div class="calculation-box bg-white border border-amber-300">
                    <p class="text-amber-800 font-semibold mb-1">方案 B 成本计算示例</p>
                    <p class="text-gray-700">PV 成本: ${formatKwValue(planB.result.totalKw)} kW × $${CONFIG.cost.schemeA.pvPerKw} = $${(planB.result.totalKw * CONFIG.cost.schemeA.pvPerKw).toFixed(0)}</p>
                    <p class="text-gray-700">逆变器成本: ${planB.inverter.kw} kW × $${CONFIG.cost.schemeA.inverterPerKw} = $${(planB.inverter.kw * CONFIG.cost.schemeA.inverterPerKw).toFixed(0)}</p>
                    <p class="text-gray-700">电池成本: ${planB.battery.nominal} kWh × $${CONFIG.cost.schemeA.batteryPerKwh} = $${(planB.battery.nominal * CONFIG.cost.schemeA.batteryPerKwh).toFixed(0)}</p>
                    <p class="text-gray-700 mt-2 pt-2 border-t border-amber-200">不含税不含补贴: <span class="font-bold text-amber-600">$${Math.round(planB.cost.exGstExStc).toLocaleString()}</span></p>
                    <p class="text-gray-700">补贴: -$${Math.round(planB.subsidy.subsidyAmount).toLocaleString()}</p>
                    <p class="text-gray-700">含税 (GST ${(CONFIG.cost.gstRate * 100).toFixed(0)}%): +$${Math.round(planB.cost.exGstExStc * CONFIG.cost.gstRate).toLocaleString()}</p>
                    <p class="text-gray-700 font-bold mt-2 pt-2 border-t border-amber-200">含税含补贴: <span class="text-amber-600">$${Math.round(planB.cost.incGstIncStc).toLocaleString()}</span></p>
                </div>
            </div>
        </div>

        <!-- V6 核心优势总结 -->
        <div class="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 p-6 rounded-lg">
            <h3 class="text-lg font-bold text-indigo-900 mb-4 flex items-center">
                <span class="text-2xl mr-2">🎯</span>
                V6 核心优势
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white p-4 rounded-lg border border-indigo-200">
                    <h4 class="font-semibold text-indigo-800 mb-2">✅ 更准确的估算</h4>
                    <p class="text-sm text-gray-700">使用全年日均数据，避免 6 月份单月数据的季节性偏差，更贴近实际全年运行情况</p>
                </div>
                <div class="bg-white p-4 rounded-lg border border-indigo-200">
                    <h4 class="font-semibold text-indigo-800 mb-2">✅ 更合理的容量</h4>
                    <p class="text-sm text-gray-700">A方案系数从 0.8 调整为 0.7，减少过大电池配置，提高经济性和实用性</p>
                </div>
            </div>
        </div>
    `;
}

// 初始化
function init() {
    AppData.houses = parseHouseData(HOUSE_DATA_RAW);
    
    // 填充房屋选择器
    const selector = document.getElementById('houseSelector');
    selector.innerHTML = '';
    const houseIds = Object.keys(AppData.houses).sort((a, b) => parseInt(a) - parseInt(b));
    houseIds.forEach(id => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = `房屋 ${id} (${AppData.houses[id].length} 个坡面)`;
        // 默认选择房屋 27
        if (id === '27') {
            opt.selected = true;
        }
        selector.appendChild(opt);
    });
    
    // 更新 PV 信息
    document.getElementById('pvModel').textContent = CONFIG.pv.model;
    document.getElementById('pvPower').textContent = `${CONFIG.pv.pmax} W`;
    
    // 更新州信息
    updateStateInfo();
    
    // 绑定事件
    selector.addEventListener('change', recalculate);
    document.getElementById('stateSelector').addEventListener('change', () => {
        updateStateInfo();
        recalculate();
    });
    document.getElementById('phaseSelector').addEventListener('change', recalculate);
    
    // 初始计算
    recalculate();
}

function updateStateInfo() {
    const state = document.getElementById('stateSelector').value;
    const consumption = CONFIG.consumption[state];
    document.getElementById('stateInfo').textContent = `年用电量: ${consumption.toLocaleString()} kWh`;
    AppData.currentState = state;
}

function recalculate() {
    const houseId = document.getElementById('houseSelector').value;
    const state = document.getElementById('stateSelector').value;
    const phase = document.getElementById('phaseSelector').value;
    
    if (!houseId || !AppData.houses[houseId]) return;
    
    const roofData = AppData.houses[houseId];
    const proposals = generateProposals(houseId, roofData, state, phase);
    
    document.getElementById('houseSummary').textContent = 
        `${proposals.roofSummary.validPlanes} 个有效坡面, 最大 ${proposals.roofSummary.totalMaxKw} kW`;
    
    updateUI(proposals);
}

// 启动
document.addEventListener('DOMContentLoaded', init);
