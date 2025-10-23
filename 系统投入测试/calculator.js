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
    
    const result = calculateSystemCost(params);
    displayResults(result);
    
    document.getElementById('results').style.display = 'block';
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
});

function calculateSystemCost(p) {
    const results = {
        steps: [],
        keyProducts: {},
        bos: {},
        subsidies: {},
        totals: {}
    };
    
    const isNewSystem = p.project_type === 'new';
    const isVIC = p.region === 'VIC';
    const isNSW = p.region === 'NSW';
    
    // ========== 1. Key Products ==========
    results.steps.push({
        title: '1️⃣ Key Products 计算',
        details: []
    });
    
    // 面板成本
    const panelCost = isNewSystem ? p.panel_count * p.panel_unit_cost * (1 + p.panel_profit_margin) : 0;
    results.keyProducts.panel = panelCost;
    results.steps[0].details.push(
        isNewSystem 
            ? `面板成本 = ${p.panel_count} 块 × ${p.panel_unit_cost} AUD × (1 + ${p.panel_profit_margin}) = ${panelCost.toFixed(2)} AUD`
            : `面板成本 = 0 AUD (储能扩容项目)`
    );
    
    // 逆变器成本
    const inverterCost = isNewSystem ? p.inverter_capacity * p.inverter_unit_cost * (1 + p.inverter_profit_margin) : 0;
    results.keyProducts.inverter = inverterCost;
    results.steps[0].details.push(
        isNewSystem
            ? `逆变器成本 = ${p.inverter_capacity} kW × ${p.inverter_unit_cost} AUD/kW × (1 + ${p.inverter_profit_margin}) = ${inverterCost.toFixed(2)} AUD`
            : `逆变器成本 = 0 AUD (储能扩容项目)`
    );
    
    // 电池成本
    const batteryCost = p.battery_capacity * p.battery_unit_cost * (1 + p.battery_profit_margin);
    results.keyProducts.battery = batteryCost;
    results.steps[0].details.push(
        `电池成本 = ${p.battery_capacity} kWh × ${p.battery_unit_cost} AUD/kWh × (1 + ${p.battery_profit_margin}) = ${batteryCost.toFixed(2)} AUD`
    );
    
    const keyProductsTotal = panelCost + inverterCost + batteryCost;
    results.keyProducts.total = keyProductsTotal;
    results.steps[0].details.push(`<strong>Key Products 总计 = ${keyProductsTotal.toFixed(2)} AUD</strong>`);
    
    // ========== 2. Balance of System (BOS) ==========
    results.steps.push({
        title: '2️⃣ Balance of System (BOS) 计算',
        details: []
    });
    
    // 光伏基础安装费
    const pvBaseInstall = isNewSystem ? p.install_base_cost * (1 + p.install_profit_margin) : 0;
    results.bos.pvBase = pvBaseInstall;
    results.steps[1].details.push(
        isNewSystem
            ? `光伏基础安装费 = ${p.install_base_cost} AUD × (1 + ${p.install_profit_margin}) = ${pvBaseInstall.toFixed(2)} AUD`
            : `光伏基础安装费 = 0 AUD (储能扩容项目)`
    );
    
    // 光伏每kW安装费
    const pvPerKwInstall = isNewSystem ? p.system_capacity * p.install_cost_per_kw * (1 + p.install_profit_margin) : 0;
    results.bos.pvPerKw = pvPerKwInstall;
    results.steps[1].details.push(
        isNewSystem
            ? `光伏每kW安装费 = ${p.system_capacity} kW × ${p.install_cost_per_kw} AUD/kW × (1 + ${p.install_profit_margin}) = ${pvPerKwInstall.toFixed(2)} AUD`
            : `光伏每kW安装费 = 0 AUD (储能扩容项目)`
    );
    
    // 电池基础安装费
    const batteryBaseInstall = p.battery_install_base_cost * (1 + p.battery_install_profit_margin);
    results.bos.batteryBase = batteryBaseInstall;
    results.steps[1].details.push(
        `电池基础安装费 = ${p.battery_install_base_cost} AUD × (1 + ${p.battery_install_profit_margin}) = ${batteryBaseInstall.toFixed(2)} AUD`
    );
    
    // 电池每kWh安装费
    const batteryPerKwhInstall = p.battery_capacity * p.battery_install_cost_per_kwh * (1 + p.battery_install_profit_margin);
    results.bos.batteryPerKwh = batteryPerKwhInstall;
    results.steps[1].details.push(
        `电池每kWh安装费 = ${p.battery_capacity} kWh × ${p.battery_install_cost_per_kwh} AUD/kWh × (1 + ${p.battery_install_profit_margin}) = ${batteryPerKwhInstall.toFixed(2)} AUD`
    );
    
    const bosTotal = pvBaseInstall + pvPerKwInstall + batteryBaseInstall + batteryPerKwhInstall;
    results.bos.total = bosTotal;
    results.steps[1].details.push(`<strong>BOS 总计 = ${bosTotal.toFixed(2)} AUD</strong>`);
    
    // ========== 3. Additional Charges ==========
    results.steps.push({
        title: '3️⃣ Additional Charges',
        details: [`附加费用 = ${p.additional_charges.toFixed(2)} AUD`]
    });
    results.totals.additionalCharges = p.additional_charges;
    
    // ========== 4. GST 税费 ==========
    const gst = (keyProductsTotal + bosTotal + p.additional_charges) * p.gst_rate;
    results.totals.gst = gst;
    results.steps.push({
        title: '4️⃣ GST 税费计算',
        details: [
            `GST = (Key Products + BOS + AC) × ${p.gst_rate}`,
            `GST = (${keyProductsTotal.toFixed(2)} + ${bosTotal.toFixed(2)} + ${p.additional_charges.toFixed(2)}) × ${p.gst_rate}`,
            `<strong>GST = ${gst.toFixed(2)} AUD</strong>`
        ]
    });
    
    // ========== 5. System Total ==========
    const systemTotal = keyProductsTotal + bosTotal + p.additional_charges + gst;
    results.totals.systemTotal = systemTotal;
    results.steps.push({
        title: '5️⃣ System Total',
        details: [
            `System Total = Key Products + BOS + AC + GST`,
            `System Total = ${keyProductsTotal.toFixed(2)} + ${bosTotal.toFixed(2)} + ${p.additional_charges.toFixed(2)} + ${gst.toFixed(2)}`,
            `<strong>System Total = ${systemTotal.toFixed(2)} AUD</strong>`
        ]
    });
    
    // ========== 6. 补贴计算 ==========
    results.steps.push({
        title: '6️⃣ 补贴 (Deductions) 计算',
        details: []
    });
    
    let totalSubsidy = 0;
    
    // STC PV Rebate
    if (isNewSystem) {
        const pvStcQty = p.system_capacity * p.zone_rating * p.deeming_period;
        const pvStcRebate = pvStcQty * p.pv_stc_price;
        results.subsidies.pvStc = pvStcRebate;
        totalSubsidy += pvStcRebate;
        results.steps[5].details.push(
            `<strong>STC PV Rebate:</strong>`,
            `  PV_STC数量 = ${p.system_capacity} kW × ${p.zone_rating} × ${p.deeming_period} 年 = ${pvStcQty.toFixed(2)}`,
            `  STC PV Rebate = ${pvStcQty.toFixed(2)} × ${p.pv_stc_price} AUD = ${pvStcRebate.toFixed(2)} AUD`
        );
    }
    
    // STC Battery Rebate
    const batteryStcQty = Math.floor(p.battery_usable_capacity * p.battery_stc_factor);
    const batteryStcRebate = batteryStcQty * p.battery_stc_price;
    results.subsidies.batteryStc = batteryStcRebate;
    totalSubsidy += batteryStcRebate;
    results.steps[5].details.push(
        `<strong>STC Battery Rebate:</strong>`,
        `  Battery STC数量 = floor(${p.battery_usable_capacity} kWh × ${p.battery_stc_factor}) = ${batteryStcQty}`,
        `  STC Battery Rebate = ${batteryStcQty} × ${p.battery_stc_price} AUD = ${batteryStcRebate.toFixed(2)} AUD`
    );
    
    // Solar VIC Rebate
    if (isVIC && isNewSystem) {
        results.subsidies.vicRebate = p.vic_rebate;
        totalSubsidy += p.vic_rebate;
        results.steps[5].details.push(
            `<strong>Solar VIC Rebate:</strong> ${p.vic_rebate.toFixed(2)} AUD (VIC州且安装PV面板)`
        );
    }
    
    // Solar VIC Interest Free Loan
    if (isVIC && isNewSystem) {
        results.subsidies.vicLoan = p.vic_loan;
        totalSubsidy += p.vic_loan;
        results.steps[5].details.push(
            `<strong>Solar VIC Interest Free Loan:</strong> ${p.vic_loan.toFixed(2)} AUD (VIC州且安装PV面板)`
        );
    }
    
    // NSW VPP Rebate
    if (isNSW && p.battery_usable_capacity >= 2 && p.battery_usable_capacity <= 28) {
        const demandResponse = p.battery_usable_capacity * 0.0734;
        const peakResponse = demandResponse * 0.8;
        const peakReduction = peakResponse * 6 * 6;
        const prcQty = Math.floor(peakReduction * p.network_loss_factor * 10);
        const nswRebate = prcQty * p.nsw_prc_price;
        results.subsidies.nswVpp = nswRebate;
        totalSubsidy += nswRebate;
        results.steps[5].details.push(
            `<strong>NSW VPP Rebate (BESS2):</strong>`,
            `  需求响应分量 = ${p.battery_usable_capacity} kWh × 0.0734 = ${demandResponse.toFixed(4)} kW`,
            `  峰值需求响应能力 = ${demandResponse.toFixed(4)} × 0.8 = ${peakResponse.toFixed(4)} kW`,
            `  峰值减排容量 = ${peakResponse.toFixed(4)} × 6小时 × 6年 = ${peakReduction.toFixed(4)} kWh`,
            `  PRC数量 = floor(${peakReduction.toFixed(4)} × ${p.network_loss_factor} × 10) = ${prcQty}`,
            `  NSW VPP Rebate = ${prcQty} × ${p.nsw_prc_price} AUD = ${nswRebate.toFixed(2)} AUD`
        );
    }
    
    // 安装商额外补贴
    if (p.installer_subsidy > 0) {
        results.subsidies.installerSubsidy = p.installer_subsidy;
        totalSubsidy += p.installer_subsidy;
        results.steps[5].details.push(
            `<strong>安装商额外补贴:</strong> ${p.installer_subsidy.toFixed(2)} AUD`
        );
    }
    
    results.subsidies.total = totalSubsidy;
    results.steps[5].details.push(`<strong>补贴总计 = ${totalSubsidy.toFixed(2)} AUD</strong>`);
    
    // ========== 7. Final Price ==========
    const finalPrice = systemTotal - totalSubsidy;
    results.totals.finalPrice = finalPrice;
    results.steps.push({
        title: '7️⃣ Final Price',
        details: [
            `Final Price = System Total - Deductions`,
            `Final Price = ${systemTotal.toFixed(2)} - ${totalSubsidy.toFixed(2)}`,
            `<strong>Final Price = ${finalPrice.toFixed(2)} AUD</strong>`
        ]
    });
    
    return results;
}

