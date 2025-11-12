// 批量计算脚本 - 基于 v1.1 计算逻辑
// 从 1 块面板迭代到 100 块面板，计算新建系统和储能扩容的所有方案

const fs = require('fs');
const path = require('path');

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

// 默认参数
const DEFAULT_PARAMS = {
    region: 'NSW',
    plan_a_capacity_factor: 0.9,
    plan_b_capacity_factor: 0.9,
    plan_c_capacity_factor: 0.9,
    plan_c_target_sc_rate: 0.5,
    baseline_self_consumption_rate: 0.3,
    battery_expansion_capacity_factor: 0.7,
    panel_power_kw: 0.44,
    dc_ac_ratio: 1.5,
    yield_per_kw_per_year: 1526,
    battery_dod: 0.9,
    battery_rte: 0.95,
    panel_price_per_kw: 540,
    inverter_price_per_kw: 280,
    battery_price_per_kwh: 865,
    gst_rate: 0.1,
    display_range_percent: 5,
    zone_rating: 1.382,
    deeming_period: 6,
    pv_stc_price: 39,
    battery_stc_factor: 9.3,
    battery_stc_price: 39,
    enable_vic_rebate: false,
    enable_nsw_vpp: false,
    vic_rebate: 1400,
    vic_loan: 1400,
    nsw_prc_price: 1.65,
    network_loss_factor: 1.05
};

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

