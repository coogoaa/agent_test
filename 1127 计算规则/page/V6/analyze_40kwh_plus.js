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
  
  // 筛选 A 方案且电池 >= 40kWh 的数据
  const planA = data.filter(r => r.plan === 'A' && r.calc_mode === 'new');
  const above40 = planA.filter(r => parseFloat(r.battery_nominal_kwh) >= 40);
  
  console.log('\n========== 40kWh 以上电池分布分析 ==========\n');
  console.log(`## 总体统计\n`);
  console.log(`A方案总数: ${planA.length}`);
  console.log(`≥40kWh: ${above40.length} (${(above40.length/planA.length*100).toFixed(1)}%)`);
  console.log(`<40kWh: ${planA.length - above40.length} (${((planA.length-above40.length)/planA.length*100).toFixed(1)}%)`);
  
  // 按电池容量分组
  const batteryDist = {};
  above40.forEach(row => {
    const battery = parseFloat(row.battery_nominal_kwh);
    if (!batteryDist[battery]) {
      batteryDist[battery] = [];
    }
    batteryDist[battery].push(row);
  });
  
  console.log(`\n## 电池容量分布\n`);
  const sortedBatteries = Object.keys(batteryDist).map(k => parseFloat(k)).sort((a, b) => a - b);
  sortedBatteries.forEach(battery => {
    const count = batteryDist[battery].length;
    const percent = (count / above40.length * 100).toFixed(1);
    console.log(`  ${battery} kWh: ${count} 个 (${percent}%)`);
  });
  
  // PV 容量分布
  console.log(`\n## PV 容量分布（≥40kWh电池）\n`);
  const pvRanges = {
    '10-12kW': [],
    '12-14kW': [],
    '14-16kW': [],
    '16-18kW': [],
    '18-20kW': [],
    '≥20kW': []
  };
  
  above40.forEach(row => {
    const pv = parseFloat(row.pv_kw);
    if (pv < 12) pvRanges['10-12kW'].push(row);
    else if (pv < 14) pvRanges['12-14kW'].push(row);
    else if (pv < 16) pvRanges['14-16kW'].push(row);
    else if (pv < 18) pvRanges['16-18kW'].push(row);
    else if (pv < 20) pvRanges['18-20kW'].push(row);
    else pvRanges['≥20kW'].push(row);
  });
  
  Object.keys(pvRanges).forEach(range => {
    const count = pvRanges[range].length;
    if (count > 0) {
      const percent = (count / above40.length * 100).toFixed(1);
      const avgPv = pvRanges[range].reduce((sum, r) => sum + parseFloat(r.pv_kw), 0) / count;
      const avgBat = pvRanges[range].reduce((sum, r) => sum + parseFloat(r.battery_nominal_kwh), 0) / count;
      console.log(`  ${range}: ${count} 个 (${percent}%), 平均PV ${avgPv.toFixed(1)}kW, 平均电池 ${avgBat.toFixed(1)}kWh`);
    }
  });
  
  // 分析 40kWh 和 50kWh 的临界点
  console.log(`\n## 40kWh 临界点分析\n`);
  const battery40 = planA.filter(r => parseFloat(r.battery_nominal_kwh) === 40);
  if (battery40.length > 0) {
    const avgSurplus = battery40.reduce((sum, r) => sum + parseFloat(r.surplus_kwh), 0) / battery40.length;
    const avgPv = battery40.reduce((sum, r) => sum + parseFloat(r.pv_kw), 0) / battery40.length;
    const minSurplus = Math.min(...battery40.map(r => parseFloat(r.surplus_kwh)));
    const maxSurplus = Math.max(...battery40.map(r => parseFloat(r.surplus_kwh)));
    
    console.log(`40kWh 电池 (${battery40.length}个):`);
    console.log(`  平均PV: ${avgPv.toFixed(2)} kW`);
    console.log(`  平均光伏剩余: ${avgSurplus.toFixed(2)} kWh`);
    console.log(`  光伏剩余范围: ${minSurplus.toFixed(2)} - ${maxSurplus.toFixed(2)} kWh`);
    
    // 计算理论临界点
    const efficiency = 0.855;
    const nightDemand = 12.69;
    const aSurplus = 0.8;
    
    // 40kWh 对应的能量需求
    const energy40 = 40 * efficiency;
    console.log(`\n  40kWh 对应能量需求: ${energy40.toFixed(2)} kWh`);
    
    // 如果由光伏剩余驱动
    const surplusFor40 = energy40 / aSurplus;
    console.log(`  若由光伏剩余驱动，需要剩余: ${surplusFor40.toFixed(2)} kWh`);
    console.log(`  计算: 40 × 0.855 / 0.8 = ${surplusFor40.toFixed(2)} kWh`);
  }
  
  console.log(`\n## 50kWh 临界点分析\n`);
  const battery50 = planA.filter(r => parseFloat(r.battery_nominal_kwh) === 50);
  if (battery50.length > 0) {
    const avgSurplus = battery50.reduce((sum, r) => sum + parseFloat(r.surplus_kwh), 0) / battery50.length;
    const avgPv = battery50.reduce((sum, r) => sum + parseFloat(r.pv_kw), 0) / battery50.length;
    const minSurplus = Math.min(...battery50.map(r => parseFloat(r.surplus_kwh)));
    const maxSurplus = Math.max(...battery50.map(r => parseFloat(r.surplus_kwh)));
    
    console.log(`50kWh 电池 (${battery50.length}个):`);
    console.log(`  平均PV: ${avgPv.toFixed(2)} kW`);
    console.log(`  平均光伏剩余: ${avgSurplus.toFixed(2)} kWh`);
    console.log(`  光伏剩余范围: ${minSurplus.toFixed(2)} - ${maxSurplus.toFixed(2)} kWh`);
    
    const efficiency = 0.855;
    const aSurplus = 0.8;
    
    // 50kWh 对应的能量需求（达到上限）
    const energy50 = 50 * efficiency;
    console.log(`\n  50kWh 对应能量需求: ${energy50.toFixed(2)} kWh`);
    
    const surplusFor50 = energy50 / aSurplus;
    console.log(`  若由光伏剩余驱动，需要剩余: ${surplusFor50.toFixed(2)} kWh`);
    console.log(`  计算: 50 × 0.855 / 0.8 = ${surplusFor50.toFixed(2)} kWh`);
  }
  
  // 参数调整建议
  console.log(`\n\n========== 参数调整建议 ==========\n`);
  console.log(`## 当前参数\n`);
  console.log(`A方案: E_req = max(整夜需求, 0.8 × 光伏剩余)`);
  console.log(`  - 整夜需求: 12.69 kWh`);
  console.log(`  - aSurplus: 0.8`);
  console.log(`  - 效率: 0.855`);
  console.log(``);
  console.log(`B方案: E_req = max(晚高峰需求, 0.55 × 光伏剩余)`);
  console.log(`  - 晚高峰需求: 4.72 kWh`);
  console.log(`  - bSurplus: 0.55`);
  console.log(`  - 效率: 0.855`);
  
  console.log(`\n## 调整方案\n`);
  console.log(`### 方案1: 降低 aSurplus 系数`);
  console.log(``);
  const newASurplus = [0.75, 0.7, 0.65, 0.6];
  newASurplus.forEach(a => {
    const surplusFor40 = (40 * 0.855) / a;
    const surplusFor50 = (50 * 0.855) / a;
    console.log(`aSurplus = ${a}:`);
    console.log(`  - 40kWh 需要光伏剩余: ${surplusFor40.toFixed(2)} kWh (当前: 42.75 kWh)`);
    console.log(`  - 50kWh 需要光伏剩余: ${surplusFor50.toFixed(2)} kWh (当前: 53.44 kWh)`);
    console.log(`  - 影响: ${a < 0.8 ? '降低' : '提高'}电池容量推荐`);
    console.log(``);
  });
  
  console.log(`### 方案2: 调整效率参数`);
  console.log(``);
  console.log(`当前效率 = RTE(0.95) × DOD(0.9) = 0.855`);
  console.log(``);
  console.log(`提高效率会降低电池容量:`);
  const newEfficiency = [0.86, 0.87, 0.88, 0.90];
  newEfficiency.forEach(eff => {
    const battery40 = 40 * eff / 0.855;
    const battery50 = 50 * eff / 0.855;
    console.log(`效率 = ${eff}:`);
    console.log(`  - 原 40kWh → ${battery40.toFixed(1)} kWh`);
    console.log(`  - 原 50kWh → ${battery50.toFixed(1)} kWh`);
    console.log(``);
  });
  
  console.log(`### 方案3: 组合调整（推荐）\n`);
  console.log(`建议: aSurplus = 0.7, 保持效率 0.855`);
  console.log(``);
  const recommendA = 0.7;
  console.log(`影响分析:`);
  
  // 示例计算
  const examples = [
    { pv: 11.88, surplus: 37.22, name: '中等屋顶' },
    { pv: 13.64, surplus: 44.12, name: '较大屋顶' },
    { pv: 16.28, surplus: 54.63, name: '大屋顶' }
  ];
  
  examples.forEach(ex => {
    const currentEnergy = Math.max(12.69, 0.8 * ex.surplus);
    const currentBattery = currentEnergy / 0.855;
    const currentNominal = currentBattery <= 30 ? 30 : (currentBattery <= 40 ? 40 : 50);
    
    const newEnergy = Math.max(12.69, recommendA * ex.surplus);
    const newBattery = newEnergy / 0.855;
    const newNominal = newBattery <= 30 ? 30 : (newBattery <= 40 ? 40 : 50);
    
    console.log(`  ${ex.name} (PV ${ex.pv}kW, 剩余 ${ex.surplus}kWh):`);
    console.log(`    当前(0.8): ${currentBattery.toFixed(1)} kWh → ${currentNominal} kWh`);
    console.log(`    调整(0.7): ${newBattery.toFixed(1)} kWh → ${newNominal} kWh`);
    console.log(``);
  });
  
  console.log(`\n## 调整后的分布预测\n`);
  console.log(`aSurplus = 0.7 时:`);
  console.log(`  - 40kWh 需要光伏剩余: ${(40 * 0.855 / 0.7).toFixed(2)} kWh`);
  console.log(`  - 50kWh 需要光伏剩余: ${(50 * 0.855 / 0.7).toFixed(2)} kWh`);
  console.log(``);
  console.log(`预期效果:`);
  console.log(`  - 40kWh+ 的比例会降低`);
  console.log(`  - 更多房屋推荐 30kWh 或 40kWh`);
  console.log(`  - 50kWh 仅推荐给光伏剩余 > 61kWh 的大屋顶`);
}

main();