function displayResults(results) {
    const container = document.getElementById('resultContent');
    
    let html = '';
    
    // 显示计算步骤
    results.steps.forEach(step => {
        html += `<div class="calc-step">`;
        html += `<div class="calc-step-title">${step.title}</div>`;
        html += `<div class="calc-detail">`;
        step.details.forEach(detail => {
            html += `${detail}<br>`;
        });
        html += `</div></div>`;
    });
    
    // 最终结果
    html += `<div class="final-result">`;
    html += `💰 最终报价: ${results.totals.finalPrice.toFixed(2)} AUD`;
    html += `</div>`;
    
    // 汇总表
    html += `<div class="result-section">`;
    html += `<h2>📋 报价汇总</h2>`;
    html += `<div class="calc-step">`;
    html += `<div class="calc-detail">`;
    html += `<strong>Key Products:</strong> ${results.keyProducts.total.toFixed(2)} AUD<br>`;
    html += `<strong>Balance of System:</strong> ${results.bos.total.toFixed(2)} AUD<br>`;
    html += `<strong>Additional Charges:</strong> ${results.totals.additionalCharges.toFixed(2)} AUD<br>`;
    html += `<strong>GST:</strong> ${results.totals.gst.toFixed(2)} AUD<br>`;
    html += `<strong>System Total:</strong> ${results.totals.systemTotal.toFixed(2)} AUD<br>`;
    html += `<strong>Total Subsidies:</strong> -${results.subsidies.total.toFixed(2)} AUD<br>`;
    html += `<strong style="color: #2e7d32; font-size: 16px;">Final Price:</strong> <strong style="color: #2e7d32; font-size: 16px;">${results.totals.finalPrice.toFixed(2)} AUD</strong>`;
    html += `</div></div></div>`;
    
    container.innerHTML = html;
}
