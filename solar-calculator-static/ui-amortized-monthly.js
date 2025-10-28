// UI and interaction logic

let currentConfig = null;
let simulationResult = null;
let selectedMonth = -1; // -1 for annual average
let energyFlowChart = null;
let roiChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize config from inputs
    updateConfig();
    
    // Add event listeners
    addEventListeners();
    
    // Run initial calculation
    calculate();
});

function updateConfig() {
    const annualGeneration = parseFloat(document.getElementById('annualGeneration').value) || 0;
    const systemPower = parseFloat(document.getElementById('systemPower').value) || 8;
    const annualGenerationFactor = parseFloat(document.getElementById('annualGenerationFactor').value) || 1526;
    
    currentConfig = {
        state: document.getElementById('state').value,
        annualConsumption: parseFloat(document.getElementById('annualConsumption').value) || 5662,
        systemPower: systemPower,
        annualGenerationFactor: annualGenerationFactor,
        annualGeneration: annualGeneration > 0 ? annualGeneration : (systemPower * annualGenerationFactor),
        batteryCapacity: parseFloat(document.getElementById('batteryCapacity').value) || 10,
        investmentCost: parseFloat(document.getElementById('investmentCost').value) || 15000,
        electricityPrice: parseFloat(document.getElementById('electricityPrice').value) || 0.3,
        feedInTariff: parseFloat(document.getElementById('feedInTariff').value) || 0.07,
        priceInflation: parseFloat(document.getElementById('priceInflation').value) || 3.97,
        panelDegradation: parseFloat(document.getElementById('panelDegradation').value) || 0.4,
        dailyFixedCost: parseFloat(document.getElementById('dailyFixedCost').value) || 0.35,
        batteryReplacementCost: parseFloat(document.getElementById('batteryReplacementCost').value) || 5000,
        discountRate: parseFloat(document.getElementById('discountRate').value) || 1.36
    };
}

function addEventListeners() {
    // State selector - update consumption when state changes
    document.getElementById('state').addEventListener('change', function() {
        const state = this.value;
        document.getElementById('annualConsumption').value = AUSTRALIAN_STATES_CONSUMPTION[state];
        calculate();
    });
    
    // All inputs - recalculate on change
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', calculate);
    });
}

function calculate() {
    updateConfig();
    simulationResult = runSolarSimulation(currentConfig);
    updateUI();
}

function updateUI() {
    updateKPICards();
    updateEnergyFlowViz();
    updateROIViz();
    updateCashFlowTable();
    updateCalculationBreakdown();
}

function updateKPICards() {
    const { annualData, paybackPeriod, paybackPeriodAmortized, discountedPaybackPeriod, discountedPaybackPeriodAmortized, 
            paybackPeriodMonths, discountedPaybackPeriodMonths, irr } = simulationResult;
    
    const kpiData = [
        {
            title: '自用率',
            value: (annualData.selfConsumptionRate * 100).toFixed(1),
            unit: '%',
            icon: '⚡',
            colorClass: 'bg-green-600'
        },
        {
            title: '回本周期 (月度计算)',
            value: paybackPeriodMonths ? paybackPeriodMonths.toFixed(1) : 'N/A',
            unit: '月',
            icon: '📅',
            colorClass: 'bg-blue-600',
            subtitle: `约 ${paybackPeriod ? paybackPeriod.toFixed(1) : 'N/A'} 年`
        },
        {
            title: '回本周期 (贴现月度)',
            value: discountedPaybackPeriodMonths ? discountedPaybackPeriodMonths.toFixed(1) : 'N/A',
            unit: '月',
            icon: '💰',
            colorClass: 'bg-teal-600',
            subtitle: `约 ${discountedPaybackPeriod ? discountedPaybackPeriod.toFixed(1) : 'N/A'} 年`
        },
        {
            title: '20年内部收益率 (IRR)',
            value: irr ? (irr * 100).toFixed(1) : 'N/A',
            unit: '%',
            icon: '📈',
            colorClass: 'bg-purple-600',
            subtitle: '基于实际现金流'
        },
        {
            title: '年发电量',
            value: (annualData.totalGeneration / 1000).toFixed(1),
            unit: 'MWh',
            icon: '☀️',
            colorClass: 'bg-yellow-600'
        }
    ];
    
    const container = document.getElementById('kpi-cards');
    container.innerHTML = kpiData.map(kpi => `
        <div class="bg-gray-800 p-4 rounded-lg shadow-lg flex items-center space-x-4">
            <div class="p-3 rounded-full ${kpi.colorClass} text-3xl">
                ${kpi.icon}
            </div>
            <div class="flex-1">
                <p class="text-sm text-gray-400">${kpi.title}</p>
                <p class="text-2xl font-bold text-white">
                    ${kpi.value} <span class="text-lg font-normal text-gray-300">${kpi.unit}</span>
                </p>
                ${kpi.subtitle ? `<p class="text-xs text-gray-500 mt-1">${kpi.subtitle}</p>` : ''}
            </div>
        </div>
    `).join('');
}

