const fs = require('fs');
const path = require('path');

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
  
  // 按房屋分组，找出 B 和 C 方案
  const houses = {};
  data.forEach(row => {
    const key = `${row.house_id}_${row.calc_mode}_${row.state}_${row.phase}`;
    if (!houses[key]) {
      houses[key] = {};
    }
    houses[key][row.plan] = row;
  });
  
  console.log('\n========== B 和 C 方案电池容量对比分析 ==========\n');
  
  let sameBatteryCount = 0;
  let totalCount = 0;
  const pvDistribution = {};
  const examples = [];
  
  Object.keys(houses).forEach(key => {
    const house = houses[key];
    if (house.B && house.C) {
      totalCount++;
      const batteryB = parseFloat(house.B.battery_nominal_kwh);
      const batteryC = parseFloat(house.C.battery_nominal_kwh);
      const pvB = parseFloat(house.B.pv_kw);
      const pvC = parseFloat(house.C.pv_kw);
      
      if (batteryB === batteryC) {
        sameBatteryCount++;
        
        // 统计 PV 容量分布
        const pvKey = pvB.toFixed(1);
        if (!pvDistribution[pvKey]) {
          pvDistribution[pvKey] = 0;
        }
        pvDistribution[pvKey]++;
        
        // 收集示例
        if (examples.length < 10) {
          examples.push({
            houseId: house.B.house_id,
            calcMode: house.B.calc_mode,
            pvB,
            pvC,
            batteryB,
            batteryC,
            calcB: house.B.battery_calculated_nominal_kwh,
            calcC: house.C.battery_calculated_nominal_kwh,
            methodB: house.B.battery_method,
            methodC: house.C.battery_method,
            surplusB: house.B.surplus_kwh,
            eveningB: house.B.evening_kwh
          });
        }
      }
    }
  });
  
  console.log(`## 统计结果\n`);
  console.log(`总对比数: ${totalCount}`);
  console.log(`B 和 C 电池相同: ${sameBatteryCount} (${(sameBatteryCount/totalCount*100).toFixed(1)}%)`);
  console.log(`B 和 C 电池不同: ${totalCount - sameBatteryCount} (${((totalCount-sameBatteryCount)/totalCount*100).toFixed(1)}%)`);
  
  console.log(`\n## B=C 时的 PV 容量分布\n`);
  const sortedPv = Object.keys(pvDistribution).map(k => parseFloat(k)).sort((a, b) => a - b);
  sortedPv.forEach(pv => {
    const count = pvDistribution[pv.toFixed(1)];
    const percent = (count / sameBatteryCount * 100).toFixed(1);
    console.log(`  ${pv.toFixed(1)} kW: ${count} 次 (${percent}%)`);
  });
  
  console.log(`\n## 典型案例（B=C）\n`);
  examples.forEach((ex, idx) => {
    console.log(`案例 ${idx + 1}: 房屋 ${ex.houseId} (${ex.calcMode})`);
    console.log(`  B方案: PV ${ex.pvB.toFixed(2)} kW, 电池 ${ex.batteryB} kWh (计算值: ${ex.calcB} kWh)`);
    console.log(`  C方案: PV ${ex.pvC.toFixed(2)} kW, 电池 ${ex.batteryC} kWh (计算值: ${ex.calcC} kWh)`);
    console.log(`  B方法: ${ex.methodB}`);
    console.log(`  C方法: ${ex.methodC}`);
    console.log(`  光伏剩余: ${ex.surplusB} kWh, 晚高峰: ${ex.eveningB} kWh`);
    
    // 解释为什么相同
    const surplus = parseFloat(ex.surplusB);
    const evening = parseFloat(ex.eveningB);
    const bSurplus = 0.55;
    const energyFromSurplus = bSurplus * surplus;
    
    console.log(`  分析: 0.55×剩余=${energyFromSurplus.toFixed(2)} kWh, 晚高峰=${evening.toFixed(2)} kWh`);
    if (energyFromSurplus <= evening) {
      console.log(`  → B方案取晚高峰（因为 0.55×剩余 ≤ 晚高峰），与C方案相同`);
    }
    console.log('');
  });
  
  console.log(`\n## 电池容量计算说明\n`);
  console.log(`### battery_calculated_nominal_kwh (计算值)`);
  console.log(`这是根据公式直接计算出的理论值，未经标准化。`);
  console.log(``);
  console.log(`计算公式:`);
  console.log(`  1. 确定所需能量 E_req`);
  console.log(`     - A方案: E_req = max(整夜需求, 0.8 × 光伏剩余)`);
  console.log(`     - B方案: E_req = max(晚高峰需求, 0.55 × 光伏剩余)`);
  console.log(`     - C方案: E_req = 晚高峰需求`);
  console.log(``);
  console.log(`  2. 除以效率得到电池容量`);
  console.log(`     Battery_calc = E_req / 效率`);
  console.log(`     效率 = RTE × DOD = 0.95 × 0.9 = 0.855`);
  console.log(``);
  console.log(`  3. 限制在最小和最大值之间`);
  console.log(`     Battery_calc = max(5, min(50, Battery_calc))`);
  console.log(``);
  console.log(`### battery_nominal_kwh (标准化值)`);
  console.log(`这是将计算值标准化到市场可用的电池规格。`);
  console.log(``);
  console.log(`标准规格: [5, 6.5, 9.6, 10, 13.5, 16, 20, 25, 30, 40, 50] kWh`);
  console.log(``);
  console.log(`标准化规则:`);
  console.log(`  - 选择 >= 计算值的最小标准规格`);
  console.log(`  - 例如: 计算值 14.84 kWh → 标准化为 16 kWh`);
  console.log(`  - 例如: 计算值 20.39 kWh → 标准化为 25 kWh`);
  console.log(``);
  console.log(`### 示例计算`);
  console.log(``);
  console.log(`案例: PV 6.6kW, 光伏剩余 16.72 kWh, 晚高峰 4.72 kWh, 整夜 12.69 kWh`);
  console.log(``);
  console.log(`C方案:`);
  console.log(`  E_req = 晚高峰 = 4.72 kWh`);
  console.log(`  Battery_calc = 4.72 / 0.855 = 5.52 kWh`);
  console.log(`  Battery_nominal = 6.5 kWh (标准化)`);
  console.log(``);
  console.log(`B方案:`);
  console.log(`  0.55×剩余 = 0.55 × 16.72 = 9.20 kWh`);
  console.log(`  E_req = max(4.72, 9.20) = 9.20 kWh`);
  console.log(`  Battery_calc = 9.20 / 0.855 = 10.76 kWh`);
  console.log(`  Battery_nominal = 13.5 kWh (标准化)`);
  console.log(``);
  console.log(`A方案:`);
  console.log(`  0.8×剩余 = 0.8 × 16.72 = 13.38 kWh`);
  console.log(`  E_req = max(12.69, 13.38) = 13.38 kWh`);
  console.log(`  Battery_calc = 13.38 / 0.855 = 15.65 kWh`);
  console.log(`  Battery_nominal = 16 kWh (标准化)`);
  
  // 分析 B=C 的条件
  console.log(`\n\n## B=C 的条件分析\n`);
  console.log(`B 和 C 方案电池相同的条件:`);
  console.log(`  当 0.55 × 光伏剩余 ≤ 晚高峰需求 时，B方案也取晚高峰需求`);
  console.log(`  即: 光伏剩余 ≤ 晚高峰 / 0.55`);
  console.log(``);
  console.log(`对于 NSW 州 (晚高峰 4.72 kWh):`);
  console.log(`  临界点: 光伏剩余 ≤ 4.72 / 0.55 = 8.58 kWh`);
  console.log(``);
  console.log(`这意味着:`);
  console.log(`  - 小屋顶 (光伏剩余 < 8.58 kWh): B=C`);
  console.log(`  - 大屋顶 (光伏剩余 > 8.58 kWh): B>C`);
  
  // 验证临界点
  console.log(`\n## 验证临界点\n`);
  const criticalExamples = [];
  Object.keys(houses).forEach(key => {
    const house = houses[key];
    if (house.B && house.C) {
      const surplus = parseFloat(house.B.surplus_kwh);
      const batteryB = parseFloat(house.B.battery_nominal_kwh);
      const batteryC = parseFloat(house.C.battery_nominal_kwh);
      
      if (surplus >= 8.0 && surplus <= 9.0) {
        criticalExamples.push({
          houseId: house.B.house_id,
          pvB: parseFloat(house.B.pv_kw),
          surplus,
          batteryB,
          batteryC,
          same: batteryB === batteryC
        });
      }
    }
  });
  
  criticalExamples.sort((a, b) => a.surplus - b.surplus);
  criticalExamples.slice(0, 10).forEach(ex => {
    const status = ex.same ? 'B=C' : 'B>C';
    console.log(`  光伏剩余 ${ex.surplus.toFixed(2)} kWh: B=${ex.batteryB} kWh, C=${ex.batteryC} kWh [${status}]`);
  });
}

main();
