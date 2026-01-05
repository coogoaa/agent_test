const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq === -1) {
      args[a.slice(2)] = true;
      continue;
    }
    const k = a.slice(2, eq);
    const v = a.slice(eq + 1);
    args[k] = v;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const tsvPath = args.file;
  
  if (!tsvPath || !fs.existsSync(tsvPath)) {
    console.error('请指定有效的 TSV 文件路径: --file=path/to/file.tsv');
    process.exit(1);
  }
  
  const content = fs.readFileSync(tsvPath, 'utf-8');
  const lines = content.trim().split('\n');
  const header = lines[0].split('\t');
  
  // 解析数据
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
  
  // 按屋顶容量分类
  const categories = {
    tiny: [],        // <= 1.76kW (4块板)
    verySmall: [],   // 1.76kW < x < 6.6kW
    small: [],       // 6.6kW <= x < 10kW
    medium: [],      // 10kW <= x < 14kW
    large: [],       // 14kW <= x < 20kW
    veryLarge: []    // >= 20kW
  };
  
  newPlanA.forEach(row => {
    const roofMaxKw = parseFloat(row.roof_max_kw);
    const pvKw = parseFloat(row.pv_kw);
    const panelCount = parseInt(row.panel_count);
    
    if (roofMaxKw <= 1.76) {
      categories.tiny.push({ ...row, roofMaxKw, pvKw, panelCount });
    } else if (roofMaxKw < 6.6) {
      categories.verySmall.push({ ...row, roofMaxKw, pvKw, panelCount });
    } else if (roofMaxKw < 10) {
      categories.small.push({ ...row, roofMaxKw, pvKw, panelCount });
    } else if (roofMaxKw < 14) {
      categories.medium.push({ ...row, roofMaxKw, pvKw, panelCount });
    } else if (roofMaxKw < 20) {
      categories.large.push({ ...row, roofMaxKw, pvKw, panelCount });
    } else {
      categories.veryLarge.push({ ...row, roofMaxKw, pvKw, panelCount });
    }
  });
  
  console.log('\n========== V6 边界案例分析 ==========\n');
  
  // 输出各类别统计
  const categoryNames = {
    tiny: '极小屋顶 (≤1.76kW, ≤4块板)',
    verySmall: '很小屋顶 (1.76kW-6.6kW)',
    small: '小屋顶 (6.6kW-10kW)',
    medium: '中等屋顶 (10kW-14kW)',
    large: '大屋顶 (14kW-20kW)',
    veryLarge: '超大屋顶 (≥20kW)'
  };
  
  Object.keys(categories).forEach(cat => {
    const houses = categories[cat];
    console.log(`\n## ${categoryNames[cat]}`);
    console.log(`房屋数量: ${houses.length}`);
    
    if (houses.length > 0) {
      // 排序并选择代表性案例
      houses.sort((a, b) => a.roofMaxKw - b.roofMaxKw);
      
      // 选择最小、中位数、最大
      const samples = [];
      samples.push(houses[0]); // 最小
      if (houses.length > 2) {
        samples.push(houses[Math.floor(houses.length / 2)]); // 中位数
      }
      if (houses.length > 1) {
        samples.push(houses[houses.length - 1]); // 最大
      }
      
      console.log('\n代表性案例:');
      samples.forEach((s, idx) => {
        console.log(`\n  案例 ${idx + 1}: ${s.house_id}`);
        console.log(`    屋顶容量: ${s.roofMaxKw.toFixed(2)} kW`);
        console.log(`    面板数量: ${s.panelCount} 块`);
        console.log(`    PV容量: ${s.pvKw.toFixed(2)} kW`);
        console.log(`    逆变器: ${s.inverter_kw} kW (容配比 ${s.ratio_percent}%)`);
        console.log(`    电池: ${s.battery_nominal_kwh} kWh (计算值: ${s.battery_calculated_nominal_kwh} kWh)`);
        console.log(`    电池方法: ${s.battery_method}`);
        console.log(`    日均发电: ${s.pv_day_kwh} kWh`);
        console.log(`    日均用电: ${s.load_day_kwh} kWh`);
        console.log(`    晚高峰需求: ${s.evening_kwh} kWh`);
        console.log(`    整夜需求: ${s.night_kwh} kWh`);
        console.log(`    光伏剩余: ${s.surplus_kwh} kWh`);
        console.log(`    最终价格: $${s.final_price_aud} AUD`);
      });
    }
  });
  
  // 输出详细案例到文件
  const outDir = path.dirname(tsvPath);
  const detailPath = path.join(outDir, 'boundary_cases_detail.txt');
  
  let detailContent = '========== V6 边界案例详细分析 ==========\n\n';
  
  Object.keys(categories).forEach(cat => {
    const houses = categories[cat];
    detailContent += `\n## ${categoryNames[cat]}\n`;
    detailContent += `房屋数量: ${houses.length}\n`;
    
    if (houses.length > 0) {
      houses.sort((a, b) => a.roofMaxKw - b.roofMaxKw);
      
      // 输出前5个和后5个
      const samples = [];
      for (let i = 0; i < Math.min(5, houses.length); i++) {
        samples.push(houses[i]);
      }
      if (houses.length > 10) {
        for (let i = Math.max(5, houses.length - 5); i < houses.length; i++) {
          samples.push(houses[i]);
        }
      } else if (houses.length > 5) {
        for (let i = 5; i < houses.length; i++) {
          samples.push(houses[i]);
        }
      }
      
      samples.forEach((s, idx) => {
        detailContent += `\n  案例 ${idx + 1}: ${s.house_id}\n`;
        detailContent += `    屋顶容量: ${s.roofMaxKw.toFixed(2)} kW\n`;
        detailContent += `    面板数量: ${s.panelCount} 块\n`;
        detailContent += `    PV容量: ${s.pvKw.toFixed(2)} kW\n`;
        detailContent += `    逆变器: ${s.inverter_kw} kW (容配比 ${s.ratio_percent}%)\n`;
        detailContent += `    电池: ${s.battery_nominal_kwh} kWh (计算值: ${s.battery_calculated_nominal_kwh} kWh)\n`;
        detailContent += `    电池方法: ${s.battery_method}\n`;
        detailContent += `    日均发电: ${s.pv_day_kwh} kWh\n`;
        detailContent += `    日均用电: ${s.load_day_kwh} kWh\n`;
        detailContent += `    晚高峰需求: ${s.evening_kwh} kWh\n`;
        detailContent += `    整夜需求: ${s.night_kwh} kWh\n`;
        detailContent += `    光伏剩余: ${s.surplus_kwh} kWh\n`;
        detailContent += `    最终价格: $${s.final_price_aud} AUD\n`;
      });
    }
  });
  
  fs.writeFileSync(detailPath, detailContent, 'utf-8');
  console.log(`\n\n✅ 详细分析已保存到: ${detailPath}`);
  
  // 统计摘要
  console.log('\n\n========== 统计摘要 ==========\n');
  Object.keys(categories).forEach(cat => {
    const houses = categories[cat];
    if (houses.length > 0) {
      const avgRoof = houses.reduce((sum, h) => sum + h.roofMaxKw, 0) / houses.length;
      const avgPv = houses.reduce((sum, h) => sum + h.pvKw, 0) / houses.length;
      const avgBat = houses.reduce((sum, h) => sum + parseFloat(h.battery_nominal_kwh), 0) / houses.length;
      
      console.log(`${categoryNames[cat]}:`);
      console.log(`  数量: ${houses.length}`);
      console.log(`  平均屋顶: ${avgRoof.toFixed(2)} kW`);
      console.log(`  平均PV: ${avgPv.toFixed(2)} kW`);
      console.log(`  平均电池: ${avgBat.toFixed(2)} kWh`);
      console.log('');
    }
  });
}

main();