function updateEnergyFlowViz() {
    const { dayBaseData, monthlyDayBaseData } = simulationResult;
    const data = selectedMonth === -1 ? dayBaseData : (monthlyDayBaseData[selectedMonth] || dayBaseData);
    const title = selectedMonth === -1 ? '日均能量流' : `${MONTH_NAMES[selectedMonth]}能量流`;
    
    const container = document.getElementById('energy-flow-viz');
    container.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
            <h2 class="text-2xl font-bold text-white">${title}</h2>
            <select id="month-selector" class="bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:ring-brand-secondary focus:border-brand-secondary">
                <option value="-1">年度平均</option>
                ${MONTH_NAMES.map((month, i) => `<option value="${i}" ${i === selectedMonth ? 'selected' : ''}>${month}</option>`).join('')}
            </select>
        </div>
        <div class="border-b border-gray-700">
            <nav class="-mb-px flex space-x-2">
                <button id="tab-chart" class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 text-white bg-brand-secondary">
                    小时图表
                </button>
                <button id="tab-diagram" class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 text-gray-400 hover:text-white hover:bg-gray-700">
                    能量流向图
                </button>
            </nav>
        </div>
        <div class="mt-6">
            <div id="chart-view" class="h-96">
                <canvas id="energy-flow-chart"></canvas>
            </div>
            <div id="diagram-view" class="hidden">
                ${renderEnergyFlowDiagram(data)}
            </div>
        </div>
    `;
    
    // Add event listeners
    document.getElementById('month-selector').addEventListener('change', function() {
        selectedMonth = parseInt(this.value);
        updateEnergyFlowViz();
    });
    
    document.getElementById('tab-chart').addEventListener('click', () => switchTab('chart'));
    document.getElementById('tab-diagram').addEventListener('click', () => switchTab('diagram'));
    
    // Draw chart
    drawEnergyFlowChart(data);
}

function switchTab(tabName) {
    const chartView = document.getElementById('chart-view');
    const diagramView = document.getElementById('diagram-view');
    const chartTab = document.getElementById('tab-chart');
    const diagramTab = document.getElementById('tab-diagram');
    
    if (tabName === 'chart') {
        chartView.classList.remove('hidden');
        diagramView.classList.add('hidden');
        chartTab.classList.add('text-white', 'bg-brand-secondary');
        chartTab.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-gray-700');
        diagramTab.classList.remove('text-white', 'bg-brand-secondary');
        diagramTab.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-gray-700');
    } else {
        chartView.classList.add('hidden');
        diagramView.classList.remove('hidden');
        diagramTab.classList.add('text-white', 'bg-brand-secondary');
        diagramTab.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-gray-700');
        chartTab.classList.remove('text-white', 'bg-brand-secondary');
        chartTab.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-gray-700');
    }
}

function renderEnergyFlowDiagram(data) {
    const { totalGeneration, totalConsumption, totalDirectSelfConsumption, finalEffectiveCharge } = data;
    const toGrid = Math.max(0, totalGeneration - totalDirectSelfConsumption - finalEffectiveCharge);
    const fromGrid = Math.max(0, totalConsumption - totalDirectSelfConsumption - finalEffectiveCharge);
    
    return `
        <div class="space-y-12 py-4">
            <!-- Generation Flow -->
            <div>
                <h3 class="text-lg font-semibold text-center text-white mb-4">发电去向</h3>
                <div class="flex items-center justify-center flex-wrap gap-4">
                    <div class="w-48 rounded-lg p-3 shadow-lg flex flex-col items-center justify-center bg-gray-700">
                        <div class="text-4xl mb-2">☀️</div>
                        <p class="font-bold text-white">光伏总发电</p>
                        <p class="text-xl font-mono font-extrabold text-white">${totalGeneration.toFixed(2)} kWh</p>
                    </div>
                    <div class="flex flex-col space-y-3 mx-4">
                        <div class="text-center">
                            <div class="text-lg font-mono font-bold text-green-400">${totalDirectSelfConsumption.toFixed(2)} kWh</div>
                            <div class="w-32 h-1 rounded-full bg-green-500"></div>
                            <div class="text-xs text-gray-400 mt-1">直接自用</div>
                        </div>
                        <div class="text-center">
                            <div class="text-lg font-mono font-bold text-yellow-400">${finalEffectiveCharge.toFixed(2)} kWh</div>
                            <div class="w-32 h-1 rounded-full bg-yellow-500"></div>
                            <div class="text-xs text-gray-400 mt-1">充电</div>
                        </div>
                        <div class="text-center">
                            <div class="text-lg font-mono font-bold text-blue-400">${toGrid.toFixed(2)} kWh</div>
                            <div class="w-32 h-1 rounded-full bg-blue-500"></div>
                            <div class="text-xs text-gray-400 mt-1">上网</div>
                        </div>
                    </div>
                    <div class="flex flex-col space-y-4">
                        <div class="w-48 rounded-lg p-3 shadow-lg flex flex-col items-center justify-center bg-green-600/50">
                            <div class="text-4xl mb-2">🏠</div>
                            <p class="font-bold text-white">家庭</p>
                            <p class="text-xl font-mono font-extrabold text-white">${totalDirectSelfConsumption.toFixed(2)} kWh</p>
                        </div>
                        <div class="w-48 rounded-lg p-3 shadow-lg flex flex-col items-center justify-center bg-yellow-600/50">
                            <div class="text-4xl mb-2">🔋</div>
                            <p class="font-bold text-white">电池</p>
                            <p class="text-xl font-mono font-extrabold text-white">${finalEffectiveCharge.toFixed(2)} kWh</p>
                        </div>
                        <div class="w-48 rounded-lg p-3 shadow-lg flex flex-col items-center justify-center bg-blue-600/50">
                            <div class="text-4xl mb-2">📍</div>
                            <p class="font-bold text-white">电网</p>
                            <p class="text-xl font-mono font-extrabold text-white">${toGrid.toFixed(2)} kWh</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Consumption Flow -->
            <div>
                <h3 class="text-lg font-semibold text-center text-white mb-4">用电来源</h3>
                <div class="flex items-center justify-center flex-wrap gap-4">
                    <div class="flex flex-col space-y-4">
                        <div class="w-48 rounded-lg p-3 shadow-lg flex flex-col items-center justify-center bg-green-600/50">
                            <div class="text-4xl mb-2">☀️</div>
                            <p class="font-bold text-white">光伏</p>
                            <p class="text-xl font-mono font-extrabold text-white">${totalDirectSelfConsumption.toFixed(2)} kWh</p>
                        </div>
                        <div class="w-48 rounded-lg p-3 shadow-lg flex flex-col items-center justify-center bg-yellow-600/50">
                            <div class="text-4xl mb-2">🔋</div>
                            <p class="font-bold text-white">电池</p>
                            <p class="text-xl font-mono font-extrabold text-white">${finalEffectiveCharge.toFixed(2)} kWh</p>
                        </div>
                        <div class="w-48 rounded-lg p-3 shadow-lg flex flex-col items-center justify-center bg-red-600/50">
                            <div class="text-4xl mb-2">📍</div>
                            <p class="font-bold text-white">电网</p>
                            <p class="text-xl font-mono font-extrabold text-white">${fromGrid.toFixed(2)} kWh</p>
                        </div>
                    </div>
                    <div class="flex flex-col space-y-3 mx-4">
                        <div class="text-center">
                            <div class="text-lg font-mono font-bold text-green-400">${totalDirectSelfConsumption.toFixed(2)} kWh</div>
                            <div class="w-32 h-1 rounded-full bg-green-500"></div>
                            <div class="text-xs text-gray-400 mt-1">光伏直供</div>
                        </div>
                        <div class="text-center">
                            <div class="text-lg font-mono font-bold text-yellow-400">${finalEffectiveCharge.toFixed(2)} kWh</div>
                            <div class="w-32 h-1 rounded-full bg-yellow-500"></div>
                            <div class="text-xs text-gray-400 mt-1">电池放电</div>
                        </div>
                        <div class="text-center">
                            <div class="text-lg font-mono font-bold text-red-400">${fromGrid.toFixed(2)} kWh</div>
                            <div class="w-32 h-1 rounded-full bg-red-500"></div>
                            <div class="text-xs text-gray-400 mt-1">电网购电</div>
                        </div>
                    </div>
                    <div class="w-48 rounded-lg p-3 shadow-lg flex flex-col items-center justify-center bg-gray-700">
                        <div class="text-4xl mb-2">🏠</div>
                        <p class="font-bold text-white">家庭总用电</p>
                        <p class="text-xl font-mono font-extrabold text-white">${totalConsumption.toFixed(2)} kWh</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function drawEnergyFlowChart(data) {
    const ctx = document.getElementById('energy-flow-chart');
    if (!ctx) return;
    
    if (energyFlowChart) {
        energyFlowChart.destroy();
    }
    
    const chartData = {
        labels: data.hourly.map(h => `${h.hour}:00`),
        datasets: [
            {
                label: '发电量',
                data: data.hourly.map(h => h.generation.toFixed(2)),
                borderColor: 'rgb(245, 158, 11)',
                backgroundColor: 'rgba(245, 158, 11, 0.6)',
                fill: true,
                tension: 0.4
            },
            {
                label: '用电量',
                data: data.hourly.map(h => h.consumption.toFixed(2)),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                fill: true,
                tension: 0.4
            }
        ]
    };
    
    energyFlowChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#a0aec0'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(31, 41, 55, 0.8)',
                    borderColor: '#4a5568',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0aec0',
                        callback: function(value) {
                            return value + ' kWh';
                        }
                    },
                    grid: {
                        color: '#4a5568'
                    }
                },
                x: {
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: '#4a5568'
                    }
                }
            }
        }
    });
}

