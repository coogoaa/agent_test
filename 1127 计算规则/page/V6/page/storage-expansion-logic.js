/**
 * V6 储能扩容页面逻辑 - 详细推导过程版本
 * 使用方案 A 线性定价
 */

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

const AppData = { houses: {}, currentState: 'TAS', config: null };
const CONFIG = loadConfig();
AppData.config = CONFIG;

const PV_WATT = CONFIG.pv.pmax;
const INVERTER_CONFIG = CONFIG.inverter;
const TARGET_RATIO = INVERTER_CONFIG.targetRatio / 100;
const MAX_RATIO = INVERTER_CONFIG.maxRatio / 100;
const ROOF_CAPACITY_FACTOR = CONFIG.expansion?.roofCapacityFactor || 0.7;

function parseHouseData(raw) {
    const lines = raw.trim().split('\n');
    const houses = {};
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('\t');
        if (parts.length < 4) continue;
        const houseId = parts[0].trim();
        if (!houses[houseId]) houses[houseId] = [];
        houses[houseId].push({
            id: parts[1].trim(),
            aspect: parseFloat(parts[2]),
            max: parseInt(parts[3]),
            score: calculateRoofScore(parseFloat(parts[2]))
        });
    }
    return houses;
}

function getInverterOptions(planKey, phaseType) {
    const useOptions = phaseType === 'single' ? !!INVERTER_CONFIG.enableSingleOptions : !!INVERTER_CONFIG.enableThreeOptions;
    const baseOptions = phaseType === 'single' ? (INVERTER_CONFIG.single[planKey] || []) : (INVERTER_CONFIG.three[planKey] || []);
    const phaseMax = getPhaseMaxLimit(CONFIG, phaseType);
    let options = useOptions ? baseOptions.filter(s => s <= phaseMax) : [phaseMax];
    if (options.length === 0) options = [phaseMax];
    return { options, phaseMax, enforceList: useOptions };
}

function selectInverterForPlan(planKey, phaseType, requiredKw) {
    const info = getInverterOptions(planKey, phaseType);
    let selected = info.enforceList ? (info.options.find(s => s >= requiredKw) || info.options[info.options.length - 1]) : Math.min(Math.max(Math.ceil(requiredKw), 1), info.phaseMax);
    return { kw: selected, optionsInfo: info };
}

function applyInverterRules(result, planKey, phaseType) {
    let { kw, optionsInfo } = selectInverterForPlan(planKey, phaseType, Math.ceil(result.totalKw / TARGET_RATIO));
    let ratio = (result.totalKw / kw) * 100;
    if (ratio > INVERTER_CONFIG.maxRatio) {
        const upgraded = selectInverterForPlan(planKey, phaseType, Math.ceil(result.totalKw / MAX_RATIO));
        if (upgraded.kw > kw) { kw = upgraded.kw; }
        else {
            const maxInv = optionsInfo.options[optionsInfo.options.length - 1];
            const maxKw = maxInv * MAX_RATIO;
            if (result.totalKw > maxKw) {
                result.totalKw = maxKw;
                result.count = Math.floor((maxKw * 1000) / PV_WATT);
            }
            kw = maxInv;
        }
        ratio = (result.totalKw / kw) * 100;
    }
    return { kw, ratio: ratio.toFixed(0) };
}

function fillRoof(sortedPlanes, targetKw) {
    const neededPanels = Math.ceil((targetKw * 1000) / PV_WATT);
    let currentPanels = 0, usedPlanes = [];
    for (let p of sortedPlanes) {
        if (p.max === 0) continue;
        let take = Math.min(p.max, neededPanels - currentPanels);
        if (take <= 0) break;
        currentPanels += take;
        usedPlanes.push({ id: p.id, count: take, score: p.score });
    }
    return { count: currentPanels, totalKw: currentPanels * PV_WATT / 1000, usedPlanes };
}

