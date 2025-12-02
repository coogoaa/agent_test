// UI logic for Layout-based solar simulation
var currentConfig = null, simulationResult = null, layoutData = null, selectedMonth = -1, energyFlowChart = null, roiChart = null;
var isSimulatedMode = false;

document.addEventListener('DOMContentLoaded', function() {
    updateConfig(); addEventListeners(); showPlaceholderMessage(); updateEstimatedGeneration();
});

function showPlaceholderMessage() {
    document.getElementById('kpi-cards').innerHTML = '<div class="col-span-full bg-gray-800 p-8 rounded-lg text-center"><div class="text-6xl mb-4">📤</div><h3 class="text-xl font-semibold text-white mb-2">请先导入 Layout 数据或使用模拟数据</h3><p class="text-gray-400">上传 Layout JSON 文件、粘贴 JSON 数据，或点击"使用模拟数据"按钮</p></div>';
    ['energy-flow-viz','roi-viz','cash-flow-table','calculation-breakdown'].forEach(function(id){document.getElementById(id).innerHTML='';});
}

function updateConfig() {
    currentConfig = {
        state: document.getElementById('state').value,
        annualConsumption: parseFloat(document.getElementById('annualConsumption').value) || 10148,
        batteryCapacity: parseFloat(document.getElementById('batteryCapacity').value) || 10,
        investmentCost: parseFloat(document.getElementById('investmentCost').value) || 15000,
        electricityPrice: parseFloat(document.getElementById('electricityPrice').value) || 0.35,
        feedInTariff: parseFloat(document.getElementById('feedInTariff').value) || 0.07,
        priceInflation: parseFloat(document.getElementById('priceInflation').value) || 3.97,
        panelDegradation: parseFloat(document.getElementById('panelDegradation').value) || 0.4,
        dailyFixedCost: parseFloat(document.getElementById('dailyFixedCost').value) || 0.35,
        investmentYears: parseInt(document.getElementById('investmentYears').value) || 20,
        batteryReplacement: document.getElementById('batteryReplacement').checked,
        batteryReplacementYear: parseInt(document.getElementById('batteryReplacementYear').value) || 10,
        batteryReplacementCost: parseFloat(document.getElementById('batteryReplacementCost').value) || 5000,
        useDiscount: document.getElementById('useDiscount').checked,
        discountRate: parseFloat(document.getElementById('discountRate').value) || 1.36,
        systemPower: parseFloat(document.getElementById('systemPower').value) || 8,
        annualGenerationFactor: parseFloat(document.getElementById('annualGenerationFactor').value) || 1526
    };
}

function updateEstimatedGeneration() {
    var power = parseFloat(document.getElementById('systemPower').value) || 8;
    var factor = parseFloat(document.getElementById('annualGenerationFactor').value) || 1526;
    document.getElementById('estimated-generation').textContent = (power * factor).toLocaleString();
}

function addEventListeners() {
    var fileInput = document.getElementById('layout-file');
    fileInput.addEventListener('change', function(e) { if(e.target.files[0]) handleFile(e.target.files[0]); });
    var dropZone = fileInput.closest('label');
    dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('border-brand-secondary'); });
    dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('border-brand-secondary'); });
    dropZone.addEventListener('drop', function(e) { e.preventDefault(); dropZone.classList.remove('border-brand-secondary'); if(e.dataTransfer.files.length>0) handleFile(e.dataTransfer.files[0]); });
    
    document.getElementById('parse-layout-btn').addEventListener('click', handleTextParse);
    document.getElementById('clear-layout-btn').addEventListener('click', clearLayout);
    document.getElementById('use-simulated-btn').addEventListener('click', useSimulatedData);
    
    document.getElementById('systemPower').addEventListener('input', updateEstimatedGeneration);
    document.getElementById('annualGenerationFactor').addEventListener('input', updateEstimatedGeneration);
    document.getElementById('systemPower').addEventListener('change', function() { if(isSimulatedMode) useSimulatedData(); });
    document.getElementById('annualGenerationFactor').addEventListener('change', function() { if(isSimulatedMode) useSimulatedData(); });
    
    document.getElementById('state').addEventListener('change', function() { document.getElementById('annualConsumption').value = AUSTRALIAN_STATES_CONSUMPTION[this.value]; if(layoutData&&layoutData.isValid) calculate(); });
    document.getElementById('batteryReplacement').addEventListener('change', function() {
        var c = this.checked;
        document.getElementById('batteryReplacementLabel').textContent = c ? '更换电池' : '不更换电池';
        document.getElementById('batteryReplacementYearContainer').style.opacity = c ? '1' : '0.5';
        document.getElementById('batteryReplacementCostContainer').style.opacity = c ? '1' : '0.5';
        document.getElementById('batteryReplacementYear').disabled = !c;
        document.getElementById('batteryReplacementCost').disabled = !c;
        if(layoutData&&layoutData.isValid) calculate();
    });
    document.getElementById('useDiscount').addEventListener('change', function() {
        var c = this.checked;
        document.getElementById('useDiscountLabel').textContent = c ? '使用贴现' : '不贴现';
        document.getElementById('discountRate').disabled = !c;
        document.getElementById('discountRateContainer').style.opacity = c ? '1' : '0.5';
        if(layoutData&&layoutData.isValid) calculate();
    });
    document.querySelectorAll('input[type="number"], select').forEach(function(inp) { inp.addEventListener('change', function() { if(layoutData&&layoutData.isValid) calculate(); }); });
}

function handleFile(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('layout-text').value = e.target.result;
        document.getElementById('file-name').textContent = '已选择: ' + file.name;
        document.getElementById('file-name').classList.remove('hidden');
        parseLayoutAndCalculate(e.target.result);
    };
    reader.readAsText(file);
}

function handleTextParse() {
    var text = document.getElementById('layout-text').value.trim();
    if(!text) { alert('请输入 Layout JSON 数据'); return; }
    parseLayoutAndCalculate(text);
}