function updateROIViz() {
    const { twentyYearProjection } = simulationResult;
    
    const container = document.getElementById('roi-viz');
    container.innerHTML = `
        <h2 class="text-2xl font-bold text-white mb-6">20年财务预测</h2>
        <div class="h-96">
            <canvas id="roi-chart"></canvas>
        </div>
    `;
    
    drawROIChart(twentyYearProjection);
}

function drawROIChart(projection) {
    const ctx = document.getElementById('roi-chart');
    if (!ctx) return;
    
    if (roiChart) {
        roiChart.destroy();
    }
    
    const chartData = {
        labels: projection.map(p => `第${p.year}年`),
        datasets: [
            {
                label: '年度净节省 (第10年一次性)',
                type: 'bar',
                data: projection.map(p => p.netSavings.toFixed(0)),
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
                yAxisID: 'y'
            },
            {
                label: '年度净节省 (计提法)',
                type: 'bar',
                data: projection.map(p => p.netSavingsAmortized.toFixed(0)),
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: 'rgb(99, 102, 241)',
                borderWidth: 1,
                yAxisID: 'y'
            },
            {
                label: '累计节省 (简单)',
                type: 'line',
                data: projection.map(p => p.cumulativeSavings.toFixed(0)),
                borderColor: 'rgb(245, 158, 11)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                fill: false,
                yAxisID: 'y'
            },
            {
                label: '累计节省 (计提法)',
                type: 'line',
                data: projection.map(p => p.cumulativeSavingsAmortized.toFixed(0)),
                borderColor: 'rgb(139, 92, 246)',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                borderDash: [3, 3],
                fill: false,
                yAxisID: 'y'
            },
            {
                label: '累计节省 (贴现)',
                type: 'line',
                data: projection.map(p => p.cumulativeDiscountedSavings.toFixed(0)),
                borderColor: 'rgb(13, 148, 136)',
                backgroundColor: 'rgba(13, 148, 136, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                yAxisID: 'y'
            },
            {
                label: '累计节省 (贴现+计提)',
                type: 'line',
                data: projection.map(p => p.cumulativeDiscountedSavingsAmortized.toFixed(0)),
                borderColor: 'rgb(6, 182, 212)',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                borderWidth: 2,
                borderDash: [8, 3],
                fill: false,
                yAxisID: 'y'
            }
        ]
    };
    
    roiChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#a0aec0'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(31, 41, 55, 0.8)',
                    borderColor: '#4a5568',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += '$' + parseFloat(context.parsed.y).toLocaleString();
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0aec0',
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    },
                    grid: {
                        color: '#4a5568'
                    }
                },
                x: {
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: '#4a5568'
                    }
                }
            }
        }
    });
}

