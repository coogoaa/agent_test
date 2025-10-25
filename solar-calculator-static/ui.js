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
}

function updateKPICards() {
    const { annualData, paybackPeriod, discountedPaybackPeriod, irr } = simulationResult;
    
    const kpiData = [
        {
            title: '自用率',
            value: (annualData.selfConsumptionRate * 100).toFixed(1),
            unit: '%',
            icon: '⚡',
            colorClass: 'bg-green-600'
        },
        {
            title: '投资回收期 (简单)',
            value: paybackPeriod ? paybackPeriod.toFixed(1) : 'N/A',
            unit: '年',
            icon: '📅',
            colorClass: 'bg-blue-600'
        },
        {
            title: '投资回收期 (贴现)',
            value: discountedPaybackPeriod ? discountedPaybackPeriod.toFixed(1) : 'N/A',
            unit: '年',
            icon: '💰',
            colorClass: 'bg-teal-600'
        },
        {
            title: '20年内部收益率 (IRR)',
            value: irr ? (irr * 100).toFixed(1) : 'N/A',
            unit: '%',
            icon: '📊',
            colorClass: 'bg-purple-600'
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
            <div>
                <p class="text-sm text-gray-400">${kpi.title}</p>
                <p class="text-2xl font-bold text-white">
                    ${kpi.value} <span class="text-lg font-normal text-gray-300">${kpi.unit}</span>
                </p>
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
                label: '年度净节省',
                type: 'bar',
                data: projection.map(p => p.netSavings.toFixed(0)),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgb(59, 130, 246)',
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
                label: '累计节省 (贴现)',
                type: 'line',
                data: projection.map(p => p.cumulativeDiscountedSavings.toFixed(0)),
                borderColor: 'rgb(13, 148, 136)',
                backgroundColor: 'rgba(13, 148, 136, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
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