function clearLayout() {
    layoutData = null;
    isSimulatedMode = false;
    document.getElementById('layout-text').value = '';
    document.getElementById('file-name').classList.add('hidden');
    document.getElementById('layout-summary').classList.add('hidden');
    document.getElementById('simulated-params').classList.add('hidden');
    showPlaceholderMessage();
}

function useSimulatedData() {
    isSimulatedMode = true;
    updateConfig();
    layoutData = generateSimulatedLayoutData(currentConfig);
    document.getElementById('simulated-params').classList.remove('hidden');
    document.getElementById('layout-text').value = '';
    document.getElementById('file-name').classList.add('hidden');
    showLayoutSummary(layoutData);
    calculate();
}

function parseLayoutAndCalculate(jsonText) {
    isSimulatedMode = false;
    layoutData = parseLayoutData(jsonText);
    if(!layoutData.isValid) { alert('Layout 数据解析失败: ' + layoutData.error); return; }
    document.getElementById('simulated-params').classList.add('hidden');
    showLayoutSummary(layoutData);
    calculate();
}

function showLayoutSummary(data) {
    document.getElementById('layout-summary').classList.remove('hidden');
    var modeLabel = data.isSimulated ? '<span class="text-yellow-400">(模拟)</span>' : '';
    document.getElementById('layout-summary-content').innerHTML = 
        '<div class="bg-gray-700 p-4 rounded-lg"><p class="text-sm text-gray-400">项目 ID '+modeLabel+'</p><p class="text-2xl font-bold text-white">'+(data.projectId||'-')+'</p></div>'+
        '<div class="bg-gray-700 p-4 rounded-lg"><p class="text-sm text-gray-400">坡面数量</p><p class="text-2xl font-bold text-white">'+data.panels.length+'</p></div>'+
        '<div class="bg-gray-700 p-4 rounded-lg"><p class="text-sm text-gray-400">总面板数</p><p class="text-2xl font-bold text-white">'+data.totalPanels+'</p></div>'+
        '<div class="bg-gray-700 p-4 rounded-lg"><p class="text-sm text-gray-400">年总发电量</p><p class="text-2xl font-bold text-green-400">'+data.totalAnnualGeneration.toFixed(2)+' kWh</p></div>';
    var tb = '';
    data.panels.forEach(function(p) {
        tb += '<tr class="hover:bg-gray-700/50"><td class="px-4 py-3 font-semibold">坡面 '+p.index+'</td><td class="px-4 py-3 text-right font-mono">'+p.aspect.toFixed(2)+'</td><td class="px-4 py-3 text-right font-mono">'+p.slope.toFixed(2)+'</td><td class="px-4 py-3 text-right font-mono">'+p.panelCount+'</td><td class="px-4 py-3 text-right font-mono">'+p.singlePanelAnnualPower.toFixed(2)+'</td><td class="px-4 py-3 text-right font-mono text-green-400">'+p.totalAnnualPower.toFixed(2)+'</td></tr>';
    });
    document.getElementById('panel-details-body').innerHTML = tb;
    document.getElementById('total-panels').textContent = data.totalPanels;
    document.getElementById('total-generation').textContent = data.totalAnnualGeneration.toFixed(2) + ' kWh';
}

function calculate() {
    if(!layoutData||!layoutData.isValid) return;
    updateConfig();
    simulationResult = runLayoutSimulationWithDetails(currentConfig, layoutData);
    updateUI();
}

function updateUI() { updateKPICards(); updateEnergyFlowViz(); updateROIViz(); updateCashFlowTable(); updateCalculationBreakdown(); }

function updateKPICards() {
    var r = simulationResult, ud = currentConfig.useDiscount;
    var kpis = [
        {t:'自用率',v:(r.annualData.selfConsumptionRate*100).toFixed(1),u:'%',i:'⚡',c:'bg-green-600'},
        {t:ud?'回本周期 (贴现)':'回本周期',v:r.displayPaybackMonths?r.displayPaybackMonths.toFixed(1):'N/A',u:'月',i:'📅',c:'bg-blue-600',s:r.displayPaybackYears?'约 '+r.displayPaybackYears.toFixed(1)+' 年':''},
        {t:r.totalYears+'年IRR',v:r.irr?(r.irr*100).toFixed(1):'N/A',u:'%',i:'📈',c:'bg-purple-600',s:'基于实际现金流'},
        {t:'年发电量',v:(r.annualData.totalGeneration/1000).toFixed(2),u:'MWh',i:'☀️',c:'bg-yellow-600',s:r.annualData.totalGeneration.toFixed(0)+' kWh'}
    ];
    document.getElementById('kpi-cards').innerHTML = kpis.map(function(k){return '<div class="bg-gray-800 p-4 rounded-lg shadow-lg flex items-center space-x-4"><div class="p-3 rounded-full '+k.c+' text-3xl">'+k.i+'</div><div class="flex-1"><p class="text-sm text-gray-400">'+k.t+'</p><p class="text-2xl font-bold text-white">'+k.v+' <span class="text-lg font-normal text-gray-300">'+k.u+'</span></p>'+(k.s?'<p class="text-xs text-gray-500 mt-1">'+k.s+'</p>':'')+'</div></div>';}).join('');
}

function updateEnergyFlowViz() {
    var d = selectedMonth===-1 ? simulationResult.dayBaseData : (simulationResult.monthlyDayBaseData[selectedMonth]||simulationResult.dayBaseData);
    var title = selectedMonth===-1 ? '日均能量流' : MONTH_NAMES[selectedMonth]+'能量流';
    var opts = '<option value="-1">年度平均</option>'; 
    MONTH_NAMES.forEach(function(m,i){opts+='<option value="'+i+'"'+(i===selectedMonth?' selected':'')+'>'+m+'</option>';});
    
    document.getElementById('energy-flow-viz').innerHTML = 
        '<div class="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">'+
        '<h2 class="text-2xl font-bold text-white">'+title+'</h2>'+
        '<select id="month-selector" class="bg-gray-700 border border-gray-600 text-white rounded-lg p-2">'+opts+'</select></div>'+
        '<div class="border-b border-gray-700"><nav class="-mb-px flex space-x-2">'+
        '<button id="tab-chart" class="px-4 py-2 text-sm font-medium rounded-t-lg text-white bg-brand-secondary">小时图表</button>'+
        '<button id="tab-diagram" class="px-4 py-2 text-sm font-medium rounded-t-lg text-gray-400 hover:text-white hover:bg-gray-700">能量流向图</button>'+
        '</nav></div><div class="mt-6"><div id="chart-view" class="h-96"><canvas id="energy-flow-chart"></canvas></div>'+
        '<div id="diagram-view" class="hidden">'+renderEnergyFlowDiagram(d)+'</div></div>';
    
    document.getElementById('month-selector').addEventListener('change', function() { selectedMonth = parseInt(this.value); updateEnergyFlowViz(); });
    document.getElementById('tab-chart').addEventListener('click', function() { switchTab('chart'); });
    document.getElementById('tab-diagram').addEventListener('click', function() { switchTab('diagram'); });
    drawEnergyFlowChart(d);
}