function updateCashFlowTable() {
    const { twentyYearProjection, monthlyProjection } = simulationResult;
    
    const container = document.getElementById('cash-flow-table');
    container.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
            <h2 class="text-2xl font-bold text-white">20年现金流明细</h2>
            <div class="flex gap-2">
                <button id="export-yearly-csv" class="bg-brand-secondary hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2">
                    <span>📊</span>
                    <span>导出年度数据 (CSV)</span>
                </button>
                <button id="export-monthly-csv" class="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2">
                    <span>📅</span>
                    <span>导出月度数据 (CSV)</span>
                </button>
            </div>
        </div>
        
        <div class="mb-6 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
            <p class="text-sm text-blue-200">
                <span class="font-semibold">💡 提示：</span>
                此表格展示了 20 年的详细现金流数据，可用于 IRR 计算。负值表示现金流出（投资成本），正值表示现金流入（净节省）。
            </p>
        </div>
        
        <h3 class="text-xl font-semibold text-white mb-4">现金流趋势图</h3>
        <div class="h-80 mb-8">
            <canvas id="cash-flow-chart"></canvas>
        </div>
        
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="text-xs uppercase bg-gray-700 text-gray-300">
                    <tr>
                        <th class="px-4 py-3 sticky left-0 bg-gray-700 z-10">年份</th>
                        <th class="px-4 py-3 text-right">年度净节省<br/><span class="text-xs normal-case text-gray-400">(计提法)</span></th>
                        <th class="px-4 py-3 text-right">累计节省<br/><span class="text-xs normal-case text-gray-400">(简单)</span></th>
                        <th class="px-4 py-3 text-right">累计节省<br/><span class="text-xs normal-case text-gray-400">(贴现)</span></th>
                        <th class="px-4 py-3 text-right">安装前成本</th>
                        <th class="px-4 py-3 text-right">安装后成本</th>
                        <th class="px-4 py-3 text-right">售电收入</th>
                        <th class="px-4 py-3 text-right">电池分摊</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-700">
                    <tr class="bg-red-900/20 font-semibold">
                        <td class="px-4 py-3 sticky left-0 bg-red-900/20 z-10">第 0 年</td>
                        <td class="px-4 py-3 text-right text-red-400">-$${currentConfig.investmentCost.toLocaleString()}</td>
                        <td class="px-4 py-3 text-right text-red-400">-$${currentConfig.investmentCost.toLocaleString()}</td>
                        <td class="px-4 py-3 text-right text-red-400">-$${currentConfig.investmentCost.toLocaleString()}</td>
                        <td class="px-4 py-3 text-right text-gray-500">-</td>
                        <td class="px-4 py-3 text-right text-gray-500">-</td>
                        <td class="px-4 py-3 text-right text-gray-500">-</td>
                        <td class="px-4 py-3 text-right text-gray-500">-</td>
                    </tr>
                    ${twentyYearProjection.map(year => {
                        const isBreakeven = year.cumulativeSavingsAmortized >= currentConfig.investmentCost && 
                                          twentyYearProjection[year.year - 2]?.cumulativeSavingsAmortized < currentConfig.investmentCost;
                        return `
                        <tr class="hover:bg-gray-700/50 ${isBreakeven ? 'bg-green-900/20' : ''}">
                            <td class="px-4 py-3 font-semibold sticky left-0 ${isBreakeven ? 'bg-green-900/20' : 'bg-gray-800'} z-10">
                                第 ${year.year} 年
                                ${isBreakeven ? '<span class="ml-2 text-green-400">✓ 回本</span>' : ''}
                            </td>
                            <td class="px-4 py-3 text-right font-mono text-green-400">
                                $${year.netSavingsAmortized.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                            </td>
                            <td class="px-4 py-3 text-right font-mono ${year.cumulativeSavingsAmortized >= currentConfig.investmentCost ? 'text-green-400 font-bold' : 'text-yellow-400'}">
                                $${year.cumulativeSavingsAmortized.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                            </td>
                            <td class="px-4 py-3 text-right font-mono ${year.cumulativeDiscountedSavingsAmortized >= currentConfig.investmentCost ? 'text-green-400 font-bold' : 'text-teal-400'}">
                                $${year.cumulativeDiscountedSavingsAmortized.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                            </td>
                            <td class="px-4 py-3 text-right font-mono text-gray-400">
                                $${year.costWithoutSolar.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                            </td>
                            <td class="px-4 py-3 text-right font-mono text-gray-400">
                                $${year.costWithSolar.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                            </td>
                            <td class="px-4 py-3 text-right font-mono text-blue-400">
                                $${year.revenueFromGrid.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                            </td>
                            <td class="px-4 py-3 text-right font-mono text-yellow-400">
                                $${year.batteryAmortization.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
                <tfoot class="bg-gray-700 font-bold">
                    <tr>
                        <td class="px-4 py-3 sticky left-0 bg-gray-700 z-10">20年总计</td>
                        <td class="px-4 py-3 text-right text-green-400">
                            $${twentyYearProjection.reduce((sum, y) => sum + y.netSavingsAmortized, 0).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                        </td>
                        <td class="px-4 py-3 text-right text-green-400">
                            $${twentyYearProjection[19].cumulativeSavingsAmortized.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                        </td>
                        <td class="px-4 py-3 text-right text-teal-400">
                            $${twentyYearProjection[19].cumulativeDiscountedSavingsAmortized.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                        </td>
                        <td class="px-4 py-3 text-right text-gray-400">
                            $${twentyYearProjection.reduce((sum, y) => sum + y.costWithoutSolar, 0).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                        </td>
                        <td class="px-4 py-3 text-right text-gray-400">
                            $${twentyYearProjection.reduce((sum, y) => sum + y.costWithSolar, 0).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                        </td>
                        <td class="px-4 py-3 text-right text-blue-400">
                            $${twentyYearProjection.reduce((sum, y) => sum + y.revenueFromGrid, 0).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                        </td>
                        <td class="px-4 py-3 text-right text-yellow-400">
                            $${currentConfig.batteryReplacementCost.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-gray-700/50 p-4 rounded-lg">
                <p class="text-sm text-gray-400 mb-1">IRR 现金流</p>
                <p class="text-xs text-gray-500 font-mono">
                    [-$${currentConfig.investmentCost.toLocaleString()}, 
                    ${twentyYearProjection.slice(0, 3).map(y => '$' + y.netSavingsAmortized.toFixed(0)).join(', ')}, ...]
                </p>
            </div>
            <div class="bg-gray-700/50 p-4 rounded-lg">
                <p class="text-sm text-gray-400 mb-1">20年净收益</p>
                <p class="text-2xl font-bold text-green-400">
                    $${(twentyYearProjection[19].cumulativeSavingsAmortized - currentConfig.investmentCost).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                </p>
            </div>
            <div class="bg-gray-700/50 p-4 rounded-lg">
                <p class="text-sm text-gray-400 mb-1">投资回报倍数</p>
                <p class="text-2xl font-bold text-purple-400">
                    ${(twentyYearProjection[19].cumulativeSavingsAmortized / currentConfig.investmentCost).toFixed(2)}x
                </p>
            </div>
        </div>
    `;
    
    // Add event listeners for export buttons
    document.getElementById('export-yearly-csv').addEventListener('click', () => exportYearlyCashFlowToCSV());
    document.getElementById('export-monthly-csv').addEventListener('click', () => exportMonthlyCashFlowToCSV());
    
    // Draw cash flow chart
    drawCashFlowChart(twentyYearProjection);
}

function exportYearlyCashFlowToCSV() {
    const { twentyYearProjection } = simulationResult;
    
    // CSV header
    let csv = 'Year,Net Savings (Amortized),Cumulative Savings,Cumulative Discounted Savings,Cost Without Solar,Cost With Solar,Revenue From Grid,Battery Amortization\n';
    
    // Initial investment
    csv += `0,-${currentConfig.investmentCost},-${currentConfig.investmentCost},-${currentConfig.investmentCost},0,0,0,0\n`;
    
    // Add data rows
    twentyYearProjection.forEach(year => {
        csv += `${year.year},${year.netSavingsAmortized.toFixed(2)},${year.cumulativeSavingsAmortized.toFixed(2)},${year.cumulativeDiscountedSavingsAmortized.toFixed(2)},${year.costWithoutSolar.toFixed(2)},${year.costWithSolar.toFixed(2)},${year.revenueFromGrid.toFixed(2)},${year.batteryAmortization.toFixed(2)}\n`;
    });
    
    // Download
    downloadCSV(csv, 'solar_cashflow_yearly_20years.csv');
}

function exportMonthlyCashFlowToCSV() {
    const { monthlyProjection } = simulationResult;
    
    // CSV header
    let csv = 'Month,Year,Month in Year,Monthly Savings,Discounted Monthly Savings,Cumulative Savings,Cumulative Discounted Savings,Cost Without Solar,Cost With Solar,Revenue From Grid,Monthly Generation,Monthly Self Consumption,Monthly To Grid,Monthly From Grid,Battery Amortization\n';
    
    // Add data rows
    monthlyProjection.forEach(month => {
        csv += `${month.month},${month.year},${month.monthInYear},${month.monthlySavings.toFixed(2)},${month.discountedMonthlySavings.toFixed(2)},${month.cumulativeSavings.toFixed(2)},${month.cumulativeDiscountedSavings.toFixed(2)},${month.costWithoutSolar.toFixed(2)},${month.costWithSolar.toFixed(2)},${month.revenueFromGrid.toFixed(2)},${month.monthlyGeneration.toFixed(2)},${month.monthlySelfConsumption.toFixed(2)},${month.monthlyToGrid.toFixed(2)},${month.monthlyFromGrid.toFixed(2)},${month.batteryAmortization.toFixed(2)}\n`;
    });
    
    // Download
    downloadCSV(csv, 'solar_cashflow_monthly_240months.csv');
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

let cashFlowChart = null;

function drawCashFlowChart(projection) {
    const ctx = document.getElementById('cash-flow-chart');
    if (!ctx) return;
    
    if (cashFlowChart) {
        cashFlowChart.destroy();
    }
    
    // Prepare data including year 0 (initial investment)
    const years = [0, ...projection.map(p => p.year)];
    const netSavings = [-currentConfig.investmentCost, ...projection.map(p => p.netSavingsAmortized)];
    const cumulativeSavings = [-currentConfig.investmentCost, ...projection.map(p => p.cumulativeSavingsAmortized - currentConfig.investmentCost)];
    
    const chartData = {
        labels: years.map(y => y === 0 ? '初始' : `第${y}年`),
        datasets: [
            {
                label: '年度现金流',
                type: 'bar',
                data: netSavings.map(v => v.toFixed(0)),
                backgroundColor: netSavings.map(v => v < 0 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(34, 197, 94, 0.6)'),
                borderColor: netSavings.map(v => v < 0 ? 'rgb(239, 68, 68)' : 'rgb(34, 197, 94)'),
                borderWidth: 1,
                yAxisID: 'y'
            },
            {
                label: '累计净收益',
                type: 'line',
                data: cumulativeSavings.map(v => v.toFixed(0)),
                borderColor: 'rgb(245, 158, 11)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                yAxisID: 'y',
                pointRadius: 3,
                pointHoverRadius: 5
            }
        ]
    };
    
    cashFlowChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#a0aec0',
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(31, 41, 55, 0.95)',
                    borderColor: '#4a5568',
                    borderWidth: 1,
                    titleColor: '#fff',
                    bodyColor: '#e5e7eb',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            const value = parseFloat(context.parsed.y);
                            label += '$' + value.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0});
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: '#a0aec0',
                        callback: function(value) {
                            return '$' + (value / 1000).toFixed(0) + 'k';
                        }
                    },
                    grid: {
                        color: '#4a5568',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: '#a0aec0',
                        font: {
                            size: 10
                        },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        color: '#4a5568',
                        drawBorder: false
                    }
                }
            }
        }
    });
}

