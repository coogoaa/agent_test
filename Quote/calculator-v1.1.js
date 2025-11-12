// GS功率映射表
const GS_POWER_MAPPING = [
    { min: 0, max: 5, nominal_battery_capacity_kwh: 22.44, usable_battery_capacity_kwh: 20.2, inverter_kw: 8 },
    { min: 5, max: 7.5, nominal_battery_capacity_kwh: 22.22, usable_battery_capacity_kwh: 20, inverter_kw: 9.6 },
    { min: 7.5, max: 12, nominal_battery_capacity_kwh: 29.33, usable_battery_capacity_kwh: 26.4, inverter_kw: 9.99 },
    { min: 12, max: 20, nominal_battery_capacity_kwh: 28.04, usable_battery_capacity_kwh: 25.24, inverter_kw: 9.3 },
    { min: 20, max: 100, nominal_battery_capacity_kwh: 50.32, usable_battery_capacity_kwh: 45.29, inverter_kw: 19.50 }
];

// GD功率映射表
const GD_POWER_MAPPING = [
    { min: 0, max: 5, nominal_battery_capacity_kwh: 15.00, usable_battery_capacity_kwh: 13.50, inverter_kw: 5.00 },
    { min: 5, max: 7.5, nominal_battery_capacity_kwh: 14.82, usable_battery_capacity_kwh: 13.34, inverter_kw: 5.00 },
    { min: 7.5, max: 12, nominal_battery_capacity_kwh: 17.33, usable_battery_capacity_kwh: 15.60, inverter_kw: 7.22 },
    { min: 12, max: 20, nominal_battery_capacity_kwh: 22.22, usable_battery_capacity_kwh: 20.00, inverter_kw: 10.00 },
    { min: 20, max: 100, nominal_battery_capacity_kwh: 41.93, usable_battery_capacity_kwh: 37.74, inverter_kw: 15.00 }
];

// 查询功率映射表
function lookupPowerMapping(solarKw, batteryBrand) {
    const mapping = batteryBrand === 'GS' ? GS_POWER_MAPPING : GD_POWER_MAPPING;
    for (let row of mapping) {
        if (solarKw > row.min && solarKw <= row.max) {
            return row;
        }
    }
    return mapping[mapping.length - 1];
}

// 向上取整到0.1
function ceilingTo01(value) {
    return Math.ceil(value * 10) / 10;
}

// 标签切换
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// 表单提交
document.getElementById('calcForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const params = {};
    for (let [key, value] of formData.entries()) {
        if (key === 'enable_vic_rebate' || key === 'enable_nsw_vpp') {
            params[key] = true;
        } else {
            params[key] = isNaN(value) ? value : parseFloat(value);
        }
    }
    
    if (!params.enable_vic_rebate) params.enable_vic_rebate = false;
    if (!params.enable_nsw_vpp) params.enable_nsw_vpp = false;
    
    const resultA = calculateSinglePlan(params, 'A');
    const resultB = calculateSinglePlan(params, 'B');
    const resultC = calculateSinglePlan(params, 'C');
        
    const results = { A: resultA, B: resultB, C: resultC };
    window.lastCalculationResults = results;
    window.lastCalculationParams = params;
        
    displayABCResults(results, params);
    
    document.getElementById('results').style.display = 'block';
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
});