function generateProposals(houseId, roofData, state, phaseType) {
    // 应用储能扩容系数
    const roofPlanes = roofData.map(p => ({
        ...p,
        max: Math.floor(p.max * ROOF_CAPACITY_FACTOR)
    })).sort((a, b) => b.score - a.score);
    
    const totalMaxKw = roofPlanes.reduce((sum, p) => sum + (p.max * PV_WATT / 1000), 0);
    const originalMaxKw = roofData.reduce((sum, p) => sum + (p.max * PV_WATT / 1000), 0);

    const resultA = fillRoof(roofPlanes, 999);
    const inverterA = applyInverterRules(resultA, 'a', phaseType);
    const batteryA = calculateV6BatteryCapacity(CONFIG, resultA.totalKw, state, 'premium');

    const targetKwB = totalMaxKw > 15 ? 13.2 : 10.0;
    const resultB = fillRoof(roofPlanes, targetKwB);
    const inverterB = applyInverterRules(resultB, 'b', phaseType);
    const batteryB = calculateV6BatteryCapacity(CONFIG, resultB.totalKw, state, 'balanced');

    const resultC = fillRoof(roofPlanes, 6.6);
    const inverterC = applyInverterRules(resultC, 'c', phaseType);
    const batteryC = calculateV6BatteryCapacity(CONFIG, resultC.totalKw, state, 'economy');

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
            totalMaxKw: totalMaxKw.toFixed(2),
            originalMaxKw: originalMaxKw.toFixed(2),
            roofFactor: ROOF_CAPACITY_FACTOR
        },
        planA: { result: resultA, inverter: inverterA, battery: batteryA, subsidy: subsidyA, cost: costA },
        planB: { result: resultB, inverter: inverterB, battery: batteryB, subsidy: subsidyB, cost: costB },
        planC: { result: resultC, inverter: inverterC, battery: batteryC, subsidy: subsidyC, cost: costC }
    };
}

function updateUI(proposals) {
    ['A', 'B', 'C'].forEach(plan => {
        const p = proposals[`plan${plan}`];
        document.getElementById(`prop${plan}-kw`).textContent = formatKwValue(p.result.totalKw);
        document.getElementById(`prop${plan}-count`).textContent = p.result.count;
        document.getElementById(`prop${plan}-inv`).textContent = p.inverter.kw;
        document.getElementById(`prop${plan}-ratio`).textContent = p.inverter.ratio;
        document.getElementById(`prop${plan}-battery`).textContent = p.battery.nominal;
        document.getElementById(`prop${plan}-batteryDetail`).textContent = p.battery.methodDesc;
        document.getElementById(`prop${plan}-subsidy`).textContent = `$${Math.round(p.subsidy.subsidyAmount).toLocaleString()}`;
        document.getElementById(`prop${plan}-price-exGst`).textContent = `$${Math.round(p.cost.exGstExStc).toLocaleString()}`;
        document.getElementById(`prop${plan}-price-incGst`).textContent = `$${Math.round(p.cost.incGstIncStc).toLocaleString()}`;
    });
    updateDetailedDerivation(proposals);
}