function switchTab(t) {
    var cv = document.getElementById('chart-view'), dv = document.getElementById('diagram-view');
    var ct = document.getElementById('tab-chart'), dt = document.getElementById('tab-diagram');
    if(t==='chart') { 
        cv.classList.remove('hidden'); dv.classList.add('hidden'); 
        ct.className='px-4 py-2 text-sm font-medium rounded-t-lg text-white bg-brand-secondary'; 
        dt.className='px-4 py-2 text-sm font-medium rounded-t-lg text-gray-400 hover:text-white hover:bg-gray-700'; 
    } else { 
        cv.classList.add('hidden'); dv.classList.remove('hidden'); 
        dt.className='px-4 py-2 text-sm font-medium rounded-t-lg text-white bg-brand-secondary'; 
        ct.className='px-4 py-2 text-sm font-medium rounded-t-lg text-gray-400 hover:text-white hover:bg-gray-700'; 
    }
}

function renderEnergyFlowDiagram(d) {
    var tg = d.totalGeneration, tc = d.totalConsumption, ds = d.totalDirectSelfConsumption, fc = d.finalEffectiveCharge;
    var toGrid = Math.max(0, tg - ds - fc), fromGrid = Math.max(0, tc - ds - fc);
    return '<div class="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">'+
        '<div class="bg-gray-700/50 p-6 rounded-lg"><h3 class="text-lg font-semibold text-white mb-4 text-center">发电去向</h3>'+
        '<div class="space-y-4">'+
        '<div class="flex justify-between items-center"><span class="text-gray-300">☀️ 总发电</span><span class="font-mono text-white font-bold">'+tg.toFixed(2)+' kWh</span></div>'+
        '<div class="flex justify-between items-center"><span class="text-green-400">→ 直接自用</span><span class="font-mono text-green-400">'+ds.toFixed(2)+' kWh</span></div>'+
        '<div class="flex justify-between items-center"><span class="text-yellow-400">→ 充入电池</span><span class="font-mono text-yellow-400">'+fc.toFixed(2)+' kWh</span></div>'+
        '<div class="flex justify-between items-center"><span class="text-blue-400">→ 馈入电网</span><span class="font-mono text-blue-400">'+toGrid.toFixed(2)+' kWh</span></div>'+
        '</div></div>'+
        '<div class="bg-gray-700/50 p-6 rounded-lg"><h3 class="text-lg font-semibold text-white mb-4 text-center">用电来源</h3>'+
        '<div class="space-y-4">'+
        '<div class="flex justify-between items-center"><span class="text-gray-300">🏠 总用电</span><span class="font-mono text-white font-bold">'+tc.toFixed(2)+' kWh</span></div>'+
        '<div class="flex justify-between items-center"><span class="text-green-400">← 光伏直供</span><span class="font-mono text-green-400">'+ds.toFixed(2)+' kWh</span></div>'+
        '<div class="flex justify-between items-center"><span class="text-yellow-400">← 电池放电</span><span class="font-mono text-yellow-400">'+fc.toFixed(2)+' kWh</span></div>'+
        '<div class="flex justify-between items-center"><span class="text-red-400">← 电网购电</span><span class="font-mono text-red-400">'+fromGrid.toFixed(2)+' kWh</span></div>'+
        '</div></div></div>';
}

function drawEnergyFlowChart(data) {
    var ctx = document.getElementById('energy-flow-chart');
    if(!ctx) return;
    if(energyFlowChart) energyFlowChart.destroy();
    
    energyFlowChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.hourly.map(function(h){return h.hour+':00';}),
            datasets: [
                {label:'发电量',data:data.hourly.map(function(h){return h.generation.toFixed(2);}),borderColor:'rgb(245,158,11)',backgroundColor:'rgba(245,158,11,0.3)',fill:true,tension:0.4},
                {label:'用电量',data:data.hourly.map(function(h){return h.consumption.toFixed(2);}),borderColor:'rgb(59,130,246)',backgroundColor:'rgba(59,130,246,0.3)',fill:true,tension:0.4}
            ]
        },
        options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{legend:{labels:{color:'#a0aec0'}}},
            scales:{
                y:{beginAtZero:true,ticks:{color:'#a0aec0',callback:function(v){return v+' kWh';}},grid:{color:'#4a5568'}},
                x:{ticks:{color:'#a0aec0'},grid:{color:'#4a5568'}}
            }
        }
    });
}

function updateROIViz() {
    var proj = simulationResult.yearlyProjection;
    var totalYears = simulationResult.totalYears;
    
    document.getElementById('roi-viz').innerHTML = 
        '<h2 class="text-2xl font-bold text-white mb-6">'+totalYears+'年财务预测</h2>'+
        '<div class="h-96"><canvas id="roi-chart"></canvas></div>';
    
    drawROIChart(proj);
}