function updateCalculationBreakdown() {
    const { dayBaseData, annualData, twentyYearProjection, paybackPeriod, paybackPeriodAmortized, 
            discountedPaybackPeriod, discountedPaybackPeriodAmortized, 
            paybackPeriodMonths, discountedPaybackPeriodMonths, irr, 
            monthlyGenerationPercentages, monthlyConsumptionFactors, hourlyGenerationFactors, hourlyConsumptionPercentages } = simulationResult;
    const year1 = twentyYearProjection[0];
    
    const formatNumber = (num, digits = 2) => num ? num.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '0.00';
    const formatCurrency = (num) => num ? '$' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '$0';
    
    const container = document.getElementById('calculation-breakdown');
    container.innerHTML = `
        <h2 class="text-2xl font-bold text-white mb-6">详细计算分解</h2>
        
        <section class="mb-8">
            <h3 class="text-xl font-semibold text-white mb-4 border-b-2 border-brand-secondary pb-2">核心模型假设</h3>
            <p class="text-sm text-gray-400 mb-4">模拟结果基于以下典型的季节性和每日能量分布模型。这些系数决定了年度发电量和用电量如何分配到每个月和每一天。</p>
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div>
                    <h4 class="text-lg font-semibold text-center text-white mb-2">季节性发电模型</h4>
                    <div class="h-60 bg-gray-900/50 p-4 rounded-md"><canvas id="monthly-generation-chart"></canvas></div>
                </div>
                <div>
                    <h4 class="text-lg font-semibold text-center text-white mb-2">季节性用电模型</h4>
                    <div class="h-60 bg-gray-900/50 p-4 rounded-md"><canvas id="monthly-consumption-chart"></canvas></div>
                </div>
                <div>
                    <h4 class="text-lg font-semibold text-center text-white mb-2">小时能量分布模型</h4>
                    <div class="h-60 bg-gray-900/50 p-4 rounded-md"><canvas id="hourly-distribution-chart"></canvas></div>
                </div>
            </div>
        </section>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section>
                <h3 class="text-xl font-semibold text-white mb-4 border-b-2 border-brand-secondary pb-2">第1步：年度到每日能量流模拟</h3>
                <div class="bg-gray-900/50 p-4 rounded-md mt-2">
                    <p class="font-semibold text-brand-accent">年总发电量</p>
                    <p class="text-sm text-gray-400 italic my-1 font-mono">光伏系统功率 × 年发电系数</p>
                    <div class="mt-2 text-sm space-y-1">
                        <p class="text-xs text-gray-400">这是模拟的第一步，计算出系统在一年内预计能产生的总电量。</p>
                        <div class="flex justify-between items-baseline py-2 border-b border-gray-700 border-t">
                            <span class="text-gray-400">1. 光伏系统功率</span>
                            <span class="font-mono text-white font-bold">${formatNumber(currentConfig.systemPower, 1)} kWp</span>
                        </div>
                        <div class="flex justify-between items-baseline py-2 border-b border-gray-700">
                            <span class="text-gray-400">2. 年发电系数</span>
                            <span class="font-mono text-white font-bold">${formatNumber(currentConfig.annualGenerationFactor, 0)} kWh/kWp</span>
                        </div>
                        <div class="flex justify-between items-baseline py-2 text-green-400 font-bold">
                            <span>= 年总发电量</span>
                            <span class="font-mono">${formatNumber(annualData.totalGeneration)} kWh</span>
                        </div>
                    </div>
                </div>
                <h4 class="text-lg font-semibold mt-6 mb-2">日均数据分解</h4>
                <div class="space-y-3">
                    <div class="flex justify-between items-baseline py-2 border-b border-gray-700">
                        <span class="text-gray-400">日均发电量</span>
                        <span class="font-mono text-white font-bold">${formatNumber(dayBaseData.totalGeneration)} kWh</span>
                    </div>
                    <div class="flex justify-between items-baseline py-2 border-b border-gray-700">
                        <span class="text-gray-400">日均用电量</span>
                        <span class="font-mono text-white font-bold">${formatNumber(dayBaseData.totalConsumption)} kWh</span>
                    </div>
                    <div class="bg-gray-900/50 p-4 rounded-md mt-2">
                        <p class="font-semibold text-brand-accent">日直接自用电量</p>
                        <p class="text-sm text-gray-400 italic my-1 font-mono">Σ min(每小时发电量, 每小时用电量)</p>
                        <div class="mt-2 text-sm"><p>光伏发电产生时立即被消耗的部分。</p>
                            <div class="flex justify-between items-baseline py-2 text-green-400">
                                <span>结果</span>
                                <span class="font-mono font-bold">${formatNumber(dayBaseData.totalDirectSelfConsumption)} kWh</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-900/50 p-4 rounded-md mt-2">
                        <p class="font-semibold text-brand-accent">日可充电量</p>
                        <p class="text-sm text-gray-400 italic my-1 font-mono">Σ max(每小时发电量 - 每小时用电量, 0)</p>
                        <div class="mt-2 text-sm"><p>可用于给电池充电的剩余光伏电量。</p>
                            <div class="flex justify-between items-baseline py-2 text-yellow-400">
                                <span>结果</span>
                                <span class="font-mono font-bold">${formatNumber(dayBaseData.totalToBatteryPotential)} kWh</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-900/50 p-4 rounded-md mt-2">
                        <p class="font-semibold text-brand-accent">日有效充电量</p>
                        <p class="text-sm text-gray-400 italic my-1 font-mono">min(日可充电量, 电池容量, 非发电时段用电量)</p>
                        <div class="mt-2 text-sm space-y-1">
                            <p>实际储存的有效电量。它受限于可充电量、电池容量以及非发电时段的用电需求。</p>
                            <div class="flex justify-between items-baseline py-2 border-b border-gray-700 border-t">
                                <span class="text-gray-400">1. 可充电量</span>
                                <span class="font-mono text-white font-bold">${formatNumber(dayBaseData.totalToBatteryPotential)} kWh</span>
                            </div>
                            <div class="flex justify-between items-baseline py-2 border-b border-gray-700">
                                <span class="text-gray-400">2. 电池容量</span>
                                <span class="font-mono text-white font-bold">${formatNumber(currentConfig.batteryCapacity)} kWh</span>
                            </div>
                            <div class="flex justify-between items-baseline py-2 border-b border-gray-700">
                                <span class="text-gray-400">3. 非发电时段用电量</span>
                                <span class="font-mono text-white font-bold">${formatNumber(dayBaseData.nonGenerationConsumption)} kWh</span>
                            </div>
                            <div class="flex justify-between items-baseline py-2 text-green-400 font-bold">
                                <span>最终结果</span>
                                <span class="font-mono">${formatNumber(dayBaseData.finalEffectiveCharge)} kWh</span>
                            </div>
                        </div>
                    </div>
                    <h4 class="text-lg font-semibold pt-4">年度总结</h4>
                    <div class="flex justify-between items-baseline py-2 border-b border-gray-700">
                        <span class="text-gray-400">年总自用电量</span>
                        <span class="font-mono text-white font-bold">${formatNumber(annualData.totalSelfConsumption)} kWh</span>
                    </div>
                    <div class="flex justify-between items-baseline py-2 border-b border-gray-700">
                        <span class="text-gray-400">年总发电量</span>
                        <span class="font-mono text-white font-bold">${formatNumber(annualData.totalGeneration)} kWh</span>
                    </div>
                    <div class="flex justify-between items-baseline py-2 border-b border-gray-700">
                        <span class="text-gray-400">售电量 (上网)</span>
                        <span class="font-mono text-white font-bold">${formatNumber(annualData.toGrid)} kWh</span>
                    </div>
                    <div class="flex justify-between items-baseline py-2 border-b border-gray-700">
                        <span class="text-gray-400">购电量 (下网)</span>
                        <span class="font-mono text-white font-bold">${formatNumber(annualData.fromGrid)} kWh</span>
                    </div>
                    <div class="bg-gray-900/50 p-4 rounded-md mt-2">
                        <p class="font-semibold text-brand-accent">自用率</p>
                        <p class="text-sm text-gray-400 italic my-1 font-mono">年总自用电量 / 年总发电量</p>
                        <div class="flex justify-between items-baseline py-2 text-xl text-brand-accent">
                            <span>结果</span>
                            <span class="font-mono font-bold">${formatNumber(annualData.selfConsumptionRate * 100)}%</span>
                        </div>
                    </div>
                </div>
            </section>
            <section>
                <h3 class="text-xl font-semibold text-white mb-4 border-b-2 border-brand-secondary pb-2">第2步：20年财务分析</h3>
                <div class="space-y-3">
                    <div class="flex justify-between items-baseline py-2 border-b border-gray-700 text-red-400">
                        <span>初始投资</span>
                        <span class="font-mono font-bold">${formatCurrency(currentConfig.investmentCost)}</span>
                    </div>
                    <div class="flex justify-between items-baseline py-2 border-b border-gray-700 text-yellow-400">
                        <span>电池更换成本 (第10年)</span>
                        <span class="font-mono font-bold">${formatCurrency(currentConfig.batteryReplacementCost)}</span>
                    </div>
                    <div class="bg-gray-900/50 p-4 rounded-md mt-2">
                        <p class="font-semibold text-brand-accent">年度净节省</p>
                        <p class="text-sm text-gray-400 italic my-1 font-mono">安装前成本 - (安装后成本 - 售电收入)</p>
                        <div class="mt-2 text-sm space-y-1">
                            <p>此处以第一年的计算为例。</p>
                            <div class="flex justify-between items-baseline py-2 border-b border-gray-700">
                                <span class="text-gray-400">安装前成本</span>
                                <span class="font-mono text-white font-bold">${formatCurrency(year1.costWithoutSolar)}</span>
                            </div>
                            <div class="flex justify-between items-baseline py-2 border-b border-gray-700">
                                <span class="text-gray-400">安装后成本</span>
                                <span class="font-mono text-white font-bold">${formatCurrency(year1.costWithSolar)}</span>
                            </div>
                            <div class="flex justify-between items-baseline py-2 border-b border-gray-700">
                                <span class="text-gray-400">售电收入</span>
                                <span class="font-mono text-white font-bold">${formatCurrency(year1.revenueFromGrid)}</span>
                            </div>
                            <div class="flex justify-between items-baseline py-2 text-green-400 font-bold">
                                <span>净节省 (第一年)</span>
                                <span class="font-mono">${formatCurrency(year1.netSavings)}</span>
                            </div>
                        </div>
                    </div>
                    <h4 class="text-lg font-semibold pt-4 text-yellow-400">月度计算方式</h4>
                    <div class="bg-gray-900/50 p-4 rounded-md mt-2">
                        <p class="font-semibold text-brand-accent">计提法（月度分摊）</p>
                        <div class="mt-2 text-sm space-y-2">
                            <div class="border-l-4 border-blue-500 pl-3">
                                <p class="font-semibold text-blue-400">电池成本分摊策略</p>
                                <p class="text-gray-400 text-xs mt-1">前120个月: 月度节省 = 基础节省 - ${formatCurrency(currentConfig.batteryReplacementCost / 120)}/月</p>
                                <p class="text-gray-400 text-xs">第121-240月: 月度节省 = 基础节省</p>
                                <p class="text-gray-400 text-xs mt-1">✓ 按月计算，结合月度发电和用电模型</p>
                            </div>
                            <div class="border-l-4 border-green-500 pl-3">
                                <p class="font-semibold text-green-400">月度能量流模型</p>
                                <p class="text-gray-400 text-xs mt-1">• 每月使用对应的发电和用电比例</p>
                                <p class="text-gray-400 text-xs">• 考虑每月天数差异（28-31天）</p>
                                <p class="text-gray-400 text-xs">• 应用月度通胀和衰减系数</p>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-900/50 p-4 rounded-md mt-2">
                        <p class="font-semibold text-brand-accent">回本周期 (月度计算)</p>
                        <p class="text-sm text-gray-400 italic my-1 font-mono">累计节省 > 投资成本的月份</p>
                        <div class="mt-2 text-sm">
                            <p>基于240个月的逐月计算，精确到月。</p>
                            <div class="flex justify-between items-baseline py-2 border-b border-gray-700">
                                <span class="text-blue-400">月数</span>
                                <span class="font-mono font-bold text-blue-400">${paybackPeriodMonths ? formatNumber(paybackPeriodMonths, 1) + ' 月' : 'N/A'}</span>
                            </div>
                            <div class="flex justify-between items-baseline py-2 text-blue-400">
                                <span>年数</span>
                                <span class="font-mono font-bold">${paybackPeriod ? formatNumber(paybackPeriod, 2) + ' 年' : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-900/50 p-4 rounded-md mt-2">
                        <p class="font-semibold text-brand-accent">回本周期 (贴现月度)</p>
                        <p class="text-sm text-gray-400 italic my-1 font-mono">累计贴现节省 > 投资成本的月份</p>
                        <div class="mt-2 text-sm space-y-1">
                            <p>将未来的月度节省额折算成今天的价值后计算。</p>
                            <p class="text-gray-400 text-xs">使用的贴现率: ${currentConfig.discountRate}% (年度) → ${((Math.pow(1 + currentConfig.discountRate/100, 1/12) - 1) * 100).toFixed(3)}% (月度)</p>
                            <div class="flex justify-between items-baseline py-2 border-b border-gray-700">
                                <span class="text-teal-400">月数</span>
                                <span class="font-mono font-bold text-teal-400">${discountedPaybackPeriodMonths ? formatNumber(discountedPaybackPeriodMonths, 1) + ' 月' : 'N/A'}</span>
                            </div>
                            <div class="flex justify-between items-baseline py-2 text-teal-400">
                                <span>年数</span>
                                <span class="font-mono font-bold">${discountedPaybackPeriod ? formatNumber(discountedPaybackPeriod, 2) + ' 年' : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-gray-900/50 p-4 rounded-md mt-2">
                        <p class="font-semibold text-brand-accent">内部收益率 (IRR)</p>
                        <p class="text-sm text-gray-400 italic my-1 font-mono">使现金流净现值(NPV)为零的贴现率</p>
                        <div class="mt-2 text-sm space-y-1">
                            <p>衡量投资盈利能力的指标。越高越好。</p>
                            <p class="text-yellow-400 text-xs font-semibold">⚠️ IRR 基于年度现金流（月度节省汇总）</p>
                            <p class="text-gray-400 text-xs">现金流示例: [${formatCurrency(-currentConfig.investmentCost)}, ${formatCurrency(year1.netSavings)}, ${formatCurrency(twentyYearProjection[1].netSavings)}, ...]</p>
                            <div class="flex justify-between items-baseline py-2 text-xl text-purple-400">
                                <span>结果</span>
                                <span class="font-mono font-bold">${irr ? formatNumber(irr * 100) + '%' : 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `;
    
    drawMonthlyGenerationChart(monthlyGenerationPercentages);
    drawMonthlyConsumptionChart(monthlyConsumptionFactors);
    drawHourlyDistributionChart(hourlyGenerationFactors, hourlyConsumptionPercentages);
}

