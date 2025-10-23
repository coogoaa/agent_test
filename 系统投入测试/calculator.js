// GS功率映射表
const GS_POWER_MAPPING = [
    { min: 0, max: 5, nominal_battery_capacity_kwh: 22.44, usable_battery_capacity_kwh: 20.2, inverter_kw: 8 },
    { min: 5, max: 7.5, nominal_battery_capacity_kwh: 22.22, usable_battery_capacity_kwh: 20, inverter_kw: 9.6 },
    { min: 7.5, max: 12, nominal_battery_capacity_kwh: 29.33, usable_battery_capacity_kwh: 26.4, inverter_kw: 9.994 },
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
    return mapping[mapping.length - 1]; // 默认返回最后一行
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
        params[key] = isNaN(value) ? value : parseFloat(value);
    }
    
    const results = calculateABCPlans(params);
    displayABCResults(results);
    
    document.getElementById('results').style.display = 'block';
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
});

// 计算ABC三套方案
function calculateABCPlans(p) {
    const plans = ['A', 'B', 'C'];
    const results = {};
    
    for (let plan of plans) {
        results[plan] = calculateSinglePlan(p, plan);
    }
    
    return results;
}

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
    
    // 获取方案容量系数
    const capacityFactor = planType === 'A' ? p.plan_a_capacity_factor : 
                          planType === 'B' ? p.plan_b_capacity_factor : 
                          p.plan_c_capacity_factor;
    
    // ========== 1. 推算光伏系统容量和面板数量 ==========
    result.steps.push({
        title: `1️⃣ 方案${planType} - 光伏系统容量和面板数量`,
        details: []
    });
    
    const panelCount = Math.floor(p.roof_max_panels * capacityFactor);
    const solarKw = panelCount * p.panel_power_kw;
    
    result.system.panelCount = panelCount;
    result.system.solarKw = solarKw;
    
    result.steps[0].details.push(
        `面板数量 = floor(${p.roof_max_panels} × ${capacityFactor}) = ${panelCount} 块`,
        `光伏系统容量 = ${panelCount} × ${p.panel_power_kw} kW = ${solarKw.toFixed(2)} kW`
    );
    
    // ========== 2. 推算逆变器功率 ==========
    result.steps.push({
        title: `2️⃣ 方案${planType} - 逆变器功率计算`,
        details: []
    });
    
    let inverterKw;
    if (planType === 'C') {
        // 方案C使用公式计算
        inverterKw = ceilingTo01(solarKw / p.dc_ac_ratio);
        result.steps[1].details.push(
            `逆变器功率 = CEILING_TO_0.1(${solarKw.toFixed(2)} / ${p.dc_ac_ratio}) = ${inverterKw} kW`
        );
    } else {
        // 方案A/B查表
        const mapping = lookupPowerMapping(solarKw, p.battery_brand);
        inverterKw = mapping.inverter_kw;
        result.steps[1].details.push(
            `查询${p.battery_brand}功率映射表，光伏容量${solarKw.toFixed(2)}kW对应逆变器功率 = ${inverterKw} kW`
        );
    }
    
    result.system.inverterKw = inverterKw;
    
    // ========== 3. 推算电池容量 ==========
    result.steps.push({
        title: `3️⃣ 方案${planType} - 电池容量计算`,
        details: []
    });
    
    let usableBatteryCapacity, nominalBatteryCapacity;
    
    if (planType === 'C') {
        // 方案C计算日转移能量
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
        // 方案A/B查表
        const mapping = lookupPowerMapping(solarKw, p.battery_brand);
        usableBatteryCapacity = mapping.usable_battery_capacity_kwh;
        nominalBatteryCapacity = mapping.nominal_battery_capacity_kwh;
        
        result.steps[2].details.push(
            `查询${p.battery_brand}功率映射表，光伏容量${solarKw.toFixed(2)}kW对应：`,
            `电池可用容量 = ${usableBatteryCapacity} kWh`,
            `电池标称容量 = ${nominalBatteryCapacity} kWh`
        );
    }
    
    result.system.usableBatteryCapacity = usableBatteryCapacity;
    result.system.nominalBatteryCapacity = nominalBatteryCapacity;
    
    // ========== 4. 计算系统投入 ==========
    return calculateSystemCostForPlan(result, p, isNewSystem, isVIC, isNSW);
}