function drawROIChart(proj) {
    var ctx = document.getElementById('roi-chart');
    if(!ctx) return;
    if(roiChart) roiChart.destroy();
    
    roiChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: proj.map(function(p){return '第'+p.year+'年';}),
            datasets: [
                {label:'年度净节省',type:'bar',data:proj.map(function(p){return p.netSavings.toFixed(0);}),backgroundColor:'rgba(59,130,246,0.6)',borderColor:'rgb(59,130,246)',borderWidth:1},
                {label:'累计节省',type:'line',data:proj.map(function(p){return p.cumulativeSavings.toFixed(0);}),borderColor:'rgb(245,158,11)',backgroundColor:'rgba(245,158,11,0.1)',borderWidth:2,fill:false},
                {label:'累计节省(贴现)',type:'line',data:proj.map(function(p){return p.cumulativeDiscountedSavings.toFixed(0);}),borderColor:'rgb(13,148,136)',borderWidth:2,borderDash:[5,5],fill:false}
            ]
        },
        options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{legend:{labels:{color:'#a0aec0'}},tooltip:{callbacks:{label:function(c){return c.dataset.label+': $'+parseFloat(c.parsed.y).toLocaleString();}}}},
            scales:{
                y:{beginAtZero:true,ticks:{color:'#a0aec0',callback:function(v){return '$'+v.toLocaleString();}},grid:{color:'#4a5568'}},
                x:{ticks:{color:'#a0aec0'},grid:{color:'#4a5568'}}
            }
        }
    });
}

function updateCashFlowTable() {
    var proj = simulationResult.yearlyProjection;
    var totalYears = simulationResult.totalYears;
    var inv = currentConfig.investmentCost;
    
    var rows = '<tr class="bg-red-900/20 font-semibold"><td class="px-4 py-3 sticky left-0 bg-red-900/20">第 0 年</td><td class="px-4 py-3 text-right text-red-400">-$'+inv.toLocaleString()+'</td><td class="px-4 py-3 text-right text-red-400">-$'+inv.toLocaleString()+'</td><td class="px-4 py-3 text-right text-red-400">-$'+inv.toLocaleString()+'</td><td class="px-4 py-3 text-right text-gray-500">-</td><td class="px-4 py-3 text-right text-gray-500">-</td><td class="px-4 py-3 text-right text-gray-500">-</td><td class="px-4 py-3 text-right text-gray-500">-</td></tr>';
    
    proj.forEach(function(y) {
        var isBreakeven = y.cumulativeSavings >= inv && (y.year === 1 || proj[y.year-2].cumulativeSavings < inv);
        rows += '<tr class="hover:bg-gray-700/50 '+(isBreakeven?'bg-green-900/20':'')+'">'+
            '<td class="px-4 py-3 font-semibold sticky left-0 '+(isBreakeven?'bg-green-900/20':'bg-gray-800')+'">第 '+y.year+' 年'+(isBreakeven?' <span class="ml-2 text-green-400">✓ 回本</span>':'')+'</td>'+
            '<td class="px-4 py-3 text-right font-mono text-green-400">$'+y.netSavings.toLocaleString('en-US',{maximumFractionDigits:0})+'</td>'+
            '<td class="px-4 py-3 text-right font-mono '+(y.cumulativeSavings>=inv?'text-green-400 font-bold':'text-yellow-400')+'">$'+y.cumulativeSavings.toLocaleString('en-US',{maximumFractionDigits:0})+'</td>'+
            '<td class="px-4 py-3 text-right font-mono '+(y.cumulativeDiscountedSavings>=inv?'text-green-400 font-bold':'text-teal-400')+'">$'+y.cumulativeDiscountedSavings.toLocaleString('en-US',{maximumFractionDigits:0})+'</td>'+
            '<td class="px-4 py-3 text-right font-mono text-gray-400">$'+y.costWithoutSolar.toLocaleString('en-US',{maximumFractionDigits:0})+'</td>'+
            '<td class="px-4 py-3 text-right font-mono text-gray-400">$'+y.costWithSolar.toLocaleString('en-US',{maximumFractionDigits:0})+'</td>'+
            '<td class="px-4 py-3 text-right font-mono text-blue-400">$'+y.revenueFromGrid.toLocaleString('en-US',{maximumFractionDigits:0})+'</td>'+
            '<td class="px-4 py-3 text-right font-mono text-yellow-400">$'+y.batteryAmortization.toLocaleString('en-US',{maximumFractionDigits:0})+'</td></tr>';
    });
    
    var lastY = proj[proj.length-1];
    var totalNet = proj.reduce(function(s,y){return s+y.netSavings;},0);
    var totalCostWithout = proj.reduce(function(s,y){return s+y.costWithoutSolar;},0);
    var totalCostWith = proj.reduce(function(s,y){return s+y.costWithSolar;},0);
    var totalRevenue = proj.reduce(function(s,y){return s+y.revenueFromGrid;},0);
    var totalBattery = currentConfig.batteryReplacement ? currentConfig.batteryReplacementCost : 0;
    
    document.getElementById('cash-flow-table').innerHTML = 
        '<div class="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">'+
        '<h2 class="text-2xl font-bold text-white">'+totalYears+'年现金流明细</h2>'+
        '<button id="export-csv" class="bg-brand-secondary hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">📊 导出 CSV</button></div>'+
        '<div class="overflow-x-auto"><table class="w-full text-sm text-left">'+
        '<thead class="text-xs uppercase bg-gray-700 text-gray-300"><tr>'+
        '<th class="px-4 py-3 sticky left-0 bg-gray-700">年份</th>'+
        '<th class="px-4 py-3 text-right">年度净节省</th>'+
        '<th class="px-4 py-3 text-right">累计节省</th>'+
        '<th class="px-4 py-3 text-right">累计节省(贴现)</th>'+
        '<th class="px-4 py-3 text-right">安装前成本</th>'+
        '<th class="px-4 py-3 text-right">安装后成本</th>'+
        '<th class="px-4 py-3 text-right">售电收入</th>'+
        '<th class="px-4 py-3 text-right">电池分摊</th></tr></thead>'+
        '<tbody class="divide-y divide-gray-700">'+rows+'</tbody>'+
        '<tfoot class="bg-gray-700 font-bold"><tr>'+
        '<td class="px-4 py-3 sticky left-0 bg-gray-700">'+totalYears+'年总计</td>'+
        '<td class="px-4 py-3 text-right text-green-400">$'+totalNet.toLocaleString('en-US',{maximumFractionDigits:0})+'</td>'+
        '<td class="px-4 py-3 text-right text-green-400">$'+lastY.cumulativeSavings.toLocaleString('en-US',{maximumFractionDigits:0})+'</td>'+
        '<td class="px-4 py-3 text-right text-teal-400">$'+lastY.cumulativeDiscountedSavings.toLocaleString('en-US',{maximumFractionDigits:0})+'</td>'+
        '<td class="px-4 py-3 text-right text-gray-400">$'+totalCostWithout.toLocaleString('en-US',{maximumFractionDigits:0})+'</td>'+
        '<td class="px-4 py-3 text-right text-gray-400">$'+totalCostWith.toLocaleString('en-US',{maximumFractionDigits:0})+'</td>'+
        '<td class="px-4 py-3 text-right text-blue-400">$'+totalRevenue.toLocaleString('en-US',{maximumFractionDigits:0})+'</td>'+
        '<td class="px-4 py-3 text-right text-yellow-400">$'+totalBattery.toLocaleString('en-US',{maximumFractionDigits:0})+'</td></tr></tfoot></table></div>'+
        '<div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">'+
        '<div class="bg-gray-700/50 p-4 rounded-lg"><p class="text-sm text-gray-400 mb-1">'+totalYears+'年净收益</p><p class="text-2xl font-bold text-green-400">$'+(lastY.cumulativeSavings-inv).toLocaleString('en-US',{maximumFractionDigits:0})+'</p></div>'+
        '<div class="bg-gray-700/50 p-4 rounded-lg"><p class="text-sm text-gray-400 mb-1">投资回报倍数</p><p class="text-2xl font-bold text-purple-400">'+(lastY.cumulativeSavings/inv).toFixed(2)+'x</p></div>'+
        '<div class="bg-gray-700/50 p-4 rounded-lg"><p class="text-sm text-gray-400 mb-1">年均节省</p><p class="text-2xl font-bold text-blue-400">$'+(totalNet/totalYears).toLocaleString('en-US',{maximumFractionDigits:0})+'</p></div></div>';
    
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
}

