// 各州用电数据
const STATE_DATA = {
    hourlyRatios: {
        NSW: [0.04427, 0.03912, 0.03176, 0.02706, 0.02583, 0.02805, 0.03427, 0.03939, 0.04089, 0.04050, 0.03986, 0.03936, 0.03948, 0.03908, 0.03920, 0.04105, 0.04569, 0.05328, 0.05846, 0.05634, 0.05329, 0.04947, 0.04804, 0.04630],
        VIC: [0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.03941, 0.03941],
        QLD: [0.02990, 0.02638, 0.02405, 0.02319, 0.02396, 0.02745, 0.03486, 0.04163, 0.04270, 0.04255, 0.04252, 0.04348, 0.04421, 0.04440, 0.04486, 0.04667, 0.05074, 0.05727, 0.06229, 0.05996, 0.05621, 0.04970, 0.04421, 0.03679],
        SA: [0.04850, 0.05185, 0.03814, 0.02956, 0.02568, 0.02654, 0.03142, 0.03655, 0.03563, 0.03624, 0.04103, 0.04366, 0.04188, 0.03980, 0.03997, 0.04111, 0.04525, 0.05442, 0.05990, 0.05715, 0.05315, 0.04739, 0.03905, 0.03607],
        WA: [0.02990, 0.02638, 0.02405, 0.02319, 0.02396, 0.02745, 0.03486, 0.04163, 0.04270, 0.04255, 0.04252, 0.04348, 0.04421, 0.04440, 0.04486, 0.04667, 0.05074, 0.05727, 0.06229, 0.05996, 0.05621, 0.04970, 0.04421, 0.03679],
        TAS: [0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.03941, 0.03941],
        NT: [0.02990, 0.02638, 0.02405, 0.02319, 0.02396, 0.02745, 0.03486, 0.04163, 0.04270, 0.04255, 0.04252, 0.04348, 0.04421, 0.04440, 0.04486, 0.04667, 0.05074, 0.05727, 0.06229, 0.05996, 0.05621, 0.04970, 0.04421, 0.03679],
        ACT: [0.03400, 0.03031, 0.02876, 0.02867, 0.03055, 0.03643, 0.04493, 0.04904, 0.04317, 0.03792, 0.03615, 0.03118, 0.03053, 0.02937, 0.03003, 0.03369, 0.04434, 0.05901, 0.06693, 0.06550, 0.06142, 0.05416, 0.05178, 0.04208]
    }
};

const STRATEGY_CONFIG = {
    A: { name: "高端型", battery_ratio: 1.5 },
    B: { name: "平衡型", battery_ratio: 1.0 },
    C: { name: "经济型", battery_ratio: 0.4 }
};

let roofPlaneCount = 1;

function addRoofPlane() {
    const container = document.getElementById('roofPlanesContainer');
    const newPlane = document.createElement('div');
    newPlane.className = 'roof-plane-input';
    newPlane.innerHTML = `
        <h3 style="margin-top: 15px;">屋顶坡面 ${roofPlaneCount + 1}</h3>
        <div class="form-grid">
            <div class="form-group">
                <label>坡面ID</label>
                <input type="text" name="plane_id_${roofPlaneCount}" value="${String.fromCharCode(65 + roofPlaneCount)}" required>
            </div>
            <div class="form-group">
                <label>方位角 (0=北, 90=东, 180=南, 270=西)</label>
                <input type="number" name="azimuth_${roofPlaneCount}" value="90" required>
            </div>
            <div class="form-group">
                <label>倾角 (度)</label>
                <input type="number" name="tilt_${roofPlaneCount}" value="20" required>
            </div>
            <div class="form-group">
                <label>最大面板数</label>
                <input type="number" name="max_panels_${roofPlaneCount}" value="8" required>
            </div>
            <div class="form-group">
                <label>效率评分 (0-1)</label>
                <input type="number" step="0.01" name="efficiency_${roofPlaneCount}" value="0.85" required>
            </div>
        </div>
    `;
    container.appendChild(newPlane);
    roofPlaneCount++;
}