function updateDetailedDerivation(proposals) {
    const container = document.getElementById('derivationSteps');
    const state = proposals.state;
    const annualYield = CONFIG.pv.annualYieldByState[state];
    const annualConsumption = CONFIG.consumption[state];
    const planB = proposals.planB;
    const dims = planB.battery.dims;
    
    container.innerHTML = `
        <!-- Step 0: 储能扩容模式说明 -->
        <div class="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
            <h3 class="text-lg font-bold text-yellow-900 mb-4 flex items-center">
                <span class="text-2xl mr-2">🔄</span>
                Step 0: 储能扩容模式说明
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white p-4 rounded-lg border border-yellow-200">
                    <h4 class="font-semibold text-yellow-800 mb-2">屋顶容量调整</h4>
                    <div class="calculation-box bg-yellow-50 border-yellow-300">
                        <p class="text-yellow-800 font-semibold mb-1">原始屋顶容量</p>
                        <p class="text-gray-700">${proposals.roofSummary.originalMaxKw} kW</p>
                    </div>
                    <div class="calculation-box bg-yellow-50 border-yellow-300">
                        <p class="text-yellow-800 font-semibold mb-1">容量系数</p>
                        <p class="text-gray-700">${(ROOF_CAPACITY_FACTOR * 100).toFixed(0)}% (已有系统占用部分屋顶)</p>
                    </div>
                    <div class="calculation-box bg-yellow-50 border-yellow-300">
                        <p class="text-yellow-800 font-semibold mb-1">可用容量</p>
                        <p class="text-gray-700">${proposals.roofSummary.originalMaxKw} × ${ROOF_CAPACITY_FACTOR} = <span class="font-bold text-yellow-600">${proposals.roofSummary.totalMaxKw} kW</span></p>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-lg border border-yellow-200">
                    <h4 class="font-semibold text-yellow-800 mb-2">扩容场景</h4>
                    <div class="text-sm text-gray-700 space-y-2">
                        <p>• 用户已有光伏系统</p>
                        <p>• 希望增加储能或扩展PV</p>
                        <p>• 部分屋顶已被占用</p>
                        <p>• 可能需要更换逆变器</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 1: 屋顶潜力评估 -->
        <div class="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
            <h3 class="text-lg font-bold text-blue-900 mb-4 flex items-center">
                <span class="text-2xl mr-2">🏠</span>
                Step 1: 可用屋顶评估
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white p-4 rounded-lg border border-blue-200">
                    <h4 class="font-semibold text-blue-800 mb-2">扩容后可用空间</h4>
                    <div class="text-sm text-gray-700 space-y-1">
                        <p>• 有效坡面: <span class="font-bold text-green-600">${proposals.roofSummary.validPlanes}</span></p>
                        <p>• 可装板数: <span class="font-bold">${proposals.roofSummary.totalMaxPanels}</span> 片</p>
                        <p>• 可用容量: <span class="font-bold text-blue-600">${proposals.roofSummary.totalMaxKw}</span> kW</p>
                    </div>
                </div>
                <div class="bg-white p-4 rounded-lg border border-blue-200">
                    <h4 class="font-semibold text-blue-800 mb-2">组件参数</h4>
                    <div class="text-sm text-gray-700 space-y-1">
                        <p>• 型号: <span class="font-bold">${CONFIG.pv.model}</span></p>
                        <p>• 单片功率: <span class="font-bold">${PV_WATT} W</span></p>
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
                    <p class="text-green-800 font-semibold mb-1">📊 日均用电量</p>
                    <p class="text-gray-700">${annualConsumption} ÷ 365 = <span class="font-bold text-green-600">${dims.dailyConsumption.toFixed(2)} kWh/天</span></p>
                </div>

                <div class="calculation-box bg-white border border-green-300">
                    <p class="text-green-800 font-semibold mb-1">☀️ 日均发电量</p>
                    <p class="text-gray-700">${formatKwValue(planB.result.totalKw)} × ${annualYield} ÷ 365 = <span class="font-bold text-green-600">${dims.dailyGeneration.toFixed(2)} kWh/天</span></p>
                </div>

                <div class="calculation-box bg-white border border-green-300">
                    <p class="text-green-800 font-semibold mb-1">🌙 晚高峰用电 (17:00-20:00)</p>
                    <p class="text-gray-700"><span class="font-bold text-green-600">${dims.eveningKwh.toFixed(2)} kWh</span></p>
                </div>

                <div class="calculation-box bg-white border border-green-300">
                    <p class="text-green-800 font-semibold mb-1">🌃 整夜用电 (17:00-06:00)</p>
                    <p class="text-gray-700"><span class="font-bold text-green-600">${dims.nightKwh.toFixed(2)} kWh</span></p>
                </div>

                <div class="calculation-box bg-white border border-amber-300">
                    <p class="text-amber-800 font-semibold mb-1">✨ V6 光伏剩余 (全年日均)</p>
                    <p class="text-gray-700">= <span class="font-bold text-amber-600">${dims.surplusKwh.toFixed(2)} kWh/天</span></p>
                    <p class="text-xs text-amber-600 mt-1">💡 V6 核心：使用全年日均数据</p>
                </div>
            </div>
        </div>

        <!-- Step 3: 电池容量推导 -->
        <div class="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg">
            <h3 class="text-lg font-bold text-purple-900 mb-4 flex items-center">
                <span class="text-2xl mr-2">🔋</span>
                Step 3: V6 电池容量推导
            </h3>

            <div class="bg-white p-4 rounded-lg border border-purple-200 mb-4">
                <h4 class="font-semibold text-purple-800 mb-2">电池效率参数</h4>
                <div class="grid grid-cols-3 gap-3 text-sm">
                    <div class="bg-purple-50 p-2 rounded text-center">
                        <p class="text-gray-500 text-xs">DOD</p>
                        <p class="font-bold text-purple-700">${CONFIG.battery.dod}</p>
                    </div>
                    <div class="bg-purple-50 p-2 rounded text-center">
                        <p class="text-gray-500 text-xs">RTE</p>
                        <p class="font-bold text-purple-700">${CONFIG.battery.rte}</p>
                    </div>
                    <div class="bg-purple-50 p-2 rounded text-center">
                        <p class="text-gray-500 text-xs">总效率</p>
                        <p class="font-bold text-purple-700">${(CONFIG.battery.dod * CONFIG.battery.rte).toFixed(3)}</p>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-white p-4 rounded-lg border-2 border-purple-400">
                    <h4 class="font-bold text-purple-800 mb-3">方案 A</h4>
                    <div class="calculation-box bg-purple-50 border-purple-300">
                        <p class="font-semibold text-purple-700">max(整夜, 0.7×剩余)</p>
                        <p>= ${proposals.planA.battery.recommendedEnergy.toFixed(2)} kWh</p>
                    </div>
                    <div class="bg-purple-100 p-2 rounded text-center mt-2">
                        <p class="text-2xl font-bold text-purple-700">${proposals.planA.battery.nominal} kWh</p>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-lg border-2 border-blue-500">
                    <h4 class="font-bold text-blue-800 mb-3">方案 B ⭐</h4>
                    <div class="calculation-box bg-blue-50 border-blue-300">
                        <p class="font-semibold text-blue-700">max(晚高峰, 0.55×剩余)</p>
                        <p>= ${planB.battery.recommendedEnergy.toFixed(2)} kWh</p>
                    </div>
                    <div class="bg-blue-100 p-2 rounded text-center mt-2">
                        <p class="text-2xl font-bold text-blue-700">${planB.battery.nominal} kWh</p>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-lg border-2 border-green-400">
                    <h4 class="font-bold text-green-800 mb-3">方案 C</h4>
                    <div class="calculation-box bg-green-50 border-green-300">
                        <p class="font-semibold text-green-700">晚高峰用电</p>
                        <p>= ${proposals.planC.battery.recommendedEnergy.toFixed(2)} kWh</p>
                    </div>
                    <div class="bg-green-100 p-2 rounded text-center mt-2">
                        <p class="text-2xl font-bold text-green-700">${proposals.planC.battery.nominal} kWh</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 4: 成本计算 -->
        <div class="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg">
            <h3 class="text-lg font-bold text-amber-900 mb-4 flex items-center">
                <span class="text-2xl mr-2">💰</span>
                Step 4: 成本计算 (方案 A 线性定价)
            </h3>

            <div class="calculation-box bg-white border border-amber-300">
                <p class="text-amber-800 font-semibold mb-1">方案 B 成本示例</p>
                <p class="text-gray-700">PV: ${formatKwValue(planB.result.totalKw)} kW × $${CONFIG.cost.schemeA.pvPerKw} = $${(planB.result.totalKw * CONFIG.cost.schemeA.pvPerKw).toFixed(0)}</p>
                <p class="text-gray-700">逆变器: ${planB.inverter.kw} kW × $${CONFIG.cost.schemeA.inverterPerKw} = $${(planB.inverter.kw * CONFIG.cost.schemeA.inverterPerKw).toFixed(0)}</p>
                <p class="text-gray-700">电池: ${planB.battery.nominal} kWh × $${CONFIG.cost.schemeA.batteryPerKwh} = $${(planB.battery.nominal * CONFIG.cost.schemeA.batteryPerKwh).toFixed(0)}</p>
                <p class="text-gray-700 mt-2 pt-2 border-t">不含税不含补贴: <span class="font-bold text-amber-600">$${Math.round(planB.cost.exGstExStc).toLocaleString()}</span></p>
                <p class="text-gray-700">补贴: -$${Math.round(planB.subsidy.subsidyAmount).toLocaleString()}</p>
                <p class="text-gray-700 font-bold mt-2">含税含补贴: <span class="text-amber-600">$${Math.round(planB.cost.incGstIncStc).toLocaleString()}</span></p>
            </div>
        </div>
    `;
}