// 计算单个方案
function calculateSinglePlan(p, planType) {
    const result = {
        planType: planType,
        steps: [],
        system: {},
        costs: {},
        subsidies: {},
        totals: {}
    };
    
    const isNewSystem = p.project_type === 'new';
    const isVIC = p.region === 'VIC';
    const isNSW = p.region === 'NSW';
    
    let capacityFactor;
    if (!isNewSystem) {
        capacityFactor = p.battery_expansion_capacity_factor;
    } else {
        capacityFactor = planType === 'A' ? p.plan_a_capacity_factor : 
                        planType === 'B' ? p.plan_b_capacity_factor : 
                        p.plan_c_capacity_factor;
    }
    
    // 1. 光伏系统容量和面板数量
    result.steps.push({
        title: `1️⃣ 方案${planType} - 光伏系统容量和面板数量`,
        details: []
    });
    
    const panelCount = Math.floor(p.roof_max_panels * capacityFactor);
    const solarKw = panelCount * p.panel_power_kw;
    
    result.system.panelCount = panelCount;
    result.system.solarKw = solarKw;
    
    const capacityFactorType = !isNewSystem ? '储能扩容容量系数' : `方案${planType}容量系数`;
    result.steps[0].details.push(
        `使用${capacityFactorType} = ${capacityFactor}`,
        `面板数量 = floor(${p.roof_max_panels} × ${capacityFactor}) = ${panelCount} 块`,
        `光伏系统容量 = ${panelCount} × ${p.panel_power_kw} kW = ${solarKw.toFixed(2)} kW`
    );
    
    // 2. 逆变器功率
    result.steps.push({
        title: `2️⃣ 方案${planType} - 逆变器功率计算`,
        details: []
    });
    
    let inverterKw;
    if (planType === 'C') {
        inverterKw = ceilingTo01(solarKw / p.dc_ac_ratio);
        result.steps[1].details.push(
            `逆变器功率 = CEILING_TO_0.1(${solarKw.toFixed(2)} / ${p.dc_ac_ratio}) = ${inverterKw} kW`
        );
    } else {
        const batteryBrand = planType === 'A' ? 'GS' : 'GD';
        const mapping = lookupPowerMapping(solarKw, batteryBrand);
        inverterKw = mapping.inverter_kw;
        result.steps[1].details.push(
            `方案${planType}查询${batteryBrand}功率映射表，光伏容量${solarKw.toFixed(2)}kW位于区间(${mapping.min}, ${mapping.max}]kW`,
            `对应逆变器功率 = ${inverterKw} kW`
        );
    }
    
    result.system.inverterKw = inverterKw;
    
    // 3. 电池容量
    result.steps.push({
        title: `3️⃣ 方案${planType} - 电池容量计算`,
        details: []
    });
    
    let usableBatteryCapacity, nominalBatteryCapacity;
    
    if (planType === 'C') {
        const annualGenerationKwh = solarKw * p.yield_per_kw_per_year;
        const dailyEnergyToShiftKwh = (annualGenerationKwh / 365) * (p.plan_c_target_sc_rate - p.baseline_self_consumption_rate);
        usableBatteryCapacity = Math.min(dailyEnergyToShiftKwh / p.battery_rte, 50);
        nominalBatteryCapacity = usableBatteryCapacity / p.battery_dod;
        
        result.steps[2].details.push(
            `年发电量 = ${solarKw.toFixed(2)} × ${p.yield_per_kw_per_year} = ${annualGenerationKwh.toFixed(2)} kWh`,
            `日转移能量 = (${annualGenerationKwh.toFixed(2)} / 365) × (${p.plan_c_target_sc_rate} - ${p.baseline_self_consumption_rate}) = ${dailyEnergyToShiftKwh.toFixed(2)} kWh`,
            `电池可用容量 = MIN(${dailyEnergyToShiftKwh.toFixed(2)} / ${p.battery_rte}, 50) = ${usableBatteryCapacity.toFixed(2)} kWh`,
            `电池标称容量 = ${usableBatteryCapacity.toFixed(2)} / ${p.battery_dod} = ${nominalBatteryCapacity.toFixed(2)} kWh`
        );
    } else {
        const batteryBrand = planType === 'A' ? 'GS' : 'GD';
        const mapping = lookupPowerMapping(solarKw, batteryBrand);
        usableBatteryCapacity = mapping.usable_battery_capacity_kwh;
        nominalBatteryCapacity = mapping.nominal_battery_capacity_kwh;
        
        result.steps[2].details.push(
            `方案${planType}查询${batteryBrand}功率映射表，光伏容量${solarKw.toFixed(2)}kW位于区间(${mapping.min}, ${mapping.max}]kW`,
            `对应电池可用容量 = ${usableBatteryCapacity} kWh`,
            `对应电池标称容量 = ${nominalBatteryCapacity} kWh`
        );
    }
    
    result.system.usableBatteryCapacity = usableBatteryCapacity;
    result.system.nominalBatteryCapacity = nominalBatteryCapacity;
    
    return calculateSystemCostV11(result, p, isNewSystem, isVIC, isNSW);
}