// 计算单个方案
function calculateSinglePlan(p, planType, roofMaxPanels) {
    const result = {
        planType: planType,
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
    const panelCount = Math.floor(roofMaxPanels * capacityFactor);
    const solarKw = panelCount * p.panel_power_kw;
    
    result.system.panelCount = panelCount;
    result.system.solarKw = solarKw;
    
    // 2. 逆变器功率
    let inverterKw;
    if (planType === 'C') {
        inverterKw = ceilingTo01(solarKw / p.dc_ac_ratio);
    } else {
        const batteryBrand = planType === 'A' ? 'GS' : 'GD';
        const mapping = lookupPowerMapping(solarKw, batteryBrand);
        inverterKw = mapping.inverter_kw;
    }
    
    result.system.inverterKw = inverterKw;
    
    // 3. 电池容量
    let usableBatteryCapacity, nominalBatteryCapacity;
    
    if (planType === 'C') {
        const annualGenerationKwh = solarKw * p.yield_per_kw_per_year;
        const dailyEnergyToShiftKwh = (annualGenerationKwh / 365) * (p.plan_c_target_sc_rate - p.baseline_self_consumption_rate);
        usableBatteryCapacity = Math.min(dailyEnergyToShiftKwh / p.battery_rte, 50);
        nominalBatteryCapacity = usableBatteryCapacity / p.battery_dod;
    } else {
        const batteryBrand = planType === 'A' ? 'GS' : 'GD';
        const mapping = lookupPowerMapping(solarKw, batteryBrand);
        usableBatteryCapacity = mapping.usable_battery_capacity_kwh;
        nominalBatteryCapacity = mapping.nominal_battery_capacity_kwh;
    }
    
    result.system.usableBatteryCapacity = usableBatteryCapacity;
    result.system.nominalBatteryCapacity = nominalBatteryCapacity;
    
    // 4. 税前整体报价
    const panelPrice = isNewSystem ? solarKw * p.panel_price_per_kw : 0;
    const inverterPrice = isNewSystem ? inverterKw * p.inverter_price_per_kw : 0;
    const batteryPrice = nominalBatteryCapacity * p.battery_price_per_kwh;
    
    result.costs.panel = panelPrice;
    result.costs.inverter = inverterPrice;
    result.costs.battery = batteryPrice;
    result.costs.preTaxTotal = panelPrice + inverterPrice + batteryPrice;
    
    // 5. GST和含税报价
    const gst = result.costs.preTaxTotal * p.gst_rate;
    const systemTotal = result.costs.preTaxTotal + gst;
    
    result.totals.gst = gst;
    result.totals.systemTotal = systemTotal;
    
    // 6. 补贴计算
    let totalSubsidy = 0;
    
    if (isNewSystem) {
        const pvStcQty = solarKw * p.zone_rating * p.deeming_period;
        const pvStcRebate = pvStcQty * p.pv_stc_price;
        result.subsidies.pvStc = pvStcRebate;
        totalSubsidy += pvStcRebate;
    } else {
        result.subsidies.pvStc = 0;
    }
    
    const batteryStcQty = Math.floor(usableBatteryCapacity * p.battery_stc_factor);
    const batteryStcRebate = batteryStcQty * p.battery_stc_price;
    result.subsidies.batteryStc = batteryStcRebate;
    totalSubsidy += batteryStcRebate;
    
    if (p.enable_vic_rebate && isVIC && isNewSystem) {
        result.subsidies.vicRebate = p.vic_rebate;
        result.subsidies.vicLoan = p.vic_loan;
        totalSubsidy += p.vic_rebate + p.vic_loan;
    } else {
        result.subsidies.vicRebate = 0;
        result.subsidies.vicLoan = 0;
    }
    
    if (p.enable_nsw_vpp && isNSW && usableBatteryCapacity >= 2 && usableBatteryCapacity <= 28) {
        const demandResponse = usableBatteryCapacity * 0.0734;
        const peakResponse = demandResponse * 0.8;
        const peakReduction = peakResponse * 6 * 6;
        const prcQty = Math.floor(peakReduction * p.network_loss_factor * 10);
        const nswRebate = prcQty * p.nsw_prc_price;
        result.subsidies.nswVpp = nswRebate;
        totalSubsidy += nswRebate;
    } else {
        result.subsidies.nswVpp = 0;
    }
    
    result.subsidies.total = totalSubsidy;
    
    // 7. 最终报价
    const finalPrice = systemTotal - totalSubsidy;
    result.totals.finalPrice = finalPrice;
    
    const rangePercent = p.display_range_percent / 100;
    result.totals.displayLower = finalPrice * (1 - rangePercent);
    result.totals.displayUpper = finalPrice * (1 + rangePercent);
    
    // 8. 计算单价（以W为单位）
    const systemKw = solarKw;
    const systemW = systemKw * 1000;
    
    // 整个系统的单价 (AUD/W)
    result.totals.pricePerW = systemW > 0 ? finalPrice / systemW : 0;
    
    // 扣除电池投入和电池补贴后的单价 (AUD/W)
    const priceWithoutBattery = finalPrice - batteryPrice + batteryStcRebate;
    result.totals.pricePerWWithoutBattery = systemW > 0 ? priceWithoutBattery / systemW : 0;
    
    return result;
}

// 批量计算
function batchCalculate() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // 新建系统数据
    const newSystemData = [];
    // 储能扩容数据
    const expansionData = [];
    
    console.log('开始批量计算...');
    console.log('面板数量范围: 1-100');
    
    for (let panelCount = 1; panelCount <= 100; panelCount++) {
        // 新建系统
        const newParams = { ...DEFAULT_PARAMS, project_type: 'new' };
        const newA = calculateSinglePlan(newParams, 'A', panelCount);
        const newB = calculateSinglePlan(newParams, 'B', panelCount);
        const newC = calculateSinglePlan(newParams, 'C', panelCount);
        
        newSystemData.push({
            项目类型: '新建系统',
            屋顶理论最大面板数量: panelCount,
            方案: 'A',
            实际面板数量: newA.system.panelCount,
            光伏容量kW: newA.system.solarKw.toFixed(2),
            逆变器功率kW: newA.system.inverterKw,
            电池可用容量kWh: newA.system.usableBatteryCapacity.toFixed(2),
            电池标称容量kWh: newA.system.nominalBatteryCapacity.toFixed(2),
            面板报价AUD: newA.costs.panel.toFixed(2),
            逆变器报价AUD: newA.costs.inverter.toFixed(2),
            电池报价AUD: newA.costs.battery.toFixed(2),
            税前整体报价AUD: newA.costs.preTaxTotal.toFixed(2),
            GST税费AUD: newA.totals.gst.toFixed(2),
            含税报价AUD: newA.totals.systemTotal.toFixed(2),
            STC_PV补贴AUD: newA.subsidies.pvStc.toFixed(2),
            STC电池补贴AUD: newA.subsidies.batteryStc.toFixed(2),
            VIC州补贴AUD: newA.subsidies.vicRebate.toFixed(2),
            VIC州无息贷款AUD: newA.subsidies.vicLoan.toFixed(2),
            NSW_VPP补贴AUD: newA.subsidies.nswVpp.toFixed(2),
            补贴总计AUD: newA.subsidies.total.toFixed(2),
            最终报价AUD: newA.totals.finalPrice.toFixed(2),
            展示下限AUD: newA.totals.displayLower.toFixed(2),
            展示上限AUD: newA.totals.displayUpper.toFixed(2),
            系统单价AUD每W: newA.totals.pricePerW.toFixed(4),
            扣除电池后单价AUD每W: newA.totals.pricePerWWithoutBattery.toFixed(4)
        });
        
        newSystemData.push({
            项目类型: '新建系统',
            屋顶理论最大面板数量: panelCount,
            方案: 'B',
            实际面板数量: newB.system.panelCount,
            光伏容量kW: newB.system.solarKw.toFixed(2),
            逆变器功率kW: newB.system.inverterKw,
            电池可用容量kWh: newB.system.usableBatteryCapacity.toFixed(2),
            电池标称容量kWh: newB.system.nominalBatteryCapacity.toFixed(2),
            面板报价AUD: newB.costs.panel.toFixed(2),
            逆变器报价AUD: newB.costs.inverter.toFixed(2),
            电池报价AUD: newB.costs.battery.toFixed(2),
            税前整体报价AUD: newB.costs.preTaxTotal.toFixed(2),
            GST税费AUD: newB.totals.gst.toFixed(2),
            含税报价AUD: newB.totals.systemTotal.toFixed(2),
            STC_PV补贴AUD: newB.subsidies.pvStc.toFixed(2),
            STC电池补贴AUD: newB.subsidies.batteryStc.toFixed(2),
            VIC州补贴AUD: newB.subsidies.vicRebate.toFixed(2),
            VIC州无息贷款AUD: newB.subsidies.vicLoan.toFixed(2),
            NSW_VPP补贴AUD: newB.subsidies.nswVpp.toFixed(2),
            补贴总计AUD: newB.subsidies.total.toFixed(2),
            最终报价AUD: newB.totals.finalPrice.toFixed(2),
            展示下限AUD: newB.totals.displayLower.toFixed(2),
            展示上限AUD: newB.totals.displayUpper.toFixed(2),
            系统单价AUD每W: newB.totals.pricePerW.toFixed(4),
            扣除电池后单价AUD每W: newB.totals.pricePerWWithoutBattery.toFixed(4)
        });
        
        newSystemData.push({
            项目类型: '新建系统',
            屋顶理论最大面板数量: panelCount,
            方案: 'C',
            实际面板数量: newC.system.panelCount,
            光伏容量kW: newC.system.solarKw.toFixed(2),
            逆变器功率kW: newC.system.inverterKw,
            电池可用容量kWh: newC.system.usableBatteryCapacity.toFixed(2),
            电池标称容量kWh: newC.system.nominalBatteryCapacity.toFixed(2),
            面板报价AUD: newC.costs.panel.toFixed(2),
            逆变器报价AUD: newC.costs.inverter.toFixed(2),
            电池报价AUD: newC.costs.battery.toFixed(2),
            税前整体报价AUD: newC.costs.preTaxTotal.toFixed(2),
            GST税费AUD: newC.totals.gst.toFixed(2),
            含税报价AUD: newC.totals.systemTotal.toFixed(2),
            STC_PV补贴AUD: newC.subsidies.pvStc.toFixed(2),
            STC电池补贴AUD: newC.subsidies.batteryStc.toFixed(2),
            VIC州补贴AUD: newC.subsidies.vicRebate.toFixed(2),
            VIC州无息贷款AUD: newC.subsidies.vicLoan.toFixed(2),
            NSW_VPP补贴AUD: newC.subsidies.nswVpp.toFixed(2),
            补贴总计AUD: newC.subsidies.total.toFixed(2),
            最终报价AUD: newC.totals.finalPrice.toFixed(2),
            展示下限AUD: newC.totals.displayLower.toFixed(2),
            展示上限AUD: newC.totals.displayUpper.toFixed(2),
            系统单价AUD每W: newC.totals.pricePerW.toFixed(4),
            扣除电池后单价AUD每W: newC.totals.pricePerWWithoutBattery.toFixed(4)
        });
        
        // 储能扩容
        const expParams = { ...DEFAULT_PARAMS, project_type: 'battery_expansion' };
        const expA = calculateSinglePlan(expParams, 'A', panelCount);
        const expB = calculateSinglePlan(expParams, 'B', panelCount);
        const expC = calculateSinglePlan(expParams, 'C', panelCount);
        
        expansionData.push({
            项目类型: '储能扩容',
            屋顶理论最大面板数量: panelCount,
            方案: 'A',
            实际面板数量: expA.system.panelCount,
            光伏容量kW: expA.system.solarKw.toFixed(2),
            逆变器功率kW: expA.system.inverterKw,
            电池可用容量kWh: expA.system.usableBatteryCapacity.toFixed(2),
            电池标称容量kWh: expA.system.nominalBatteryCapacity.toFixed(2),
            面板报价AUD: expA.costs.panel.toFixed(2),
            逆变器报价AUD: expA.costs.inverter.toFixed(2),
            电池报价AUD: expA.costs.battery.toFixed(2),
            税前整体报价AUD: expA.costs.preTaxTotal.toFixed(2),
            GST税费AUD: expA.totals.gst.toFixed(2),
            含税报价AUD: expA.totals.systemTotal.toFixed(2),
            STC_PV补贴AUD: expA.subsidies.pvStc.toFixed(2),
            STC电池补贴AUD: expA.subsidies.batteryStc.toFixed(2),
            VIC州补贴AUD: expA.subsidies.vicRebate.toFixed(2),
            VIC州无息贷款AUD: expA.subsidies.vicLoan.toFixed(2),
            NSW_VPP补贴AUD: expA.subsidies.nswVpp.toFixed(2),
            补贴总计AUD: expA.subsidies.total.toFixed(2),
            最终报价AUD: expA.totals.finalPrice.toFixed(2),
            展示下限AUD: expA.totals.displayLower.toFixed(2),
            展示上限AUD: expA.totals.displayUpper.toFixed(2),
            系统单价AUD每W: expA.totals.pricePerW.toFixed(4),
            扣除电池后单价AUD每W: expA.totals.pricePerWWithoutBattery.toFixed(4)
        });
        
        expansionData.push({
            项目类型: '储能扩容',
            屋顶理论最大面板数量: panelCount,
            方案: 'B',
            实际面板数量: expB.system.panelCount,
            光伏容量kW: expB.system.solarKw.toFixed(2),
            逆变器功率kW: expB.system.inverterKw,
            电池可用容量kWh: expB.system.usableBatteryCapacity.toFixed(2),
            电池标称容量kWh: expB.system.nominalBatteryCapacity.toFixed(2),
            面板报价AUD: expB.costs.panel.toFixed(2),
            逆变器报价AUD: expB.costs.inverter.toFixed(2),
            电池报价AUD: expB.costs.battery.toFixed(2),
            税前整体报价AUD: expB.costs.preTaxTotal.toFixed(2),
            GST税费AUD: expB.totals.gst.toFixed(2),
            含税报价AUD: expB.totals.systemTotal.toFixed(2),
            STC_PV补贴AUD: expB.subsidies.pvStc.toFixed(2),
            STC电池补贴AUD: expB.subsidies.batteryStc.toFixed(2),
            VIC州补贴AUD: expB.subsidies.vicRebate.toFixed(2),
            VIC州无息贷款AUD: expB.subsidies.vicLoan.toFixed(2),
            NSW_VPP补贴AUD: expB.subsidies.nswVpp.toFixed(2),
            补贴总计AUD: expB.subsidies.total.toFixed(2),
            最终报价AUD: expB.totals.finalPrice.toFixed(2),
            展示下限AUD: expB.totals.displayLower.toFixed(2),
            展示上限AUD: expB.totals.displayUpper.toFixed(2),
            系统单价AUD每W: expB.totals.pricePerW.toFixed(4),
            扣除电池后单价AUD每W: expB.totals.pricePerWWithoutBattery.toFixed(4)
        });
        
        expansionData.push({
            项目类型: '储能扩容',
            屋顶理论最大面板数量: panelCount,
            方案: 'C',
            实际面板数量: expC.system.panelCount,
            光伏容量kW: expC.system.solarKw.toFixed(2),
            逆变器功率kW: expC.system.inverterKw,
            电池可用容量kWh: expC.system.usableBatteryCapacity.toFixed(2),
            电池标称容量kWh: expC.system.nominalBatteryCapacity.toFixed(2),
            面板报价AUD: expC.costs.panel.toFixed(2),
            逆变器报价AUD: expC.costs.inverter.toFixed(2),
            电池报价AUD: expC.costs.battery.toFixed(2),
            税前整体报价AUD: expC.costs.preTaxTotal.toFixed(2),
            GST税费AUD: expC.totals.gst.toFixed(2),
            含税报价AUD: expC.totals.systemTotal.toFixed(2),
            STC_PV补贴AUD: expC.subsidies.pvStc.toFixed(2),
            STC电池补贴AUD: expC.subsidies.batteryStc.toFixed(2),
            VIC州补贴AUD: expC.subsidies.vicRebate.toFixed(2),
            VIC州无息贷款AUD: expC.subsidies.vicLoan.toFixed(2),
            NSW_VPP补贴AUD: expC.subsidies.nswVpp.toFixed(2),
            补贴总计AUD: expC.subsidies.total.toFixed(2),
            最终报价AUD: expC.totals.finalPrice.toFixed(2),
            展示下限AUD: expC.totals.displayLower.toFixed(2),
            展示上限AUD: expC.totals.displayUpper.toFixed(2),
            系统单价AUD每W: expC.totals.pricePerW.toFixed(4),
            扣除电池后单价AUD每W: expC.totals.pricePerWWithoutBattery.toFixed(4)
        });
        
        if (panelCount % 10 === 0) {
            console.log(`已完成 ${panelCount}/100 块面板的计算`);
        }
    }
    
    // 生成CSV
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 新建系统CSV
    const newSystemFile = path.join(outputDir, `新建系统_${timestamp}.csv`);
    const newSystemCsv = convertToCSV(newSystemData);
    fs.writeFileSync(newSystemFile, '\ufeff' + newSystemCsv, 'utf8');
    console.log(`\n新建系统数据已保存: ${newSystemFile}`);
    
    // 储能扩容CSV
    const expansionFile = path.join(outputDir, `储能扩容_${timestamp}.csv`);
    const expansionCsv = convertToCSV(expansionData);
    fs.writeFileSync(expansionFile, '\ufeff' + expansionCsv, 'utf8');
    console.log(`储能扩容数据已保存: ${expansionFile}`);
    
    console.log('\n批量计算完成！');
    console.log(`总计算记录: ${newSystemData.length + expansionData.length} 条`);
}

// 转换为CSV格式
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            return `"${value}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

// 执行批量计算
batchCalculate();