function init() {
    AppData.houses = parseHouseData(HOUSE_DATA_RAW);
    
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
    
    document.getElementById('pvModel').textContent = CONFIG.pv.model;
    document.getElementById('pvPower').textContent = `${CONFIG.pv.pmax} W`;
    document.getElementById('roofFactorDisplay').textContent = ROOF_CAPACITY_FACTOR;
    
    updateStateInfo();
    
    selector.addEventListener('change', recalculate);
    document.getElementById('stateSelector').addEventListener('change', () => { updateStateInfo(); recalculate(); });
    document.getElementById('phaseSelector').addEventListener('change', recalculate);
    
    recalculate();
}

function updateStateInfo() {
    const state = document.getElementById('stateSelector').value;
    document.getElementById('stateInfo').textContent = `年用电量: ${CONFIG.consumption[state].toLocaleString()} kWh`;
    AppData.currentState = state;
}

function recalculate() {
    const houseId = document.getElementById('houseSelector').value;
    if (!houseId || !AppData.houses[houseId]) return;
    
    const proposals = generateProposals(
        houseId,
        AppData.houses[houseId],
        document.getElementById('stateSelector').value,
        document.getElementById('phaseSelector').value
    );
    
    document.getElementById('houseSummary').textContent = 
        `可用 ${proposals.roofSummary.totalMaxKw} kW (原 ${proposals.roofSummary.originalMaxKw} kW × ${(ROOF_CAPACITY_FACTOR * 100).toFixed(0)}%)`;
    
    updateUI(proposals);
}

document.addEventListener('DOMContentLoaded', init);