// v1.1 成本计算函数
function calculateSystemCostV11(result, p, isNewSystem, isVIC, isNSW) {
    // 4. 税前整体报价
    result.steps.push({
        title: `4️⃣ 方案${result.planType} - 税前整体报价 (v1.1)`,
        details: []
    });
    
    const panelPrice = isNewSystem ? result.system.solarKw * p.panel_price_per_kw : 0;
    result.costs.panel = panelPrice;
    result.steps[3].details.push(
        isNewSystem 
            ? `面板报价 = ${result.system.solarKw.toFixed(2)} kW × ${p.panel_price_per_kw} AUD/kW = ${panelPrice.toFixed(2)} AUD`
            : `面板报价 = 0 AUD (储能扩容项目)`
    );
    
    const inverterPrice = isNewSystem ? result.system.inverterKw * p.inverter_price_per_kw : 0;
    result.costs.inverter = inverterPrice;
    result.steps[3].details.push(
        isNewSystem
            ? `逆变器报价 = ${result.system.inverterKw} kW × ${p.inverter_price_per_kw} AUD/kW = ${inverterPrice.toFixed(2)} AUD`
            : `逆变器报价 = 0 AUD (储能扩容项目)`
    );
    
    const batteryPrice = result.system.nominalBatteryCapacity * p.battery_price_per_kwh;
    result.costs.battery = batteryPrice;
    result.steps[3].details.push(
        `电池报价 = ${result.system.nominalBatteryCapacity.toFixed(2)} kWh × ${p.battery_price_per_kwh} AUD/kWh = ${batteryPrice.toFixed(2)} AUD`
    );
    
    const preTaxTotal = panelPrice + inverterPrice + batteryPrice;
    result.costs.preTaxTotal = preTaxTotal;
    result.steps[3].details.push(`<strong>税前整体报价 = ${preTaxTotal.toFixed(2)} AUD</strong>`);
    
    // 5. GST和含税报价
    result.steps.push({
        title: `5️⃣ 方案${result.planType} - GST和含税报价`,
        details: []
    });
    
    const gst = preTaxTotal * p.gst_rate;
    const systemTotal = preTaxTotal + gst;
    
    result.totals.gst = gst;
    result.totals.systemTotal = systemTotal;
    
    result.steps[4].details.push(
        `GST = ${preTaxTotal.toFixed(2)} × ${p.gst_rate} = ${gst.toFixed(2)} AUD`,
        `<strong>含税报价 = ${preTaxTotal.toFixed(2)} + ${gst.toFixed(2)} = ${systemTotal.toFixed(2)} AUD</strong>`
    );
    
    // 6. 补贴计算
    result.steps.push({
        title: `6️⃣ 方案${result.planType} - 补贴计算 (v1.1)`,
        details: []
    });
    
    let totalSubsidy = 0;
    
    if (isNewSystem) {
        const pvStcQty = result.system.solarKw * p.zone_rating * p.deeming_period;
        const pvStcRebate = pvStcQty * p.pv_stc_price;
        result.subsidies.pvStc = pvStcRebate;
        totalSubsidy += pvStcRebate;
        result.steps[5].details.push(
            `<strong>STC PV Rebate:</strong>`,
            `  PV_STC数量 = ${result.system.solarKw.toFixed(2)} kW × ${p.zone_rating} × ${p.deeming_period} 年 = ${pvStcQty.toFixed(2)}`,
            `  STC PV Rebate = ${pvStcQty.toFixed(2)} × ${p.pv_stc_price} AUD = ${pvStcRebate.toFixed(2)} AUD`
        );
    } else {
        result.steps[5].details.push(`<strong>STC PV Rebate:</strong> 0 AUD (储能扩容项目)`);
    }
    
    const batteryStcQty = Math.floor(result.system.usableBatteryCapacity * p.battery_stc_factor);
    const batteryStcRebate = batteryStcQty * p.battery_stc_price;
    result.subsidies.batteryStc = batteryStcRebate;
    totalSubsidy += batteryStcRebate;
    result.steps[5].details.push(
        `<strong>STC Battery Rebate:</strong>`,
        `  Battery STC数量 = floor(${result.system.usableBatteryCapacity.toFixed(2)} kWh × ${p.battery_stc_factor}) = ${batteryStcQty}`,
        `  STC Battery Rebate = ${batteryStcQty} × ${p.battery_stc_price} AUD = ${batteryStcRebate.toFixed(2)} AUD`
    );
    
    if (p.enable_vic_rebate && isVIC && isNewSystem) {
        result.subsidies.vicRebate = p.vic_rebate;
        totalSubsidy += p.vic_rebate;
        result.steps[5].details.push(
            `<strong>Solar VIC Rebate:</strong> ${p.vic_rebate.toFixed(2)} AUD (已启用)`
        );
        
        result.subsidies.vicLoan = p.vic_loan;
        totalSubsidy += p.vic_loan;
        result.steps[5].details.push(
            `<strong>Solar VIC Interest Free Loan:</strong> ${p.vic_loan.toFixed(2)} AUD (已启用)`
        );
    } else if (isVIC && isNewSystem) {
        result.steps[5].details.push(
            `<strong>VIC州补贴:</strong> 未启用`
        );
    }
    
    if (p.enable_nsw_vpp && isNSW && result.system.usableBatteryCapacity >= 2 && result.system.usableBatteryCapacity <= 28) {
        const demandResponse = result.system.usableBatteryCapacity * 0.0734;
        const peakResponse = demandResponse * 0.8;
        const peakReduction = peakResponse * 6 * 6;
        const prcQty = Math.floor(peakReduction * p.network_loss_factor * 10);
        const nswRebate = prcQty * p.nsw_prc_price;
        result.subsidies.nswVpp = nswRebate;
        totalSubsidy += nswRebate;
        result.steps[5].details.push(
            `<strong>NSW VPP Rebate:</strong> (已启用)`,
            `  需求响应分量 = ${result.system.usableBatteryCapacity.toFixed(2)} kWh × 0.0734 = ${demandResponse.toFixed(4)} kW`,
            `  峰值需求响应能力 = ${demandResponse.toFixed(4)} × 0.8 = ${peakResponse.toFixed(4)} kW`,
            `  峰值减排容量 = ${peakResponse.toFixed(4)} × 6小时 × 6年 = ${peakReduction.toFixed(4)} kWh`,
            `  PRC数量 = floor(${peakReduction.toFixed(4)} × ${p.network_loss_factor} × 10) = ${prcQty}`,
            `  NSW VPP Rebate = ${prcQty} × ${p.nsw_prc_price} AUD = ${nswRebate.toFixed(2)} AUD`
        );
    } else if (isNSW) {
        result.steps[5].details.push(
            `<strong>NSW VPP补贴:</strong> 未启用`
        );
    }
    
    result.subsidies.total = totalSubsidy;
    result.steps[5].details.push(`<strong>补贴总计 = ${totalSubsidy.toFixed(2)} AUD</strong>`);
    
    // 7. 最终报价和展示范围
    const finalPrice = systemTotal - totalSubsidy;
    result.totals.finalPrice = finalPrice;
    
    const rangePercent = p.display_range_percent / 100;
    const displayLower = finalPrice * (1 - rangePercent);
    const displayUpper = finalPrice * (1 + rangePercent);
    
    result.totals.displayLower = displayLower;
    result.totals.displayUpper = displayUpper;
    
    result.steps.push({
        title: `7️⃣ 方案${result.planType} - 最终报价和展示范围 (v1.1)`,
        details: [
            `<strong>最终报价 = ${systemTotal.toFixed(2)} - ${totalSubsidy.toFixed(2)} = ${finalPrice.toFixed(2)} AUD</strong>`,
            ``,
            `<strong>界面展示范围 (±${p.display_range_percent}%):</strong>`,
            `  展示下限 = ${finalPrice.toFixed(2)} × (1 - ${rangePercent.toFixed(2)}) = ${displayLower.toFixed(2)} AUD`,
            `  展示上限 = ${finalPrice.toFixed(2)} × (1 + ${rangePercent.toFixed(2)}) = ${displayUpper.toFixed(2)} AUD`
        ]
    });
    
    return result;
}