// 计算单个方案的系统成本
function calculateSystemCostForPlan(result, p, isNewSystem, isVIC, isNSW) {
    // ========== Key Products 计算 ==========
    result.steps.push({
        title: `4️⃣ 方案${result.planType} - Key Products 计算`,
        details: []
    });
    
    // 面板成本
    const panelCost = isNewSystem ? result.system.panelCount * p.panel_unit_cost * (1 + p.panel_profit_margin) : 0;
    result.costs.panel = panelCost;
    result.steps[3].details.push(
        isNewSystem 
            ? `面板成本 = ${result.system.panelCount} 块 × ${p.panel_unit_cost} AUD × (1 + ${p.panel_profit_margin}) = ${panelCost.toFixed(2)} AUD`
            : `面板成本 = 0 AUD (储能扩容项目)`
    );
    
    // 逆变器成本
    const inverterCost = isNewSystem ? result.system.inverterKw * p.inverter_unit_cost * (1 + p.inverter_profit_margin) : 0;
    result.costs.inverter = inverterCost;
    result.steps[3].details.push(
        isNewSystem
            ? `逆变器成本 = ${result.system.inverterKw} kW × ${p.inverter_unit_cost} AUD/kW × (1 + ${p.inverter_profit_margin}) = ${inverterCost.toFixed(2)} AUD`
            : `逆变器成本 = 0 AUD (储能扩容项目)`
    );
    
    // 电池成本
    const batteryCost = result.system.nominalBatteryCapacity * p.battery_unit_cost * (1 + p.battery_profit_margin);
    result.costs.battery = batteryCost;
    result.steps[3].details.push(
        `电池成本 = ${result.system.nominalBatteryCapacity.toFixed(2)} kWh × ${p.battery_unit_cost} AUD/kWh × (1 + ${p.battery_profit_margin}) = ${batteryCost.toFixed(2)} AUD`
    );
    
    const keyProductsTotal = panelCost + inverterCost + batteryCost;
    result.costs.keyProductsTotal = keyProductsTotal;
    result.steps[3].details.push(`<strong>Key Products 总计 = ${keyProductsTotal.toFixed(2)} AUD</strong>`);
    
    // ========== BOS 计算 ==========
    result.steps.push({
        title: `5️⃣ 方案${result.planType} - Balance of System (BOS) 计算`,
        details: []
    });
    
    // 光伏基础安装费
    const pvBaseInstall = isNewSystem ? p.install_base_cost * (1 + p.install_profit_margin) : 0;
    result.costs.pvBase = pvBaseInstall;
    result.steps[4].details.push(
        isNewSystem
            ? `光伏基础安装费 = ${p.install_base_cost} AUD × (1 + ${p.install_profit_margin}) = ${pvBaseInstall.toFixed(2)} AUD`
            : `光伏基础安装费 = 0 AUD (储能扩容项目)`
    );
    
    // 光伏每kW安装费
    const pvPerKwInstall = isNewSystem ? result.system.solarKw * p.install_cost_per_kw * (1 + p.install_profit_margin) : 0;
    result.costs.pvPerKw = pvPerKwInstall;
    result.steps[4].details.push(
        isNewSystem
            ? `光伏每kW安装费 = ${result.system.solarKw.toFixed(2)} kW × ${p.install_cost_per_kw} AUD/kW × (1 + ${p.install_profit_margin}) = ${pvPerKwInstall.toFixed(2)} AUD`
            : `光伏每kW安装费 = 0 AUD (储能扩容项目)`
    );
    
    // 电池基础安装费
    const batteryBaseInstall = p.battery_install_base_cost * (1 + p.battery_install_profit_margin);
    result.costs.batteryBase = batteryBaseInstall;
    result.steps[4].details.push(
        `电池基础安装费 = ${p.battery_install_base_cost} AUD × (1 + ${p.battery_install_profit_margin}) = ${batteryBaseInstall.toFixed(2)} AUD`
    );
    
    // 电池每kWh安装费
    const batteryPerKwhInstall = result.system.nominalBatteryCapacity * p.battery_install_cost_per_kwh * (1 + p.battery_install_profit_margin);
    result.costs.batteryPerKwh = batteryPerKwhInstall;
    result.steps[4].details.push(
        `电池每kWh安装费 = ${result.system.nominalBatteryCapacity.toFixed(2)} kWh × ${p.battery_install_cost_per_kwh} AUD/kWh × (1 + ${p.battery_install_profit_margin}) = ${batteryPerKwhInstall.toFixed(2)} AUD`
    );
    
    const bosTotal = pvBaseInstall + pvPerKwInstall + batteryBaseInstall + batteryPerKwhInstall;
    result.costs.bosTotal = bosTotal;
    result.steps[4].details.push(`<strong>BOS 总计 = ${bosTotal.toFixed(2)} AUD</strong>`);
    
    // ========== 补贴计算 ==========
    result.steps.push({
        title: `6️⃣ 方案${result.planType} - 补贴计算`,
        details: []
    });
    
    let totalSubsidy = 0;
    
    // STC PV Rebate
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
    }
    
    // STC Battery Rebate
    const batteryStcQty = Math.floor(result.system.usableBatteryCapacity * p.battery_stc_factor);
    const batteryStcRebate = batteryStcQty * p.battery_stc_price;
    result.subsidies.batteryStc = batteryStcRebate;
    totalSubsidy += batteryStcRebate;
    result.steps[5].details.push(
        `<strong>STC Battery Rebate:</strong>`,
        `  Battery STC数量 = floor(${result.system.usableBatteryCapacity.toFixed(2)} kWh × ${p.battery_stc_factor}) = ${batteryStcQty}`,
        `  STC Battery Rebate = ${batteryStcQty} × ${p.battery_stc_price} AUD = ${batteryStcRebate.toFixed(2)} AUD`
    );
    
    // VIC州补贴
    if (isVIC && isNewSystem) {
        result.subsidies.vicRebate = p.vic_rebate;
        totalSubsidy += p.vic_rebate;
        result.steps[5].details.push(
            `<strong>Solar VIC Rebate:</strong> ${p.vic_rebate.toFixed(2)} AUD (VIC州且安装PV面板)`
        );
        
        result.subsidies.vicLoan = p.vic_loan;
        totalSubsidy += p.vic_loan;
        result.steps[5].details.push(
            `<strong>Solar VIC Interest Free Loan:</strong> ${p.vic_loan.toFixed(2)} AUD (VIC州且安装PV面板)`
        );
    }
    
    // NSW VPP Rebate
    if (isNSW && result.system.usableBatteryCapacity >= 2 && result.system.usableBatteryCapacity <= 28) {
        const demandResponse = result.system.usableBatteryCapacity * 0.0734;
        const peakResponse = demandResponse * 0.8;
        const peakReduction = peakResponse * 6 * 6;
        const prcQty = Math.floor(peakReduction * p.network_loss_factor * 10);
        const nswRebate = prcQty * p.nsw_prc_price;
        result.subsidies.nswVpp = nswRebate;
        totalSubsidy += nswRebate;
        result.steps[5].details.push(
            `<strong>NSW VPP Rebate (BESS2):</strong>`,
            `  需求响应分量 = ${result.system.usableBatteryCapacity.toFixed(2)} kWh × 0.0734 = ${demandResponse.toFixed(4)} kW`,
            `  峰值需求响应能力 = ${demandResponse.toFixed(4)} × 0.8 = ${peakResponse.toFixed(4)} kW`,
            `  峰值减排容量 = ${peakResponse.toFixed(4)} × 6小时 × 6年 = ${peakReduction.toFixed(4)} kWh`,
            `  PRC数量 = floor(${peakReduction.toFixed(4)} × ${p.network_loss_factor} × 10) = ${prcQty}`,
            `  NSW VPP Rebate = ${prcQty} × ${p.nsw_prc_price} AUD = ${nswRebate.toFixed(2)} AUD`
        );
    }
    
    // 安装商额外补贴
    if (p.installer_subsidy > 0) {
        result.subsidies.installerSubsidy = p.installer_subsidy;
        totalSubsidy += p.installer_subsidy;
        result.steps[5].details.push(
            `<strong>安装商额外补贴:</strong> ${p.installer_subsidy.toFixed(2)} AUD`
        );
    }
    
    result.subsidies.total = totalSubsidy;
    result.steps[5].details.push(`<strong>补贴总计 = ${totalSubsidy.toFixed(2)} AUD</strong>`);
    
    // ========== 最终计算 ==========
    const gst = (keyProductsTotal + bosTotal + p.additional_charges) * p.gst_rate;
    const systemTotal = keyProductsTotal + bosTotal + p.additional_charges + gst;
    const finalPrice = systemTotal - totalSubsidy;
    
    result.totals.gst = gst;
    result.totals.systemTotal = systemTotal;
    result.totals.finalPrice = finalPrice;
    
    result.steps.push({
        title: `7️⃣ 方案${result.planType} - 最终报价`,
        details: [
            `GST = (${keyProductsTotal.toFixed(2)} + ${bosTotal.toFixed(2)} + ${p.additional_charges.toFixed(2)}) × ${p.gst_rate} = ${gst.toFixed(2)} AUD`,
            `System Total = ${keyProductsTotal.toFixed(2)} + ${bosTotal.toFixed(2)} + ${p.additional_charges.toFixed(2)} + ${gst.toFixed(2)} = ${systemTotal.toFixed(2)} AUD`,
            `<strong>Final Price = ${systemTotal.toFixed(2)} - ${totalSubsidy.toFixed(2)} = ${finalPrice.toFixed(2)} AUD</strong>`
        ]
    });
    
    return result;
}

// 显示ABC三套方案结果
function displayABCResults(results) {
    const container = document.getElementById('resultContent');
    
    let html = '';
    
    // 方案对比表
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
    html += `</tr>`;
    html += `</thead>`;
    html += `<tbody>`;
    
    // 系统配置对比
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
    
    // 价格对比
    html += `<tr style="background: #f9f9f9;"><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">系统总价 (AUD)</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.A.totals.systemTotal.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.B.totals.systemTotal.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${results.C.totals.systemTotal.toFixed(2)}</td></tr>`;
    
    html += `<tr style="background: #f9f9f9;"><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">总补贴 (AUD)</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">-${results.A.subsidies.total.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">-${results.B.subsidies.total.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">-${results.C.subsidies.total.toFixed(2)}</td></tr>`;
    
    html += `<tr style="background: #e8f5e9;"><td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; color: #2e7d32;">最终报价 (AUD)</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; color: #2e7d32;">${results.A.totals.finalPrice.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; color: #2e7d32;">${results.B.totals.finalPrice.toFixed(2)}</td>`;
    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; color: #2e7d32;">${results.C.totals.finalPrice.toFixed(2)}</td></tr>`;
    
    html += `</tbody></table></div></div>`;
    
    // 详细计算步骤（可折叠）
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