function switchStrategy(strategy) {
    document.querySelectorAll('.strategy-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.strategy-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById('strategy' + strategy).classList.add('active');
}


// 第一步：负荷分析
function step1_analyzeLoad(userInput, hourlyRatios) {
    const annualKwh = parseFloat(userInput.annual_usage_kwh);
    const dailyAvgKwh = annualKwh / 365.0;
    
    // 夜间用电 (18:00 - 06:00)
    const nightHoursIndices = [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
    const nightRatioSum = nightHoursIndices.reduce((sum, i) => sum + hourlyRatios[i], 0);
    const nightlyConsumptionKwh = dailyAvgKwh * nightRatioSum;
    
    // 峰值功率
    const maxHourlyRatio = Math.max(...hourlyRatios);
    const maxHourlyKwh = dailyAvgKwh * maxHourlyRatio;
    const peakPowerKw = maxHourlyKwh * 1.5;
    
    return {
        dailyAvgKwh,
        nightlyConsumptionKwh,
        peakPowerKw,
        nightRatioSum,
        maxHourlyRatio
    };
}

// 第二步:电池定容
function step2_sizeBattery(loadAnalysis, strategyType) {
    const nightlyLoad = loadAnalysis.nightlyConsumptionKwh;
    const ratio = STRATEGY_CONFIG[strategyType].battery_ratio;
    
    const targetCapacity = nightlyLoad * ratio;
    
    const standardBatteries = [5.0, 9.6, 13.5, 19.2];
    let selectedBatteryKwh = 5.0;
    
    for (let bat of standardBatteries) {
        if (bat >= targetCapacity * 0.9) {
            selectedBatteryKwh = bat;
            break;
        }
    }
    
    if (targetCapacity > standardBatteries[standardBatteries.length - 1]) {
        selectedBatteryKwh = standardBatteries[standardBatteries.length - 1];
    }
    
    return {
        targetCapacity,
        selectedBatteryKwh,
        ratio
    };
}

// 第三步：逆变器选型
function step3_selectInverter(batteryKwh, peakLoadKw) {
    const minInverterKwByBattery = batteryKwh * 0.5;
    const standardInverters = [5.0, 6.0, 8.0, 10.0];
    
    const targetInverterKw = Math.max(minInverterKwByBattery, peakLoadKw * 0.7);
    
    let selectedInverterKw = 5.0;
    for (let inv of standardInverters) {
        if (inv >= targetInverterKw) {
            selectedInverterKw = inv;
            break;
        }
    }
    
    if (selectedInverterKw > 10.0) {
        selectedInverterKw = 10.0;
    }
    
    return {
        minInverterKwByBattery,
        targetInverterKw,
        selectedInverterKw
    };
}

// 第四步：光伏反推
function step4_calculateTargetPV(inverterKw, batteryKwh, panelWatts) {
    const dcAcRatio = batteryKwh < 7.0 ? 1.5 : 1.8;
    const targetDcKw = inverterKw * dcAcRatio;
    const targetPanelCount = Math.ceil((targetDcKw * 1000) / panelWatts);
    
    return {
        targetDcKw,
        targetPanelCount,
        appliedRatio: dcAcRatio
    };
}

// 第五步：物理校验与排布
function step5_physicalLayout(targetPanelCount, roofPlanes, panelSpecs, inverterSpecs) {
    const sortedPlanes = [...roofPlanes].sort((a, b) => b.efficiency - a.efficiency);
    
    let remainingPanelsToInstall = targetPanelCount;
    const installedPanelsPerPlane = {};
    
    for (let plane of sortedPlanes) {
        const planeId = plane.plane_id;
        const maxCapacity = plane.max_panels;
        
        if (remainingPanelsToInstall > 0) {
            const installOnThisPlane = Math.min(remainingPanelsToInstall, maxCapacity);
            installedPanelsPerPlane[planeId] = installOnThisPlane;
            remainingPanelsToInstall -= installOnThisPlane;
        } else {
            installedPanelsPerPlane[planeId] = 0;
        }
    }
    
    const minPanelsPerString = Math.ceil(inverterSpecs.v_start / panelSpecs.v_mp);
    
    let finalTotalPanels = 0;
    const finalLayout = {};
    const removedPlanes = [];
    
    for (let [planeId, count] of Object.entries(installedPanelsPerPlane)) {
        if (count > 0 && count < minPanelsPerString) {
            finalLayout[planeId] = 0;
            removedPlanes.push({ planeId, count, reason: '数量不足启动电压要求' });
        } else {
            finalLayout[planeId] = count;
            finalTotalPanels += count;
        }
    }
    
    const finalSystemKw = (finalTotalPanels * panelSpecs.watts) / 1000.0;
    
    return {
        finalPanelCount: finalTotalPanels,
        finalSystemKw,
        layoutDetail: finalLayout,
        minPanelsPerString,
        removedPlanes
    };
}


// 主计算函数
function generateSolarProposal(userInput, roofData, panelSpecs, inverterSpecs, strategy) {
    const state = userInput.state;
    const hourlyRatios = STATE_DATA.hourlyRatios[state];
    
    // 第1步：负荷分析
    const loadData = step1_analyzeLoad(userInput, hourlyRatios);
    
    // 第2步：电池定容
    const batteryData = step2_sizeBattery(loadData, strategy);
    
    // 第3步：逆变器选型
    const inverterData = step3_selectInverter(batteryData.selectedBatteryKwh, loadData.peakPowerKw);
    
    // 第4步：光伏反推
    const targetPVData = step4_calculateTargetPV(inverterData.selectedInverterKw, batteryData.selectedBatteryKwh, panelSpecs.watts);
    
    // 第5步：物理校验
    const finalSystem = step5_physicalLayout(targetPVData.targetPanelCount, roofData, panelSpecs, inverterSpecs);
    
    return {
        strategy: STRATEGY_CONFIG[strategy].name,
        step1: loadData,
        step2: batteryData,
        step3: inverterData,
        step4: targetPVData,
        step5: finalSystem
    };
}

// 生成结果HTML
function generateResultHTML(result, strategy) {
    const { step1, step2, step3, step4, step5 } = result;
    
    return `
        <div class="step-header">第1步：负荷分析 (Load Analysis)</div>
        <div class="calc-step">
            <div class="calc-step-title">📊 计算夜间用电量和峰值功率</div>
            <div class="calc-detail">
                <div class="formula">日均用电 = 年用电 ÷ 365 = ${step1.dailyAvgKwh.toFixed(2)} kWh/天</div>
                <div class="formula">夜间比例 (18:00-06:00) = ${(step1.nightRatioSum * 100).toFixed(2)}%</div>
                <div class="formula">夜间用电 = ${step1.dailyAvgKwh.toFixed(2)} × ${(step1.nightRatioSum * 100).toFixed(2)}% = ${step1.nightlyConsumptionKwh.toFixed(2)} kWh</div>
                <div class="formula">最大小时比例 = ${(step1.maxHourlyRatio * 100).toFixed(2)}%</div>
                <div class="formula">峰值功率 = ${step1.dailyAvgKwh.toFixed(2)} × ${(step1.maxHourlyRatio * 100).toFixed(2)}% × 1.5 = ${step1.peakPowerKw.toFixed(2)} kW</div>
            </div>
        </div>

        <div class="step-header">第2步：电池定容 (Battery Sizing)</div>
        <div class="calc-step">
            <div class="calc-step-title">🔋 根据${result.strategy}策略配置电池</div>
            <div class="calc-detail">
                <div class="formula">策略系数 = ${step2.ratio}</div>
                <div class="formula">目标容量 = 夜间用电 × 策略系数 = ${step1.nightlyConsumptionKwh.toFixed(2)} × ${step2.ratio} = ${step2.targetCapacity.toFixed(2)} kWh</div>
                <div class="formula">标准电池库: [5.0, 9.6, 13.5, 19.2] kWh</div>
                <div class="formula"><strong>✅ 选定电池容量 = ${step2.selectedBatteryKwh} kWh</strong></div>
            </div>
        </div>

        <div class="step-header">第3步：逆变器选型 (Inverter Selection)</div>
        <div class="calc-step">
            <div class="calc-step-title">⚡ 选择单相混合逆变器</div>
            <div class="calc-detail">
                <div class="formula">电池充放电功率需求 = 电池容量 × 0.5C = ${step2.selectedBatteryKwh} × 0.5 = ${step3.minInverterKwByBattery.toFixed(2)} kW</div>
                <div class="formula">峰值负载覆盖 = 峰值功率 × 0.7 = ${step1.peakPowerKw.toFixed(2)} × 0.7 = ${(step1.peakPowerKw * 0.7).toFixed(2)} kW</div>
                <div class="formula">目标逆变器功率 = max(${step3.minInverterKwByBattery.toFixed(2)}, ${(step1.peakPowerKw * 0.7).toFixed(2)}) = ${step3.targetInverterKw.toFixed(2)} kW</div>
                <div class="formula">标准逆变器库: [5.0, 6.0, 8.0, 10.0] kW</div>
                <div class="formula"><strong>✅ 选定逆变器功率 = ${step3.selectedInverterKw} kW (单相上限10kW)</strong></div>
            </div>
        </div>

        <div class="step-header">第4步：光伏反推 (Target PV Sizing)</div>
        <div class="calc-step">
            <div class="calc-step-title">☀️ 计算理想光伏板数量</div>
            <div class="calc-detail">
                <div class="formula">容配比 (DC/AC Ratio) = ${step4.appliedRatio} ${step2.selectedBatteryKwh < 7 ? '(电池<7kWh)' : '(电池≥7kWh, 澳洲黄金配置)'}</div>
                <div class="formula">目标光伏功率 = 逆变器功率 × 容配比 = ${step3.selectedInverterKw} × ${step4.appliedRatio} = ${step4.targetDcKw.toFixed(2)} kW</div>
                <div class="formula">目标面板数量 = ${step4.targetDcKw.toFixed(2)} kW × 1000 ÷ 440W = ${step4.targetPanelCount} 块</div>
                <div class="formula"><strong>✅ 理想配置 = ${step4.targetPanelCount} 块面板 (${step4.targetDcKw.toFixed(2)} kW)</strong></div>
            </div>
        </div>

        <div class="step-header">第5步：物理校验与排布 (Physical Roof Check)</div>
        <div class="calc-step">
            <div class="calc-step-title">🏠 屋顶实际排布与电压校验</div>
            <div class="calc-detail">
                <div class="formula">最小启动串数 = 启动电压 ÷ 面板电压 = 100V ÷ 32V = ${step5.minPanelsPerString} 块</div>
                <div style="margin-top: 10px;"><strong>各坡面排布结果：</strong></div>
                ${Object.entries(step5.layoutDetail).map(([planeId, count]) => 
                    `<div class="roof-plane">坡面 ${planeId}: ${count} 块面板 ${count === 0 ? '❌' : '✅'}</div>`
                ).join('')}
                ${step5.removedPlanes.length > 0 ? `
                    <div style="margin-top: 10px; color: #d32f2f;">
                        <strong>⚠️ 移除的坡面：</strong><br>
                        ${step5.removedPlanes.map(p => `坡面 ${p.planeId}: 原计划${p.count}块，${p.reason}`).join('<br>')}
                    </div>
                ` : ''}
                <div class="formula" style="margin-top: 10px;"><strong>✅ 最终实装 = ${step5.finalPanelCount} 块面板</strong></div>
                <div class="formula"><strong>✅ 最终系统容量 = ${step5.finalSystemKw.toFixed(2)} kW</strong></div>
            </div>
        </div>

        <div class="final-result">
            <div style="margin-bottom: 10px;">🎯 ${result.strategy} 最终配置方案</div>
            <div style="font-size: 16px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; text-align: left;">
                <div>☀️ 光伏系统: ${step5.finalSystemKw.toFixed(2)} kW (${step5.finalPanelCount}块)</div>
                <div>⚡ 逆变器: ${step3.selectedInverterKw} kW</div>
                <div>🔋 电池容量: ${step2.selectedBatteryKwh} kWh</div>
                <div>📊 容配比: ${step4.appliedRatio}</div>
            </div>
        </div>
    `;
}


// 表单提交处理
document.getElementById('calcForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // 收集用户输入
    const userInput = {
        annual_usage_kwh: formData.get('annual_usage_kwh'),
        state: formData.get('state'),
        postcode: formData.get('postcode')
    };
    
    // 收集屋顶数据
    const roofPlanes = [];
    for (let i = 0; i <= roofPlaneCount; i++) {
        if (formData.get(`plane_id_${i}`)) {
            roofPlanes.push({
                plane_id: formData.get(`plane_id_${i}`),
                azimuth: parseFloat(formData.get(`azimuth_${i}`)),
                tilt: parseFloat(formData.get(`tilt_${i}`)),
                max_panels: parseInt(formData.get(`max_panels_${i}`)),
                efficiency: parseFloat(formData.get(`efficiency_${i}`))
            });
        }
    }
    
    // 硬件参数
    const panelSpecs = {
        watts: parseFloat(formData.get('panel_watts')),
        v_mp: parseFloat(formData.get('panel_v_mp'))
    };
    
    const inverterSpecs = {
        v_start: parseFloat(formData.get('inverter_v_start')),
        max_single_phase_kw: parseFloat(formData.get('max_single_phase_kw'))
    };
    
    // 计算三个方案
    const resultA = generateSolarProposal(userInput, roofPlanes, panelSpecs, inverterSpecs, 'A');
    const resultB = generateSolarProposal(userInput, roofPlanes, panelSpecs, inverterSpecs, 'B');
    const resultC = generateSolarProposal(userInput, roofPlanes, panelSpecs, inverterSpecs, 'C');
    
    // 显示结果
    document.getElementById('strategyA').innerHTML = generateResultHTML(resultA, 'A');
    document.getElementById('strategyB').innerHTML = generateResultHTML(resultB, 'B');
    document.getElementById('strategyC').innerHTML = generateResultHTML(resultC, 'C');
    
    // 成本配置（从配置TAB或使用默认值）
    const costConfig = {
        state: userInput.state,
        postcode: userInput.postcode,
        panel_price_per_kw: parseFloat(document.getElementById('config_panel_price_per_kw')?.value || 540),
        inverter_price_per_kw: parseFloat(document.getElementById('config_inverter_price_per_kw')?.value || 280),
        battery_price_per_kwh: parseFloat(document.getElementById('config_battery_price_per_kwh')?.value || 865),
        gst_rate: parseFloat(document.getElementById('config_gst_rate')?.value || 0.1),
        deeming_period: parseFloat(document.getElementById('config_deeming_period')?.value || 6),
        pv_stc_price: parseFloat(document.getElementById('config_pv_stc_price')?.value || 39),
        battery_stc_factor: parseFloat(document.getElementById('config_battery_stc_factor')?.value || 9.3),
        battery_stc_price: parseFloat(document.getElementById('config_battery_stc_price')?.value || 39),
        vic_rebate: parseFloat(document.getElementById('config_vic_rebate')?.value || 1400),
        vic_loan: parseFloat(document.getElementById('config_vic_loan')?.value || 1400),
        nsw_prc_price: parseFloat(document.getElementById('config_nsw_prc_price')?.value || 1.65),
        network_loss_factor: parseFloat(document.getElementById('config_network_loss_factor')?.value || 1.05),
        enable_vic_rebate: false,
        enable_nsw_vpp: false
    };
    
    // 计算成本和补贴
    const costA = calculateCostAndSubsidy(resultA, costConfig);
    const costB = calculateCostAndSubsidy(resultB, costConfig);
    const costC = calculateCostAndSubsidy(resultC, costConfig);
    
    // 显示成本计算结果
    let costHTML = '<div class="strategy-tabs">';
    costHTML += '<button class="strategy-tab active" onclick="switchCostStrategy(\'A\')">方案A - 高端型</button>';
    costHTML += '<button class="strategy-tab" onclick="switchCostStrategy(\'B\')">方案B - 平衡型</button>';
    costHTML += '<button class="strategy-tab" onclick="switchCostStrategy(\'C\')">方案C - 经济型</button>';
    costHTML += '</div>';
    costHTML += '<div id="costStrategyA" class="strategy-content active">' + generateCostResultHTML(costA, '方案A - 高端型') + '</div>';
    costHTML += '<div id="costStrategyB" class="strategy-content">' + generateCostResultHTML(costB, '方案B - 平衡型') + '</div>';
    costHTML += '<div id="costStrategyC" class="strategy-content">' + generateCostResultHTML(costC, '方案C - 经济型') + '</div>';
    
    document.getElementById('costResults').innerHTML = costHTML;
    document.getElementById('costResults').style.display = 'block';
    document.getElementById('costResultsPlaceholder').style.display = 'none';
    
    document.getElementById('results').style.display = 'block';
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
});

// 成本计算TAB中的策略切换
function switchCostStrategy(strategy) {
    document.querySelectorAll('#costResults .strategy-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('#costResults .strategy-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById('costStrategy' + strategy).classList.add('active');
}

// ==================== 配置TAB功能 ====================

// 主TAB切换
function switchMainTab(tabName) {
    document.querySelectorAll('.main-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.main-tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // 如果切换到配置TAB，初始化配置数据
    if (tabName === 'config' && !window.configInitialized) {
        initConfigTab();
        window.configInitialized = true;
    }
}

// 配置数据
const CONFIG_STATE_ANNUAL_USAGE = {
    TAS: 10148, NT: 10008, ACT: 8632, SA: 7129,
    NSW: 7778, QLD: 7270, WA: 7634, VIC: 6778
};

const CONFIG_STATE_POSTCODES = {
    NSW: "2000", VIC: "3000", QLD: "4000", SA: "5000",
    WA: "6000", TAS: "7000", NT: "0800", ACT: "2600"
};

const CONFIG_MONTHLY_RATIOS = {
    TAS: [0.0855, 0.0778, 0.0751, 0.0714, 0.0847, 0.1055, 0.1067, 0.0945, 0.0736, 0.0721, 0.0730, 0.0803],
    NT: [0.0855, 0.0778, 0.0751, 0.0714, 0.0847, 0.1055, 0.1067, 0.0945, 0.0736, 0.0721, 0.0730, 0.0803],
    ACT: [0.0855, 0.0778, 0.0751, 0.0714, 0.0847, 0.1055, 0.1067, 0.0945, 0.0736, 0.0721, 0.0730, 0.0803],
    SA: [0.0855, 0.0778, 0.0751, 0.0714, 0.0847, 0.1055, 0.1067, 0.0945, 0.0736, 0.0721, 0.0730, 0.0803],
    NSW: [0.0855, 0.0778, 0.0751, 0.0714, 0.0847, 0.1055, 0.1067, 0.0945, 0.0736, 0.0721, 0.0730, 0.0803],
    QLD: [0.0927, 0.0922, 0.0869, 0.0814, 0.0790, 0.0823, 0.0819, 0.0793, 0.0760, 0.0767, 0.0819, 0.0896],
    WA: [0.0855, 0.0778, 0.0751, 0.0714, 0.0847, 0.1055, 0.1067, 0.0945, 0.0736, 0.0721, 0.0730, 0.0803],
    VIC: [0.0855, 0.0778, 0.0751, 0.0714, 0.0847, 0.1055, 0.1067, 0.0945, 0.0736, 0.0721, 0.0730, 0.0803]
};

const CONFIG_HOURLY_RATIOS = {
    TAS: [0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.03941, 0.03941],
    NT: [0.02990, 0.02638, 0.02405, 0.02319, 0.02396, 0.02745, 0.03486, 0.04163, 0.04270, 0.04255, 0.04252, 0.04348, 0.04421, 0.04440, 0.04486, 0.04667, 0.05074, 0.05727, 0.06229, 0.05996, 0.05621, 0.04970, 0.04421, 0.03679],
    ACT: [0.03400, 0.03031, 0.02876, 0.02867, 0.03055, 0.03643, 0.04493, 0.04904, 0.04317, 0.03792, 0.03615, 0.03118, 0.03053, 0.02937, 0.03003, 0.03369, 0.04434, 0.05901, 0.06693, 0.06550, 0.06142, 0.05416, 0.05178, 0.04208],
    SA: [0.04850, 0.05185, 0.03814, 0.02956, 0.02568, 0.02654, 0.03142, 0.03655, 0.03563, 0.03624, 0.04103, 0.04366, 0.04188, 0.03980, 0.03997, 0.04111, 0.04525, 0.05442, 0.05990, 0.05715, 0.05315, 0.04739, 0.03905, 0.03607],
    NSW: [0.04427, 0.03912, 0.03176, 0.02706, 0.02583, 0.02805, 0.03427, 0.03939, 0.04089, 0.04050, 0.03986, 0.03936, 0.03948, 0.03908, 0.03920, 0.04105, 0.04569, 0.05328, 0.05846, 0.05634, 0.05329, 0.04947, 0.04804, 0.04630],
    QLD: [0.02990, 0.02638, 0.02405, 0.02319, 0.02396, 0.02745, 0.03486, 0.04163, 0.04270, 0.04255, 0.04252, 0.04348, 0.04421, 0.04440, 0.04486, 0.04667, 0.05074, 0.05727, 0.06229, 0.05996, 0.05621, 0.04970, 0.04421, 0.03679],
    WA: [0.02990, 0.02638, 0.02405, 0.02319, 0.02396, 0.02745, 0.03486, 0.04163, 0.04270, 0.04255, 0.04252, 0.04348, 0.04421, 0.04440, 0.04486, 0.04667, 0.05074, 0.05727, 0.06229, 0.05996, 0.05621, 0.04970, 0.04421, 0.03679],
    VIC: [0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.03941, 0.03941]
};

// 初始化配置TAB
function initConfigTab() {
    renderMonthlyRatiosTable();
    renderHourlyRatiosTable();
}

// 渲染月度比例表格
function renderMonthlyRatiosTable() {
    const table = document.getElementById('monthlyRatiosTable');
    const states = ['TAS', 'NT', 'ACT', 'SA', 'NSW', 'QLD', 'WA', 'VIC'];
    
    let html = '<thead><tr><th>州</th>';
    for (let i = 1; i <= 12; i++) {
        html += `<th>${i}月</th>`;
    }
    html += '</tr></thead><tbody>';
    
    states.forEach(state => {
        const ratios = CONFIG_MONTHLY_RATIOS[state];
        html += `<tr><td><strong>${state}</strong></td>`;
        ratios.forEach((ratio, idx) => {
            html += `<td><input type="number" step="0.0001" value="${ratio.toFixed(4)}" id="monthly_${state}_${idx}"></td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody>';
    table.innerHTML = html;
}

// 渲染小时比例表格
function renderHourlyRatiosTable() {
    const table = document.getElementById('hourlyRatiosTable');
    const states = ['TAS', 'NT', 'ACT', 'SA', 'NSW', 'QLD', 'WA', 'VIC'];
    
    let html = '<thead><tr><th>州</th>';
    for (let i = 0; i < 24; i++) {
        html += `<th>${i}h</th>`;
    }
    html += '</tr></thead><tbody>';
    
    states.forEach(state => {
        const ratios = CONFIG_HOURLY_RATIOS[state];
        html += `<tr><td><strong>${state}</strong></td>`;
        ratios.forEach((ratio, idx) => {
            html += `<td><input type="number" step="0.00001" value="${ratio.toFixed(5)}" id="hourly_${state}_${idx}"></td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody>';
    table.innerHTML = html;
}


// 导出配置
function exportConfig() {
    const config = collectAllConfig();
    const json = JSON.stringify(config, null, 2);
    
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solar-config.json';
    a.click();
    URL.revokeObjectURL(url);
    
    alert('✅ 配置已导出为 solar-config.json');
}

// 收集所有配置
function collectAllConfig() {
    const states = ['TAS', 'NT', 'ACT', 'SA', 'NSW', 'QLD', 'WA', 'VIC'];
    
    const annualUsage = {};
    states.forEach(state => {
        annualUsage[state] = parseFloat(document.getElementById(`annual_${state}`).value);
    });
    
    const monthlyRatios = {};
    states.forEach(state => {
        monthlyRatios[state] = [];
        for (let i = 0; i < 12; i++) {
            monthlyRatios[state].push(parseFloat(document.getElementById(`monthly_${state}_${i}`).value));
        }
    });
    
    const hourlyRatios = {};
    states.forEach(state => {
        hourlyRatios[state] = [];
        for (let i = 0; i < 24; i++) {
            hourlyRatios[state].push(parseFloat(document.getElementById(`hourly_${state}_${i}`).value));
        }
    });
    
    return {
        state_data: {
            annual_usage: annualUsage,
            monthly_ratios: monthlyRatios,
            hourly_ratios: hourlyRatios
        },
        hardware: {
            panel: {
                watts: parseFloat(document.getElementById('config_panel_watts').value),
                v_mp: parseFloat(document.getElementById('config_panel_v_mp').value),
                v_oc: parseFloat(document.getElementById('config_panel_v_oc').value),
                i_mp: parseFloat(document.getElementById('config_panel_i_mp').value)
            },
            inverter: {
                v_start: parseFloat(document.getElementById('config_inverter_v_start').value),
                v_max: parseFloat(document.getElementById('config_inverter_v_max').value),
                max_single_phase_kw: parseFloat(document.getElementById('config_inverter_max_single_phase_kw').value),
                max_three_phase_kw: parseFloat(document.getElementById('config_inverter_max_three_phase_kw').value)
            },
            battery: {
                standard_capacities: document.getElementById('config_battery_standard_capacities').value.split(',').map(s => parseFloat(s.trim())),
                dod: parseFloat(document.getElementById('config_battery_dod').value),
                rte: parseFloat(document.getElementById('config_battery_rte').value),
                c_rate: parseFloat(document.getElementById('config_battery_c_rate').value)
            }
        },
        strategies: {
            A: {
                name: document.getElementById('strategy_a_name').value,
                battery_ratio: parseFloat(document.getElementById('strategy_a_ratio').value)
            },
            B: {
                name: document.getElementById('strategy_b_name').value,
                battery_ratio: parseFloat(document.getElementById('strategy_b_ratio').value)
            },
            C: {
                name: document.getElementById('strategy_c_name').value,
                battery_ratio: parseFloat(document.getElementById('strategy_c_ratio').value)
            }
        },
        cost: {
            panel_price_per_kw: parseFloat(document.getElementById('config_panel_price_per_kw').value),
            inverter_price_per_kw: parseFloat(document.getElementById('config_inverter_price_per_kw').value),
            battery_price_per_kwh: parseFloat(document.getElementById('config_battery_price_per_kwh').value),
            gst_rate: parseFloat(document.getElementById('config_gst_rate').value)
        },
        subsidy: {
            deeming_period: parseFloat(document.getElementById('config_deeming_period').value),
            pv_stc_price: parseFloat(document.getElementById('config_pv_stc_price').value),
            battery_stc_factor: parseFloat(document.getElementById('config_battery_stc_factor').value),
            battery_stc_price: parseFloat(document.getElementById('config_battery_stc_price').value),
            vic_rebate: parseFloat(document.getElementById('config_vic_rebate').value),
            vic_loan: parseFloat(document.getElementById('config_vic_loan').value),
            nsw_prc_price: parseFloat(document.getElementById('config_nsw_prc_price').value),
            network_loss_factor: parseFloat(document.getElementById('config_network_loss_factor').value)
        }
    };
}

// 导入配置
function importConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const config = JSON.parse(event.target.result);
                applyConfig(config);
                alert('✅ 配置已成功导入');
            } catch (error) {
                alert('❌ 配置文件格式错误：' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// 应用配置
function applyConfig(config) {
    if (config.hardware) {
        if (config.hardware.panel) {
            document.getElementById('config_panel_watts').value = config.hardware.panel.watts;
            document.getElementById('config_panel_v_mp').value = config.hardware.panel.v_mp;
            document.getElementById('config_panel_v_oc').value = config.hardware.panel.v_oc;
            document.getElementById('config_panel_i_mp').value = config.hardware.panel.i_mp;
        }
        if (config.hardware.inverter) {
            document.getElementById('config_inverter_v_start').value = config.hardware.inverter.v_start;
            document.getElementById('config_inverter_v_max').value = config.hardware.inverter.v_max;
            document.getElementById('config_inverter_max_single_phase_kw').value = config.hardware.inverter.max_single_phase_kw;
            document.getElementById('config_inverter_max_three_phase_kw').value = config.hardware.inverter.max_three_phase_kw;
        }
    }
    
    if (config.strategies) {
        document.getElementById('strategy_a_name').value = config.strategies.A.name;
        document.getElementById('strategy_a_ratio').value = config.strategies.A.battery_ratio;
        document.getElementById('strategy_b_name').value = config.strategies.B.name;
        document.getElementById('strategy_b_ratio').value = config.strategies.B.battery_ratio;
        document.getElementById('strategy_c_name').value = config.strategies.C.name;
        document.getElementById('strategy_c_ratio').value = config.strategies.C.battery_ratio;
    }
    
    if (config.cost) {
        document.getElementById('config_panel_price_per_kw').value = config.cost.panel_price_per_kw;
        document.getElementById('config_inverter_price_per_kw').value = config.cost.inverter_price_per_kw;
        document.getElementById('config_battery_price_per_kwh').value = config.cost.battery_price_per_kwh;
        document.getElementById('config_gst_rate').value = config.cost.gst_rate;
    }
    
    if (config.subsidy) {
        document.getElementById('config_deeming_period').value = config.subsidy.deeming_period;
        document.getElementById('config_pv_stc_price').value = config.subsidy.pv_stc_price;
        document.getElementById('config_battery_stc_factor').value = config.subsidy.battery_stc_factor;
        document.getElementById('config_battery_stc_price').value = config.subsidy.battery_stc_price;
        document.getElementById('config_vic_rebate').value = config.subsidy.vic_rebate;
        document.getElementById('config_vic_loan').value = config.subsidy.vic_loan;
        document.getElementById('config_nsw_prc_price').value = config.subsidy.nsw_prc_price;
        document.getElementById('config_network_loss_factor').value = config.subsidy.network_loss_factor;
    }
}

// 应用到计算器
function applyConfigToCalculator() {
    const config = collectAllConfig();
    localStorage.setItem('solarCalculatorConfig', JSON.stringify(config));
    alert('✅ 配置已保存，将自动应用到计算器');
    
    // 切换回计算器TAB
    switchMainTab('calculator');
}

// 恢复默认值
function resetConfigDefaults() {
    if (confirm('确定要恢复所有默认值吗？')) {
        location.reload();
    }
}

// ==================== 成本和补贴计算 ====================

// Postcode到Zone Rating的映射（澳洲STC区域）
const POSTCODE_ZONE_RATING = {
    // Zone 1 (1.622)
    'Zone1': 1.622,
    // Zone 2 (1.536)
    'Zone2': 1.536,
    // Zone 3 (1.382) - 大部分NSW, VIC, SA, TAS
    'Zone3': 1.382,
    // Zone 4 (1.185) - 大部分QLD, WA, NT
    'Zone4': 1.185
};

// 根据州和邮编获取Zone Rating
function getZoneRatingByPostcode(state, postcode) {
    // 简化映射规则
    if (state === 'QLD' || state === 'WA' || state === 'NT') {
        return POSTCODE_ZONE_RATING.Zone4; // 1.185
    } else if (state === 'NSW' || state === 'VIC' || state === 'SA' || state === 'TAS' || state === 'ACT') {
        return POSTCODE_ZONE_RATING.Zone3; // 1.382
    }
    return POSTCODE_ZONE_RATING.Zone3; // 默认
}

// 成本和补贴计算
function calculateCostAndSubsidy(systemResult, config) {
    const result = {
        costs: {},
        subsidies: {},
        steps: []
    };
    
    const state = config.state || 'NSW';
    const postcode = config.postcode || '2000';
    const zoneRating = getZoneRatingByPostcode(state, postcode);
    
    // 成本计算
    result.steps.push({
        title: '💰 成本计算',
        details: []
    });
    
    const panelPrice = systemResult.step5.finalSystemKw * (config.panel_price_per_kw || 540);
    result.costs.panel = panelPrice;
    result.steps[0].details.push(
        `<strong>面板成本：</strong>`,
        `  面板容量 = ${systemResult.step5.finalSystemKw.toFixed(2)} kW`,
        `  单价 = ${config.panel_price_per_kw || 540} AUD/kW`,
        `  面板报价 = ${systemResult.step5.finalSystemKw.toFixed(2)} × ${config.panel_price_per_kw || 540} = ${panelPrice.toFixed(2)} AUD`
    );
    
    const inverterPrice = systemResult.step3.selectedInverterKw * (config.inverter_price_per_kw || 280);
    result.costs.inverter = inverterPrice;
    result.steps[0].details.push(
        `<strong>逆变器成本：</strong>`,
        `  逆变器功率 = ${systemResult.step3.selectedInverterKw} kW`,
        `  单价 = ${config.inverter_price_per_kw || 280} AUD/kW`,
        `  逆变器报价 = ${systemResult.step3.selectedInverterKw} × ${config.inverter_price_per_kw || 280} = ${inverterPrice.toFixed(2)} AUD`
    );
    
    const batteryPrice = systemResult.step2.selectedBatteryKwh * (config.battery_price_per_kwh || 865);
    result.costs.battery = batteryPrice;
    result.steps[0].details.push(
        `<strong>电池成本：</strong>`,
        `  电池容量 = ${systemResult.step2.selectedBatteryKwh} kWh`,
        `  单价 = ${config.battery_price_per_kwh || 865} AUD/kWh`,
        `  电池报价 = ${systemResult.step2.selectedBatteryKwh} × ${config.battery_price_per_kwh || 865} = ${batteryPrice.toFixed(2)} AUD`
    );
    
    const preTaxTotal = panelPrice + inverterPrice + batteryPrice;
    result.costs.preTaxTotal = preTaxTotal;
    result.steps[0].details.push(
        `<strong>税前整体报价 = ${panelPrice.toFixed(2)} + ${inverterPrice.toFixed(2)} + ${batteryPrice.toFixed(2)} = ${preTaxTotal.toFixed(2)} AUD</strong>`
    );
    
    const gstRate = config.gst_rate || 0.1;
    const gst = preTaxTotal * gstRate;
    const systemTotal = preTaxTotal + gst;
    result.costs.gst = gst;
    result.costs.systemTotal = systemTotal;
    result.steps[0].details.push(
        `<strong>GST计算：</strong>`,
        `  GST = ${preTaxTotal.toFixed(2)} × ${gstRate} = ${gst.toFixed(2)} AUD`,
        `  <strong>含税报价 = ${preTaxTotal.toFixed(2)} + ${gst.toFixed(2)} = ${systemTotal.toFixed(2)} AUD</strong>`
    );
    
    // 补贴计算
    result.steps.push({
        title: '�� 补贴计算',
        details: []
    });
    
    result.steps[1].details.push(
        `<strong>Zone Rating查询：</strong>`,
        `  州: ${state}`,
        `  邮编: ${postcode}`,
        `  Zone Rating = ${zoneRating}`
    );
    
    let totalSubsidy = 0;
    
    // STC PV Rebate
    const deemingPeriod = config.deeming_period || 6;
    const pvStcPrice = config.pv_stc_price || 39;
    const pvStcQty = systemResult.step5.finalSystemKw * zoneRating * deemingPeriod;
    const pvStcRebate = pvStcQty * pvStcPrice;
    result.subsidies.pvStc = pvStcRebate;
    totalSubsidy += pvStcRebate;
    result.steps[1].details.push(
        `<strong>STC PV Rebate：</strong>`,
        `  PV_STC数量 = ${systemResult.step5.finalSystemKw.toFixed(2)} kW × ${zoneRating} × ${deemingPeriod} 年 = ${pvStcQty.toFixed(2)}`,
        `  STC PV Rebate = ${pvStcQty.toFixed(2)} × ${pvStcPrice} AUD = ${pvStcRebate.toFixed(2)} AUD`
    );
    
    // STC Battery Rebate (假设可用容量=标称容量×0.9)
    const usableBatteryCapacity = systemResult.step2.selectedBatteryKwh * 0.9;
    const batteryStcFactor = config.battery_stc_factor || 9.3;
    const batteryStcPrice = config.battery_stc_price || 39;
    const batteryStcQty = Math.floor(usableBatteryCapacity * batteryStcFactor);
    const batteryStcRebate = batteryStcQty * batteryStcPrice;
    result.subsidies.batteryStc = batteryStcRebate;
    totalSubsidy += batteryStcRebate;
    result.steps[1].details.push(
        `<strong>STC Battery Rebate：</strong>`,
        `  可用电池容量 = ${systemResult.step2.selectedBatteryKwh} × 0.9 = ${usableBatteryCapacity.toFixed(2)} kWh`,
        `  Battery STC数量 = floor(${usableBatteryCapacity.toFixed(2)} × ${batteryStcFactor}) = ${batteryStcQty}`,
        `  STC Battery Rebate = ${batteryStcQty} × ${batteryStcPrice} AUD = ${batteryStcRebate.toFixed(2)} AUD`
    );
    
    // VIC州补贴（可选）
    if (state === 'VIC' && config.enable_vic_rebate) {
        const vicRebate = config.vic_rebate || 1400;
        const vicLoan = config.vic_loan || 1400;
        result.subsidies.vicRebate = vicRebate;
        result.subsidies.vicLoan = vicLoan;
        totalSubsidy += vicRebate + vicLoan;
        result.steps[1].details.push(
            `<strong>VIC州补贴：</strong>`,
            `  Solar VIC Rebate = ${vicRebate.toFixed(2)} AUD`,
            `  Solar VIC Interest Free Loan = ${vicLoan.toFixed(2)} AUD`
        );
    }
    
    // NSW VPP补贴（可选）
    if (state === 'NSW' && config.enable_nsw_vpp && usableBatteryCapacity >= 2 && usableBatteryCapacity <= 28) {
        const demandResponse = usableBatteryCapacity * 0.0734;
        const peakResponse = demandResponse * 0.8;
        const peakReduction = peakResponse * 6 * 6;
        const networkLossFactor = config.network_loss_factor || 1.05;
        const prcQty = Math.floor(peakReduction * networkLossFactor * 10);
        const nswPrcPrice = config.nsw_prc_price || 1.65;
        const nswRebate = prcQty * nswPrcPrice;
        result.subsidies.nswVpp = nswRebate;
        totalSubsidy += nswRebate;
        result.steps[1].details.push(
            `<strong>NSW VPP Rebate：</strong>`,
            `  需求响应分量 = ${usableBatteryCapacity.toFixed(2)} × 0.0734 = ${demandResponse.toFixed(4)} kW`,
            `  峰值需求响应能力 = ${demandResponse.toFixed(4)} × 0.8 = ${peakResponse.toFixed(4)} kW`,
            `  峰值减排容量 = ${peakResponse.toFixed(4)} × 6小时 × 6年 = ${peakReduction.toFixed(4)} kWh`,
            `  PRC数量 = floor(${peakReduction.toFixed(4)} × ${networkLossFactor} × 10) = ${prcQty}`,
            `  NSW VPP Rebate = ${prcQty} × ${nswPrcPrice} AUD = ${nswRebate.toFixed(2)} AUD`
        );
    }
    
    result.subsidies.total = totalSubsidy;
    result.steps[1].details.push(
        `<strong>补贴总计 = ${totalSubsidy.toFixed(2)} AUD</strong>`
    );
    
    // 最终报价
    result.steps.push({
        title: '💵 最终报价',
        details: []
    });
    
    const finalPrice = systemTotal - totalSubsidy;
    result.finalPrice = finalPrice;
    result.steps[2].details.push(
        `<strong>最终报价 = 含税报价 - 补贴总计</strong>`,
        `<strong>最终报价 = ${systemTotal.toFixed(2)} - ${totalSubsidy.toFixed(2)} = ${finalPrice.toFixed(2)} AUD</strong>`
    );
    
    return result;
}

// 生成成本计算结果HTML
function generateCostResultHTML(costResult, strategy) {
    let html = `<h2>${strategy} 成本与补贴详细计算</h2>`;
    
    costResult.steps.forEach(step => {
        html += `<div class="calc-step">`;
        html += `<div class="calc-step-title">${step.title}</div>`;
        html += `<div class="calc-detail">`;
        step.details.forEach(detail => {
            html += `${detail}<br>`;
        });
        html += `</div></div>`;
    });
    
    html += `<div class="final-result">`;
    html += `最终报价：${costResult.finalPrice.toFixed(2)} AUD`;
    html += `</div>`;
    
    return html;
}