// 显示ABC三套方案结果
function displayABCResults(results, params) {
    const container = document.getElementById('resultContent');
    let html = '';
    
    html += `<div class="result-section">`;
    html += `<h2>📊 ABC三套方案对比</h2>`;
    html += `<div style="overflow-x: auto;">`;
    html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">`;
    html += `<thead>`;
    html += `<tr style="background: #f5f5f5;">`;
    html += `<th style="border: 1px solid #ddd; padding: 10px; text-align: left;">项目</th>`;
    html += `<th style="border: 1px solid #ddd; padding: 10px; text-align: center;">方案A</th>`;
    html += `<th style="border: 1px solid #ddd; padding: 10px; text-align: center;">方案B</th>`;
    html += `<th style="border: 1px solid #ddd; padding: 10px; text-align: center;">方案C</th>`;
    html += `</tr></thead><tbody>`;
    
    // 系统配置
    html += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">面板数量 (块)</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.system.panelCount}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.system.panelCount}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.system.panelCount}</td></tr>`;
    
    html += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">光伏容量 (kW)</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.system.solarKw.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.system.solarKw.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.system.solarKw.toFixed(2)}</td></tr>`;
    
    html += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">逆变器功率 (kW)</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.system.inverterKw}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.system.inverterKw}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.system.inverterKw}</td></tr>`;
    
    html += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">电池可用容量 (kWh)</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.system.usableBatteryCapacity.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.system.usableBatteryCapacity.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.system.usableBatteryCapacity.toFixed(2)}</td></tr>`;
    
    html += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">电池标称容量 (kWh)</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.system.nominalBatteryCapacity.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.system.nominalBatteryCapacity.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.system.nominalBatteryCapacity.toFixed(2)}</td></tr>`;
    
    // 成本细项
    html += `<tr style="background: #f0f0f0;"><td colspan="4" style="border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: center;">💰 税前报价细项 (AUD) - v1.1</td></tr>`;
    
    html += `<tr><td style="border: 1px solid #ddd; padding: 8px; padding-left: 20px;">面板报价</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.costs.panel.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.costs.panel.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.costs.panel.toFixed(2)}</td></tr>`;
    
    html += `<tr><td style="border: 1px solid #ddd; padding: 8px; padding-left: 20px;">逆变器报价</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.costs.inverter.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.costs.inverter.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.costs.inverter.toFixed(2)}</td></tr>`;
    
    html += `<tr><td style="border: 1px solid #ddd; padding: 8px; padding-left: 20px;">电池报价</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.costs.battery.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.costs.battery.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.costs.battery.toFixed(2)}</td></tr>`;
    
    html += `<tr style="background: #f9f9f9;"><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">税前整体报价</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${results.A.costs.preTaxTotal.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${results.B.costs.preTaxTotal.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${results.C.costs.preTaxTotal.toFixed(2)}</td></tr>`;
    
    html += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; padding-left: 20px;">📊 GST税费</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.totals.gst.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.totals.gst.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.totals.gst.toFixed(2)}</td></tr>`;
    
    html += `<tr style="background: #f9f9f9;"><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">含税报价</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${results.A.totals.systemTotal.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${results.B.totals.systemTotal.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${results.C.totals.systemTotal.toFixed(2)}</td></tr>`;
    
    // 补贴细项
    html += `<tr style="background: #f0f0f0;"><td colspan="4" style="border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: center;">🎁 补贴细项 (AUD) - v1.1</td></tr>`;
    
    if (results.A.subsidies.pvStc !== undefined) {
        html += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; padding-left: 20px;">STC PV补贴</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.subsidies.pvStc ? results.A.subsidies.pvStc.toFixed(2) : '0.00'}</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.subsidies.pvStc ? results.B.subsidies.pvStc.toFixed(2) : '0.00'}</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.subsidies.pvStc ? results.C.subsidies.pvStc.toFixed(2) : '0.00'}</td></tr>`;
    }
    
    html += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; padding-left: 20px;">STC电池补贴</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.subsidies.batteryStc.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.subsidies.batteryStc.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.subsidies.batteryStc.toFixed(2)}</td></tr>`;
    
    if (results.A.subsidies.vicRebate !== undefined) {
        html += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; padding-left: 20px;">VIC州补贴</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.subsidies.vicRebate.toFixed(2)}</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.subsidies.vicRebate.toFixed(2)}</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.subsidies.vicRebate.toFixed(2)}</td></tr>`;
        
        html += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; padding-left: 20px;">VIC州无息贷款</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.subsidies.vicLoan.toFixed(2)}</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.subsidies.vicLoan.toFixed(2)}</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.subsidies.vicLoan.toFixed(2)}</td></tr>`;
    }
    
    if (results.A.subsidies.nswVpp !== undefined) {
        html += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; padding-left: 20px;">NSW VPP补贴</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.subsidies.nswVpp.toFixed(2)}</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.subsidies.nswVpp.toFixed(2)}</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.subsidies.nswVpp.toFixed(2)}</td></tr>`;
    }
    
    html += `<tr style="background: #f9f9f9;"><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">总补贴</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">-${results.A.subsidies.total.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">-${results.B.subsidies.total.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">-${results.C.subsidies.total.toFixed(2)}</td></tr>`;
    
    html += `<tr style="background: #e8f5e9;"><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; color: #2e7d32;">最终报价 (AUD)</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; color: #2e7d32;">${results.A.totals.finalPrice.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; color: #2e7d32;">${results.B.totals.finalPrice.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; color: #2e7d32;">${results.C.totals.finalPrice.toFixed(2)}</td></tr>`;
    
    // v1.1 新增：展示范围
    html += `<tr style="background: #fff3e0;"><td colspan="4" style="border: 1px solid #ddd; padding: 8px; font-weight: bold; text-align: center;">📊 界面展示范围 (±${params.display_range_percent}%) - v1.1新增</td></tr>`;
    
    html += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; padding-left: 20px;">展示下限</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.totals.displayLower.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.totals.displayLower.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.totals.displayLower.toFixed(2)}</td></tr>`;
    
    html += `<tr><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; padding-left: 20px;">展示上限</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.totals.displayUpper.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.totals.displayUpper.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.totals.displayUpper.toFixed(2)}</td></tr>`;
    
    html += `</tbody></table></div></div>`;
    
    // 详细计算步骤
    ['A', 'B', 'C'].forEach(plan => {
        html += `<div class="result-section">`;
        html += `<h2>📋 方案${plan}详细计算</h2>`;
        html += `<div style="margin-bottom: 10px;">`;
        html += `<button onclick="toggleDetails('plan${plan}')" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">显示/隐藏详细步骤</button>`;
        html += `</div>`;
        html += `<div id="plan${plan}" style="display: none;">`;
        
        results[plan].steps.forEach(step => {
            html += `<div class="calc-step">`;
            html += `<div class="calc-step-title">${step.title}</div>`;
            html += `<div class="calc-detail">`;
            step.details.forEach(detail => {
                html += `${detail}<br>`;
            });
            html += `</div></div>`;
        });
        
        html += `</div></div>`;
    });
    
    container.innerHTML = html;
}

// 切换详细信息显示
function toggleDetails(elementId) {
    const element = document.getElementById(elementId);
    if (element.style.display === 'none') {
        element.style.display = 'block';
    } else {
        element.style.display = 'none';
    }
}