function exportToCSV() {
    var proj = simulationResult.yearlyProjection;
    var csv = 'Year,Net Savings,Cumulative Savings,Cumulative Discounted,Cost Without Solar,Cost With Solar,Revenue From Grid,Battery Amortization\n';
    csv += '0,-'+currentConfig.investmentCost+',-'+currentConfig.investmentCost+',-'+currentConfig.investmentCost+',0,0,0,0\n';
    proj.forEach(function(y) {
        csv += y.year+','+y.netSavings.toFixed(2)+','+y.cumulativeSavings.toFixed(2)+','+y.cumulativeDiscountedSavings.toFixed(2)+','+y.costWithoutSolar.toFixed(2)+','+y.costWithSolar.toFixed(2)+','+y.revenueFromGrid.toFixed(2)+','+y.batteryAmortization.toFixed(2)+'\n';
    });
    var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'solar_roi_'+simulationResult.totalYears+'years.csv';
    link.click();
}

function updateCalculationBreakdown() {
    var r = simulationResult, c = currentConfig;
    var details = r.calculationDetails;
    
    if (!details) {
        document.getElementById('calculation-breakdown').innerHTML = '<p class="text-gray-400">计算详情不可用</p>';
        return;
    }
    
    var html = '<h2 class="text-2xl font-bold text-white mb-6">📋 详细计算过程</h2>';
    
    // 计算步骤导航
    html += '<div class="mb-6 flex flex-wrap gap-2">';
    html += '<button class="calc-step-btn px-3 py-1 rounded bg-brand-secondary text-white text-sm" data-step="params">输入参数</button>';
    html += '<button class="calc-step-btn px-3 py-1 rounded bg-gray-600 text-white text-sm" data-step="layout">Layout解析</button>';
    html += '<button class="calc-step-btn px-3 py-1 rounded bg-gray-600 text-white text-sm" data-step="consumption">用电分布</button>';
    html += '<button class="calc-step-btn px-3 py-1 rounded bg-gray-600 text-white text-sm" data-step="monthly">月度能量</button>';
    html += '<button class="calc-step-btn px-3 py-1 rounded bg-gray-600 text-white text-sm" data-step="annual">年度汇总</button>';
    html += '<button class="calc-step-btn px-3 py-1 rounded bg-gray-600 text-white text-sm" data-step="financial">财务参数</button>';
    html += '<button class="calc-step-btn px-3 py-1 rounded bg-gray-600 text-white text-sm" data-step="cashflow">月度现金流</button>';
    html += '<button class="calc-step-btn px-3 py-1 rounded bg-gray-600 text-white text-sm" data-step="irr">IRR计算</button>';
    html += '</div>';
    
    // Step 1: 输入参数
    html += '<div id="calc-step-params" class="calc-step-content">';
    html += renderStepCard('Step 1: 输入参数', '用户输入的基础参数', [
        ['州/领地', c.state],
        ['年用电量', c.annualConsumption.toLocaleString() + ' kWh'],
        ['电池容量', c.batteryCapacity + ' kWh'],
        ['总投资成本', '$' + c.investmentCost.toLocaleString()],
        ['购电价', '$' + c.electricityPrice + '/kWh'],
        ['上网电价', '$' + c.feedInTariff + '/kWh'],
        ['电价通胀率', c.priceInflation + '%/年'],
        ['面板衰减率', c.panelDegradation + '%/年'],
        ['日固定费用', '$' + c.dailyFixedCost],
        ['投资年限', c.investmentYears + ' 年'],
        ['电池更换', c.batteryReplacement ? '第' + c.batteryReplacementYear + '年更换，$' + c.batteryReplacementCost : '不更换'],
        ['贴现率', c.useDiscount ? c.discountRate + '%' : '不使用贴现']
    ]);
    html += '</div>';
    
    // Step 2: Layout 解析
    html += '<div id="calc-step-layout" class="calc-step-content hidden">';
    var layoutStep = details.steps.find(function(s){return s.step===2;});
    if (layoutStep) {
        var layoutRows = [
            ['数据来源', layoutStep.data.isSimulated ? '模拟数据' : '导入的 Layout'],
            ['坡面数量', layoutStep.data.panelCount],
            ['总面板数', layoutStep.data.totalPanels],
            ['年总发电量', layoutStep.data.totalAnnualGeneration.toFixed(2) + ' kWh']
        ];
        layoutStep.data.panels.forEach(function(p) {
            layoutRows.push(['坡面 ' + p.index, '方位角 ' + p.aspect.toFixed(1) + '°, 坡度 ' + p.slope.toFixed(1) + '°, ' + p.panelCount + ' 块面板, ' + p.totalAnnualPower.toFixed(2) + ' kWh/年']);
        });
        html += renderStepCard('Step 2: Layout 数据解析', layoutStep.description, layoutRows);
    }
    html += '</div>';
    
    // Step 3: 用电分布
    html += '<div id="calc-step-consumption" class="calc-step-content hidden">';
    var consStep = details.steps.find(function(s){return s.step===3;});
    if (consStep) {
        html += '<div class="bg-gray-700/50 p-4 rounded-lg mb-4">';
        html += '<h3 class="font-semibold text-white mb-2">Step 3: 月度用电量分布</h3>';
        html += '<p class="text-sm text-gray-400 mb-2">' + consStep.description + '</p>';
        html += '<p class="text-xs text-blue-400 mb-3 font-mono">公式: ' + consStep.formula + '</p>';
        html += '<div class="overflow-x-auto"><table class="w-full text-xs">';
        html += '<thead class="bg-gray-600"><tr><th class="px-2 py-1">月份</th><th class="px-2 py-1 text-right">比例%</th><th class="px-2 py-1 text-right">月用电量</th><th class="px-2 py-1 text-right">天数</th><th class="px-2 py-1 text-right">日用电量</th></tr></thead><tbody>';
        consStep.data.forEach(function(m) {
            html += '<tr class="border-t border-gray-600"><td class="px-2 py-1">' + m.monthName + '</td><td class="px-2 py-1 text-right">' + m.percentage.toFixed(2) + '%</td><td class="px-2 py-1 text-right">' + m.monthlyConsumption.toFixed(2) + ' kWh</td><td class="px-2 py-1 text-right">' + m.daysInMonth + '</td><td class="px-2 py-1 text-right">' + m.dailyConsumption.toFixed(2) + ' kWh</td></tr>';
        });
        html += '</tbody></table></div></div>';
        
        // 小时用电分布
        var hourStep = details.steps.find(function(s){return s.step===4;});
        if (hourStep) {
            html += '<div class="bg-gray-700/50 p-4 rounded-lg">';
            html += '<h3 class="font-semibold text-white mb-2">Step 4: 小时用电分布 (' + c.state + ')</h3>';
            html += '<div class="overflow-x-auto"><table class="w-full text-xs">';
            html += '<thead class="bg-gray-600"><tr><th class="px-1 py-1">时</th>';
            for(var h=0;h<24;h++) html += '<th class="px-1 py-1">' + h + '</th>';
            html += '</tr></thead><tbody><tr><td class="px-1 py-1">%</td>';
            hourStep.data.forEach(function(d) { html += '<td class="px-1 py-1 text-center">' + d.percentage.toFixed(1) + '</td>'; });
            html += '</tr></tbody></table></div></div>';
        }
    }
    html += '</div>';
    
    // Step 4: 月度能量计算
    html += '<div id="calc-step-monthly" class="calc-step-content hidden">';
    html += '<div class="bg-gray-700/50 p-4 rounded-lg">';
    html += '<h3 class="font-semibold text-white mb-2">Step 5-16: 月度能量计算详情</h3>';
    html += '<p class="text-sm text-gray-400 mb-3">每月每小时的发电、用电、自用计算</p>';
    html += '<div class="mb-3"><select id="monthly-detail-selector" class="bg-gray-600 text-white rounded px-2 py-1 text-sm">';
    MONTH_NAMES.forEach(function(m,i) { html += '<option value="' + i + '">' + m + '</option>'; });
    html += '</select></div>';
    html += '<div id="monthly-detail-content"></div>';
    html += '</div></div>';
    
    // Step 5: 年度汇总
    html += '<div id="calc-step-annual" class="calc-step-content hidden">';
    var annualStep = details.steps.find(function(s){return s.step===5;});
    if (annualStep) {
        html += '<div class="bg-gray-700/50 p-4 rounded-lg">';
        html += '<h3 class="font-semibold text-white mb-2">Step 17: 年度能量汇总</h3>';
        html += '<div class="text-xs text-blue-400 mb-3 font-mono">';
        annualStep.formulas.forEach(function(f) { html += '<div>' + f + '</div>'; });
        html += '</div>';
        html += '<div class="grid grid-cols-2 md:grid-cols-3 gap-3">';
        html += '<div class="bg-gray-600 p-3 rounded"><p class="text-xs text-gray-400">年发电量</p><p class="text-lg font-bold text-yellow-400">' + annualStep.data.totalGeneration.toFixed(2) + ' kWh</p></div>';
        html += '<div class="bg-gray-600 p-3 rounded"><p class="text-xs text-gray-400">年用电量</p><p class="text-lg font-bold text-blue-400">' + annualStep.data.totalConsumption.toFixed(2) + ' kWh</p></div>';
        html += '<div class="bg-gray-600 p-3 rounded"><p class="text-xs text-gray-400">年自用量</p><p class="text-lg font-bold text-green-400">' + annualStep.data.totalSelfConsumption.toFixed(2) + ' kWh</p></div>';
        html += '<div class="bg-gray-600 p-3 rounded"><p class="text-xs text-gray-400">年馈网量</p><p class="text-lg font-bold text-cyan-400">' + annualStep.data.toGrid.toFixed(2) + ' kWh</p></div>';
        html += '<div class="bg-gray-600 p-3 rounded"><p class="text-xs text-gray-400">年购电量</p><p class="text-lg font-bold text-red-400">' + annualStep.data.fromGrid.toFixed(2) + ' kWh</p></div>';
        html += '<div class="bg-gray-600 p-3 rounded"><p class="text-xs text-gray-400">自用率</p><p class="text-lg font-bold text-green-400">' + (annualStep.data.selfConsumptionRate * 100).toFixed(2) + '%</p></div>';
        html += '</div></div>';
    }
    html += '</div>';
    
    // Step 6: 财务参数
    html += '<div id="calc-step-financial" class="calc-step-content hidden">';
    var finStep = details.steps.find(function(s){return s.step===6;});
    if (finStep) {
        html += '<div class="bg-gray-700/50 p-4 rounded-lg">';
        html += '<h3 class="font-semibold text-white mb-2">Step 18: 财务计算参数</h3>';
        html += '<div class="text-xs text-blue-400 mb-3 font-mono space-y-1">';
        finStep.formulas.forEach(function(f) { html += '<div>' + f + '</div>'; });
        html += '</div>';
        html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">';
        html += '<div><span class="text-gray-400">总月数:</span> <span class="text-white">' + finStep.data.totalMonths + '</span></div>';
        html += '<div><span class="text-gray-400">电池更换:</span> <span class="text-white">' + (finStep.data.replaceBattery ? '第' + finStep.data.batteryReplacementYear + '年' : '否') + '</span></div>';
        html += '<div><span class="text-gray-400">电池成本:</span> <span class="text-white">$' + finStep.data.batteryReplacementCost + '</span></div>';
        html += '<div><span class="text-gray-400">月分摊:</span> <span class="text-white">$' + finStep.data.monthlyBatteryAmortization.toFixed(2) + '</span></div>';
        html += '</div></div>';
    }
    html += '</div>';
    
    // Step 7: 月度现金流
    html += '<div id="calc-step-cashflow" class="calc-step-content hidden">';
    html += '<div class="bg-gray-700/50 p-4 rounded-lg">';
    html += '<h3 class="font-semibold text-white mb-2">Step 19: 月度现金流计算</h3>';
    html += '<p class="text-xs text-gray-400 mb-2">显示前 24 个月的详细计算过程</p>';
    html += '<div class="text-xs text-blue-400 mb-3 font-mono">';
    html += '<div>月度电价 = 初始电价 × (月通胀因子)^(月数-1)</div>';
    html += '<div>月度发电量 = 基准发电量 × (月衰减因子)^(月数-1) × 当月天数</div>';
    html += '<div>安装前成本 = 月用电量 × 当月电价 + 天数 × 日固定费</div>';
    html += '<div>安装后成本 = 月购电量 × 当月电价 + 天数 × 日固定费</div>';
    html += '<div>月度节省 = 安装前成本 - 安装后成本 + 售电收入 - 电池分摊</div>';
    html += '</div>';
    html += '<div class="overflow-x-auto"><table class="w-full text-xs">';
    html += '<thead class="bg-gray-600"><tr><th class="px-2 py-1">月</th><th class="px-2 py-1">年.月</th><th class="px-2 py-1 text-right">电价</th><th class="px-2 py-1 text-right">衰减</th><th class="px-2 py-1 text-right">发电量</th><th class="px-2 py-1 text-right">安装前</th><th class="px-2 py-1 text-right">安装后</th><th class="px-2 py-1 text-right">售电</th><th class="px-2 py-1 text-right">电池摊</th><th class="px-2 py-1 text-right">月节省</th><th class="px-2 py-1 text-right">累计</th></tr></thead><tbody>';
    var monthlyProj = r.monthlyProjection.slice(0, 24);
    monthlyProj.forEach(function(m) {
        html += '<tr class="border-t border-gray-600">';
        html += '<td class="px-2 py-1">' + m.month + '</td>';
        html += '<td class="px-2 py-1">' + m.year + '.' + m.monthInYear + '</td>';
        html += '<td class="px-2 py-1 text-right">$' + m.currentElectricityPrice.toFixed(3) + '</td>';
        html += '<td class="px-2 py-1 text-right">' + (m.currentDegradation * 100).toFixed(2) + '%</td>';
        html += '<td class="px-2 py-1 text-right">' + m.monthlyGeneration.toFixed(1) + '</td>';
        html += '<td class="px-2 py-1 text-right">$' + m.costWithoutSolar.toFixed(0) + '</td>';
        html += '<td class="px-2 py-1 text-right">$' + m.costWithSolar.toFixed(0) + '</td>';
        html += '<td class="px-2 py-1 text-right">$' + m.revenueFromGrid.toFixed(0) + '</td>';
        html += '<td class="px-2 py-1 text-right">$' + m.batteryAmortization.toFixed(0) + '</td>';
        html += '<td class="px-2 py-1 text-right text-green-400">$' + m.monthlySavings.toFixed(0) + '</td>';
        html += '<td class="px-2 py-1 text-right text-yellow-400">$' + m.cumulativeSavings.toFixed(0) + '</td>';
        html += '</tr>';
    });
    html += '</tbody></table></div></div></div>';
    
    // Step 8: IRR 计算
    html += '<div id="calc-step-irr" class="calc-step-content hidden">';
    var irrStep = details.steps.find(function(s){return s.step===7;});
    var paybackStep = details.steps.find(function(s){return s.step===8;});
    if (irrStep) {
        html += '<div class="bg-gray-700/50 p-4 rounded-lg mb-4">';
        html += '<h3 class="font-semibold text-white mb-2">Step 20: IRR 内部收益率计算</h3>';
        html += '<p class="text-xs text-blue-400 mb-3 font-mono">' + irrStep.formula + '</p>';
        html += '<div class="mb-3"><span class="text-gray-400">现金流序列 (前6年):</span></div>';
        html += '<div class="flex flex-wrap gap-2 mb-3">';
        irrStep.data.cashFlowsPreview.forEach(function(cf) {
            var color = parseFloat(cf.cashFlow) < 0 ? 'text-red-400' : 'text-green-400';
            html += '<div class="bg-gray-600 px-2 py-1 rounded text-xs"><span class="text-gray-400">Y' + cf.year + ':</span> <span class="' + color + ' font-mono">$' + parseFloat(cf.cashFlow).toLocaleString() + '</span></div>';
        });
        html += '</div>';
        html += '<div class="text-2xl font-bold text-purple-400">IRR = ' + irrStep.data.irrPercent + '</div>';
        html += '</div>';
    }
    if (paybackStep) {
        html += '<div class="bg-gray-700/50 p-4 rounded-lg">';
        html += '<h3 class="font-semibold text-white mb-2">Step 21: 回本周期计算</h3>';
        html += '<div class="text-xs text-blue-400 mb-3 font-mono">';
        paybackStep.formulas.forEach(function(f) { html += '<div>' + f + '</div>'; });
        html += '</div>';
        html += '<div class="grid grid-cols-2 gap-4">';
        html += '<div class="bg-gray-600 p-3 rounded"><p class="text-xs text-gray-400">简单回本周期</p><p class="text-lg font-bold text-blue-400">' + paybackStep.data.paybackPeriodYears + ' 年</p><p class="text-xs text-gray-500">' + (paybackStep.data.paybackPeriodMonths ? paybackStep.data.paybackPeriodMonths.toFixed(1) + ' 月' : 'N/A') + '</p></div>';
        html += '<div class="bg-gray-600 p-3 rounded"><p class="text-xs text-gray-400">贴现回本周期</p><p class="text-lg font-bold text-teal-400">' + paybackStep.data.discountedPaybackPeriodYears + ' 年</p><p class="text-xs text-gray-500">' + (paybackStep.data.discountedPaybackPeriodMonths ? paybackStep.data.discountedPaybackPeriodMonths.toFixed(1) + ' 月' : 'N/A') + '</p></div>';
        html += '</div></div>';
    }
    html += '</div>';
    
    document.getElementById('calculation-breakdown').innerHTML = html;
    
    // 添加步骤切换事件
    document.querySelectorAll('.calc-step-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var step = this.getAttribute('data-step');
            document.querySelectorAll('.calc-step-btn').forEach(function(b) { b.className = 'calc-step-btn px-3 py-1 rounded bg-gray-600 text-white text-sm'; });
            this.className = 'calc-step-btn px-3 py-1 rounded bg-brand-secondary text-white text-sm';
            document.querySelectorAll('.calc-step-content').forEach(function(c) { c.classList.add('hidden'); });
            document.getElementById('calc-step-' + step).classList.remove('hidden');
        });
    });
    
    // 月度详情选择器
    var monthSelector = document.getElementById('monthly-detail-selector');
    if (monthSelector) {
        monthSelector.addEventListener('change', function() { renderMonthlyDetail(parseInt(this.value)); });
        renderMonthlyDetail(0);
    }
}

