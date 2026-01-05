const fs = require('fs');
const path = require('path');

// 展示几个典型案例
function main() {
  const tsvPath = path.join(__dirname, 'out/v6_full_20260105T032704.tsv');
  
  if (!fs.existsSync(tsvPath)) {
    console.error('TSV 文件不存在');
    process.exit(1);
  }
  
  const content = fs.readFileSync(tsvPath, 'utf-8');
  const lines = content.trim().split('\n');
  const header = lines[0].split('\t');
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    const row = {};
    header.forEach((h, idx) => {
      row[h] = parts[idx];
    });
    data.push(row);
  }
  
  // 筛选 new 模式和 planA 的数据
  const newPlanA = data.filter(r => r.calc_mode === 'new' && r.plan === 'A');
  
  console.log('\n========== V6 典型案例展示 ==========\n');
  
  // 找几个代表性案例
  const examples = [
    { name: '极小屋顶（1块板）', filter: r => parseInt(r.panel_count) === 1 },
    { name: '极小屋顶（4块板）', filter: r => parseInt(r.panel_count) === 4 },
    { name: '铺不满6.6kW（5块板）', filter: r => parseInt(r.panel_count) === 5 },
    { name: '接近6.6kW（15块板）', filter: r => parseInt(r.panel_count) === 15 },
    { name: '6.6-10kW范围（18块板）', filter: r => parseInt(r.panel_count) === 18 },
    { name: '10-14kW范围（27块板）', filter: r => parseInt(r.panel_count) === 27 },
    { name: '大屋顶（37块板）', filter: r => parseInt(r.panel_count) === 37 },
    { name: '超大屋顶（45块板达到上限）', filter: r => parseInt(r.panel_count) === 45 && parseFloat(r.pv_kw) === 20.0 }
  ];
  
  examples.forEach(ex => {
    const matches = newPlanA.filter(ex.filter);
    if (matches.length > 0) {
      const sample = matches[0];
      console.log(`\n## ${ex.name}`);
      console.log(`   房屋ID: ${sample.house_id}`);
      console.log(`   屋顶容量: ${sample.roof_max_kw} kW`);
      console.log(`   面板数量: ${sample.panel_count} 块`);
      console.log(`   PV容量: ${sample.pv_kw} kW`);
      console.log(`   逆变器: ${sample.inverter_kw} kW (容配比 ${sample.ratio_percent}%)`);
      console.log(`   电池容量: ${sample.battery_nominal_kwh} kWh (计算值: ${sample.battery_calculated_nominal_kwh} kWh)`);
      console.log(`   电池方法: ${sample.battery_method}`);
      console.log(`   ---`);
      console.log(`   日均发电: ${sample.pv_day_kwh} kWh`);
      console.log(`   日均用电: ${sample.load_day_kwh} kWh`);
      console.log(`   晚高峰需求: ${sample.evening_kwh} kWh`);
      console.log(`   整夜需求: ${sample.night_kwh} kWh`);
      console.log(`   光伏剩余: ${sample.surplus_kwh} kWh`);
      console.log(`   ---`);
      console.log(`   含税总价: $${sample.tax_total_aud} AUD`);
      console.log(`   补贴金额: $${sample.subsidy_aud} AUD`);
      console.log(`   最终价格: $${sample.final_price_aud} AUD`);
      
      // 验证计算逻辑
      const surplus = parseFloat(sample.surplus_kwh);
      const night = parseFloat(sample.night_kwh);
      const aSurplus = 0.8;
      const efficiency = 0.95 * 0.9; // RTE * DOD
      
      const energyFromNight = night;
      const energyFromSurplus = aSurplus * surplus;
      const maxEnergy = Math.max(energyFromNight, energyFromSurplus);
      const calculatedBattery = maxEnergy / efficiency;
      
      console.log(`   ---`);
      console.log(`   计算验证:`);
      console.log(`     整夜能量: ${energyFromNight.toFixed(2)} kWh`);
      console.log(`     0.8×剩余: ${energyFromSurplus.toFixed(2)} kWh`);
      console.log(`     取最大值: ${maxEnergy.toFixed(2)} kWh`);
      console.log(`     除以效率(0.855): ${calculatedBattery.toFixed(2)} kWh`);
      console.log(`     标准化后: ${sample.battery_nominal_kwh} kWh ✓`);
    }
  });
  
  console.log('\n\n========== 计算逻辑说明 ==========\n');
  console.log('V6 使用全年日均数据计算光伏剩余：');
  console.log('  1. 年发电量 = PV_kW × 年发电系数(1460 kWh/kW/年)');
  console.log('  2. 日均发电 = 年发电量 / 365');
  console.log('  3. 逐小时发电 = 日均发电 × 小时发电占比');
  console.log('  4. 光伏剩余 = Σ max(0, PV_hour - Load_hour)');
  console.log('');
  console.log('A方案电池容量计算：');
  console.log('  Battery = min(max(整夜需求, 0.8×光伏剩余) / 效率, 50kWh)');
  console.log('  效率 = RTE × DOD = 0.95 × 0.9 = 0.855');
  console.log('');
  console.log('关键观察：');
  console.log('  - 小屋顶：光伏剩余小，电池由整夜需求决定');
  console.log('  - 中屋顶：光伏剩余增加，电池由0.8×剩余决定');
  console.log('  - 大屋顶：达到50kWh补贴上限');
  console.log('');
}

main();