function drawMonthlyGenerationChart(percentages) {
    const ctx = document.getElementById('monthly-generation-chart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'bar',
        data: { labels: MONTH_NAMES, datasets: [{ label: '发电量占比 (%)', data: percentages, backgroundColor: 'rgba(245, 158, 11, 0.8)', borderColor: 'rgb(245, 158, 11)', borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4a5568', borderWidth: 1, callbacks: { label: function(context) { return context.parsed.y.toFixed(1) + '%'; } } } }, scales: { y: { beginAtZero: true, ticks: { color: '#a0aec0', callback: function(value) { return value + '%'; } }, grid: { color: '#4a5568' } }, x: { ticks: { color: '#a0aec0', font: { size: 10 } }, grid: { color: '#4a5568' } } } }
    });
}

function drawMonthlyConsumptionChart(factors) {
    const ctx = document.getElementById('monthly-consumption-chart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'bar',
        data: { labels: MONTH_NAMES, datasets: [{ label: '用电比例 (%)', data: factors, backgroundColor: 'rgba(59, 130, 246, 0.8)', borderColor: 'rgb(59, 130, 246)', borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4a5568', borderWidth: 1, callbacks: { label: function(context) { return context.parsed.y.toFixed(2) + '%'; } } } }, scales: { y: { beginAtZero: true, ticks: { color: '#a0aec0', callback: function(value) { return value + '%'; } }, grid: { color: '#4a5568' } }, x: { ticks: { color: '#a0aec0', font: { size: 10 } }, grid: { color: '#4a5568' } } } }
    });
}

function drawHourlyDistributionChart(generationFactors, consumptionPercentages) {
    const ctx = document.getElementById('hourly-distribution-chart');
    if (!ctx) return;
    const labels = Array.from({length: 24}, (_, i) => `${i}:00`);
    new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: '发电系数', data: generationFactors, backgroundColor: 'rgba(245, 158, 11, 0.8)', borderColor: 'rgb(245, 158, 11)', borderWidth: 1 }, { label: '用电比例 (%)', data: consumptionPercentages, backgroundColor: 'rgba(59, 130, 246, 0.8)', borderColor: 'rgb(59, 130, 246)', borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#a0aec0', font: { size: 10 } } }, tooltip: { backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4a5568', borderWidth: 1 } }, scales: { y: { beginAtZero: true, ticks: { color: '#a0aec0', font: { size: 10 } }, grid: { color: '#4a5568' } }, x: { ticks: { color: '#a0aec0', font: { size: 9 }, maxRotation: 45, minRotation: 45 }, grid: { color: '#4a5568' } } } }
    });
}