function renderStepCard(title, desc, rows) {
    var html = '<div class="bg-gray-700/50 p-4 rounded-lg mb-4">';
    html += '<h3 class="font-semibold text-white mb-2">' + title + '</h3>';
    html += '<p class="text-sm text-gray-400 mb-3">' + desc + '</p>';
    html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">';
    rows.forEach(function(r) {
        html += '<div class="flex justify-between"><span class="text-gray-400">' + r[0] + '</span><span class="text-white font-mono">' + r[1] + '</span></div>';
    });
    html += '</div></div>';
    return html;
}

function renderMonthlyDetail(monthIndex) {
    var details = simulationResult.calculationDetails;
    var monthData = details.monthlyDetails[monthIndex];
    if (!monthData) return;
    
    var html = '<div class="mb-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">';
    html += '<div><span class="text-gray-400">日发电:</span> <span class="text-yellow-400">' + monthData.totalGeneration.toFixed(2) + ' kWh</span></div>';
    html += '<div><span class="text-gray-400">日用电:</span> <span class="text-blue-400">' + monthData.totalConsumption.toFixed(2) + ' kWh</span></div>';
    html += '<div><span class="text-gray-400">日自用:</span> <span class="text-green-400">' + monthData.totalSelfConsumption.toFixed(2) + ' kWh</span></div>';
    html += '<div><span class="text-gray-400">自用率:</span> <span class="text-green-400">' + monthData.selfConsumptionRate.toFixed(1) + '%</span></div>';
    html += '</div>';
    
    html += '<div class="overflow-x-auto"><table class="w-full text-xs">';
    html += '<thead class="bg-gray-600"><tr><th class="px-1 py-1">时</th><th class="px-1 py-1 text-right">发电</th><th class="px-1 py-1 text-right">用电</th><th class="px-1 py-1 text-right">直接自用</th><th class="px-1 py-1 text-right">余电</th><th class="px-1 py-1 text-right">缺电</th></tr></thead><tbody>';
    monthData.hourly.forEach(function(h) {
        html += '<tr class="border-t border-gray-600">';
        html += '<td class="px-1 py-1">' + h.hour + ':00</td>';
        html += '<td class="px-1 py-1 text-right text-yellow-400">' + h.generation.toFixed(3) + '</td>';
        html += '<td class="px-1 py-1 text-right text-blue-400">' + h.consumption.toFixed(3) + '</td>';
        html += '<td class="px-1 py-1 text-right text-green-400">' + h.directSelfConsumption.toFixed(3) + '</td>';
        html += '<td class="px-1 py-1 text-right text-cyan-400">' + h.surplus.toFixed(3) + '</td>';
        html += '<td class="px-1 py-1 text-right text-red-400">' + h.deficit.toFixed(3) + '</td>';
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    
    html += '<div class="mt-3 p-2 bg-gray-600 rounded text-xs">';
    html += '<div class="font-semibold text-white mb-1">电池充放电计算:</div>';
    html += '<div class="text-gray-300">可充电量 = min(余电总量, 电池容量, 非发电时段用电量)</div>';
    html += '<div class="text-gray-300">= min(' + monthData.totalToBatteryPotential.toFixed(2) + ', ' + currentConfig.batteryCapacity + ', ' + monthData.nonGenerationConsumption.toFixed(2) + ')</div>';
    html += '<div class="text-green-400 font-semibold">= ' + monthData.effectiveBatteryCharge.toFixed(2) + ' kWh</div>';
    html += '</div>';
    
    document.getElementById('monthly-detail-content').innerHTML = html;
}
