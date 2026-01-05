const fs = require('fs');
const path = require('path');

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
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
  return data;
}

function main() {
  const oldFile = path.join(__dirname, 'out/v6_full_20260105T032704.tsv');
  const newFile = path.join(__dirname, 'out/v6_full_20260105T053630.tsv');
  
  console.log('\n========== V6 参数调整前后对比 ==========\n');
  console.log('旧参数: aSurplus = 0.8');
  console.log('新参数: aSurplus = 0.7\n');
  
  const oldData = parseCSV(oldFile);
  const newData = parseCSV(newFile);
  
  // 只对比 A 方案 new 模式
  const oldA = oldData.filter(r => r.plan === 'A' && r.calc_mode === 'new');
  const newA = newData.filter(r => r.plan === 'A' && r.calc_mode === 'new');
  
  console.log(`## 数据量\n`);
  console.log(`旧数据: ${oldA.length} 条`);
  console.log(`新数据: ${newA.length} 条`);
  
  // 按电池容量分组统计
  console.log(`\n## 电池容量分布对比\n`);
  
  const oldBatteryDist = {};
  const newBatteryDist = {};
  
  oldA.forEach(r => {
    const bat = parseFloat(r.battery_nominal_kwh);
    oldBatteryDist[bat] = (oldBatteryDist[bat] || 0) + 1;
  });
  
  newA.forEach(r => {
    const bat = parseFloat(r.battery_nominal_kwh);
    newBatteryDist[bat] = (newBatteryDist[bat] || 0) + 1;
  });
  
  const allBatteries = new Set([...Object.keys(oldBatteryDist), ...Object.keys(newBatteryDist)]);
  const sortedBatteries = Array.from(allBatteries).map(k => parseFloat(k)).sort((a, b) => a - b);
  
  console.log('| 电池容量 | 旧参数(0.8) | 新参数(0.7) | 变化 |');
  console.log('|---------|------------|------------|------|');
  
  sortedBatteries.forEach(bat => {
    const oldCount = oldBatteryDist[bat] || 0;
    const newCount = newBatteryDist[bat] || 0;
    const oldPercent = (oldCount / oldA.length * 100).toFixed(1);
    const newPercent = (newCount / newA.length * 100).toFixed(1);
    const diff = newCount - oldCount;
    const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
    console.log(`| ${bat} kWh | ${oldCount} (${oldPercent}%) | ${newCount} (${newPercent}%) | ${diffStr} |`);
  });
  
  // 40kWh+ 统计
  console.log(`\n## 40kWh 以上电池统计\n`);
  
  const old40Plus = oldA.filter(r => parseFloat(r.battery_nominal_kwh) >= 40).length;
  const new40Plus = newA.filter(r => parseFloat(r.battery_nominal_kwh) >= 40).length;
  
  console.log(`旧参数(0.8): ${old40Plus} 个 (${(old40Plus/oldA.length*100).toFixed(1)}%)`);
  console.log(`新参数(0.7): ${new40Plus} 个 (${(new40Plus/newA.length*100).toFixed(1)}%)`);
  console.log(`变化: ${new40Plus - old40Plus} 个 (${((new40Plus-old40Plus)/old40Plus*100).toFixed(1)}%)`);
  
  // 50kWh 统计
  console.log(`\n## 50kWh 电池统计\n`);
  
  const old50 = oldA.filter(r => parseFloat(r.battery_nominal_kwh) === 50).length;
  const new50 = newA.filter(r => parseFloat(r.battery_nominal_kwh) === 50).length;
  
  console.log(`旧参数(0.8): ${old50} 个 (${(old50/oldA.length*100).toFixed(1)}%)`);
  console.log(`新参数(0.7): ${new50} 个 (${(new50/newA.length*100).toFixed(1)}%)`);
  console.log(`变化: ${new50 - old50} 个 (${((new50-old50)/old50*100).toFixed(1)}%)`);
  
  // 找出变化的案例
  console.log(`\n## 典型变化案例\n`);
  
  const changes = [];
  for (let i = 0; i < oldA.length; i++) {
    const oldRow = oldA[i];
    const newRow = newA[i];
    
    if (oldRow.house_id === newRow.house_id) {
      const oldBat = parseFloat(oldRow.battery_nominal_kwh);
      const newBat = parseFloat(newRow.battery_nominal_kwh);
      
      if (oldBat !== newBat) {
        changes.push({
          houseId: oldRow.house_id,
          pv: parseFloat(oldRow.pv_kw),
          surplus: parseFloat(oldRow.surplus_kwh),
          oldBat,
          newBat,
          oldCalc: parseFloat(oldRow.battery_calculated_nominal_kwh),
          newCalc: parseFloat(newRow.battery_calculated_nominal_kwh)
        });
      }
    }
  }
  
  console.log(`总变化数: ${changes.length} 个 (${(changes.length/oldA.length*100).toFixed(1)}%)\n`);
  
  // 按变化类型分组
  const changeTypes = {};
  changes.forEach(c => {
    const key = `${c.oldBat}→${c.newBat}`;
    if (!changeTypes[key]) changeTypes[key] = [];
    changeTypes[key].push(c);
  });
  
  console.log('变化类型统计:');
  Object.keys(changeTypes).sort().forEach(key => {
    console.log(`  ${key} kWh: ${changeTypes[key].length} 个`);
  });
  
  // 展示典型案例
  console.log(`\n典型案例:`);
  const exampleTypes = ['50→40', '50→30', '40→30'];
  exampleTypes.forEach(type => {
    if (changeTypes[type] && changeTypes[type].length > 0) {
      const examples = changeTypes[type].slice(0, 3);
      console.log(`\n${type} kWh (${changeTypes[type].length}个):`);
      examples.forEach((ex, idx) => {
        console.log(`  案例${idx+1}: 房屋${ex.houseId}, PV ${ex.pv.toFixed(2)}kW, 剩余 ${ex.surplus.toFixed(2)}kWh`);
        console.log(`    旧: ${ex.oldCalc.toFixed(2)} → ${ex.oldBat} kWh`);
        console.log(`    新: ${ex.newCalc.toFixed(2)} → ${ex.newBat} kWh`);
      });
    }
  });
  
  // 价格影响分析
  console.log(`\n\n## 价格影响分析\n`);
  
  let totalOldPrice = 0;
  let totalNewPrice = 0;
  let priceChanges = [];
  
  for (let i = 0; i < oldA.length; i++) {
    const oldRow = oldA[i];
    const newRow = newA[i];
    
    if (oldRow.house_id === newRow.house_id) {
      const oldPrice = parseFloat(oldRow.final_price_aud);
      const newPrice = parseFloat(newRow.final_price_aud);
      
      totalOldPrice += oldPrice;
      totalNewPrice += newPrice;
      
      if (oldPrice !== newPrice) {
        priceChanges.push({
          houseId: oldRow.house_id,
          oldPrice,
          newPrice,
          diff: newPrice - oldPrice
        });
      }
    }
  }
  
  const avgOldPrice = totalOldPrice / oldA.length;
  const avgNewPrice = totalNewPrice / newA.length;
  
  console.log(`平均价格:`);
  console.log(`  旧参数(0.8): $${Math.round(avgOldPrice)} AUD`);
  console.log(`  新参数(0.7): $${Math.round(avgNewPrice)} AUD`);
  console.log(`  平均降低: $${Math.round(avgOldPrice - avgNewPrice)} AUD (${((avgOldPrice-avgNewPrice)/avgOldPrice*100).toFixed(1)}%)`);
  
  console.log(`\n价格变化统计:`);
  console.log(`  价格降低: ${priceChanges.filter(p => p.diff < 0).length} 个`);
  console.log(`  价格不变: ${oldA.length - priceChanges.length} 个`);
  console.log(`  价格上升: ${priceChanges.filter(p => p.diff > 0).length} 个`);
  
  // 最大降价案例
  priceChanges.sort((a, b) => a.diff - b.diff);
  console.log(`\n最大降价案例（前5）:`);
  priceChanges.slice(0, 5).forEach((p, idx) => {
    console.log(`  ${idx+1}. 房屋${p.houseId}: $${Math.round(p.oldPrice)} → $${Math.round(p.newPrice)} (降低 $${Math.round(-p.diff)})`);
  });
}

main();
