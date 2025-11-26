// 各州数据配置
const STATE_ANNUAL_USAGE = {
    TAS: 10148, NT: 10008, ACT: 8632, SA: 7129,
    NSW: 7778, QLD: 7270, WA: 7634, VIC: 6778
};

const STATE_POSTCODES = {
    NSW: "2000", VIC: "3000", QLD: "4000", SA: "5000",
    WA: "6000", TAS: "7000", NT: "0800", ACT: "2600"
};

const MONTHLY_RATIOS = {
    TAS: [0.0855, 0.0778, 0.0751, 0.0714, 0.0847, 0.1055, 0.1067, 0.0945, 0.0736, 0.0721, 0.0730, 0.0803],
    NT: [0.0855, 0.0778, 0.0751, 0.0714, 0.0847, 0.1055, 0.1067, 0.0945, 0.0736, 0.0721, 0.0730, 0.0803],
    ACT: [0.0855, 0.0778, 0.0751, 0.0714, 0.0847, 0.1055, 0.1067, 0.0945, 0.0736, 0.0721, 0.0730, 0.0803],
    SA: [0.0855, 0.0778, 0.0751, 0.0714, 0.0847, 0.1055, 0.1067, 0.0945, 0.0736, 0.0721, 0.0730, 0.0803],
    NSW: [0.0855, 0.0778, 0.0751, 0.0714, 0.0847, 0.1055, 0.1067, 0.0945, 0.0736, 0.0721, 0.0730, 0.0803],
    QLD: [0.0927, 0.0922, 0.0869, 0.0814, 0.0790, 0.0823, 0.0819, 0.0793, 0.0760, 0.0767, 0.0819, 0.0896],
    WA: [0.0855, 0.0778, 0.0751, 0.0714, 0.0847, 0.1055, 0.1067, 0.0945, 0.0736, 0.0721, 0.0730, 0.0803],
    VIC: [0.0855, 0.0778, 0.0751, 0.0714, 0.0847, 0.1055, 0.1067, 0.0945, 0.0736, 0.0721, 0.0730, 0.0803]
};

const HOURLY_RATIOS = {
    TAS: [0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.03941, 0.03941],
    NT: [0.02990, 0.02638, 0.02405, 0.02319, 0.02396, 0.02745, 0.03486, 0.04163, 0.04270, 0.04255, 0.04252, 0.04348, 0.04421, 0.04440, 0.04486, 0.04667, 0.05074, 0.05727, 0.06229, 0.05996, 0.05621, 0.04970, 0.04421, 0.03679],
    ACT: [0.03400, 0.03031, 0.02876, 0.02867, 0.03055, 0.03643, 0.04493, 0.04904, 0.04317, 0.03792, 0.03615, 0.03118, 0.03053, 0.02937, 0.03003, 0.03369, 0.04434, 0.05901, 0.06693, 0.06550, 0.06142, 0.05416, 0.05178, 0.04208],
    SA: [0.04850, 0.05185, 0.03814, 0.02956, 0.02568, 0.02654, 0.03142, 0.03655, 0.03563, 0.03624, 0.04103, 0.04366, 0.04188, 0.03980, 0.03997, 0.04111, 0.04525, 0.05442, 0.05990, 0.05715, 0.05315, 0.04739, 0.03905, 0.03607],
    NSW: [0.04427, 0.03912, 0.03176, 0.02706, 0.02583, 0.02805, 0.03427, 0.03939, 0.04089, 0.04050, 0.03986, 0.03936, 0.03948, 0.03908, 0.03920, 0.04105, 0.04569, 0.05328, 0.05846, 0.05634, 0.05329, 0.04947, 0.04804, 0.04630],
    QLD: [0.02990, 0.02638, 0.02405, 0.02319, 0.02396, 0.02745, 0.03486, 0.04163, 0.04270, 0.04255, 0.04252, 0.04348, 0.04421, 0.04440, 0.04486, 0.04667, 0.05074, 0.05727, 0.06229, 0.05996, 0.05621, 0.04970, 0.04421, 0.03679],
    WA: [0.02990, 0.02638, 0.02405, 0.02319, 0.02396, 0.02745, 0.03486, 0.04163, 0.04270, 0.04255, 0.04252, 0.04348, 0.04421, 0.04440, 0.04486, 0.04667, 0.05074, 0.05727, 0.06229, 0.05996, 0.05621, 0.04970, 0.04421, 0.03679],
    VIC: [0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.03941, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.04714, 0.03941, 0.03941]
};

let roofPlaneCount = 0;

// 初始化页面
function initPage() {
    renderMonthlyRatiosTable();
    renderHourlyRatiosTable();
    addRoofPlane(); // 默认添加一个屋顶坡面
    addRoofPlane(); // 默认添加第二个屋顶坡面
    updateStateDefaults();
}

// 更新州默认值
function updateStateDefaults() {
    const state = document.getElementById('userState').value;
    document.getElementById('userAnnualUsage').value = STATE_ANNUAL_USAGE[state];
    document.getElementById('userPostcode').value = STATE_POSTCODES[state];
}

// 渲染月度比例表格
function renderMonthlyRatiosTable() {
    const tbody = document.getElementById('monthlyRatiosTable');
    const states = ['TAS', 'NT', 'ACT', 'SA', 'NSW', 'QLD', 'WA', 'VIC'];
    
    tbody.innerHTML = states.map(state => {
        const ratios = MONTHLY_RATIOS[state];
        return `
            <tr>
                <td><strong>${state}</strong></td>
                ${ratios.map((ratio, idx) => 
                    `<td><input type="number" step="0.0001" value="${ratio.toFixed(4)}" 
                        id="monthly_${state}_${idx}" style="width: 70px;"></td>`
                ).join('')}
            </tr>
        `;
    }).join('');
}

// 渲染小时比例表格
function renderHourlyRatiosTable() {
    const tbody = document.getElementById('hourlyRatiosTable');
    const states = ['TAS', 'NT', 'ACT', 'SA', 'NSW', 'QLD', 'WA', 'VIC'];
    
    tbody.innerHTML = states.map(state => {
        const ratios = HOURLY_RATIOS[state];
        return `
            <tr>
                <td><strong>${state}</strong></td>
                ${ratios.map((ratio, idx) => 
                    `<td><input type="number" step="0.00001" value="${ratio.toFixed(5)}" 
                        id="hourly_${state}_${idx}" style="width: 65px;"></td>`
                ).join('')}
            </tr>
        `;
    }).join('');
}

// 添加屋顶坡面
function addRoofPlane() {
    const container = document.getElementById('roofPlanesContainer');
    const planeId = String.fromCharCode(65 + roofPlaneCount);
    
    const defaultValues = [
        { azimuth: 0, tilt: 20, maxPanels: 10, efficiency: 0.95 },
        { azimuth: 90, tilt: 20, maxPanels: 8, efficiency: 0.85 },
        { azimuth: 180, tilt: 20, maxPanels: 6, efficiency: 0.70 },
        { azimuth: 270, tilt: 20, maxPanels: 8, efficiency: 0.85 }
    ];
    
    const defaults = defaultValues[roofPlaneCount] || { azimuth: 0, tilt: 20, maxPanels: 8, efficiency: 0.85 };
    
    const planeDiv = document.createElement('div');
    planeDiv.className = 'roof-plane-item';
    planeDiv.id = `roof_plane_${roofPlaneCount}`;
    planeDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <strong>屋顶坡面 ${planeId}</strong>
            <button type="button" onclick="removeRoofPlane(${roofPlaneCount})" 
                style="background: #f44336; padding: 4px 12px; font-size: 12px;">删除</button>
        </div>
        <div class="roof-plane-grid">
            <div class="form-group">
                <label>坡面ID</label>
                <input type="text" id="plane_id_${roofPlaneCount}" value="${planeId}">
            </div>
            <div class="form-group">
                <label>方位角 (°)</label>
                <input type="number" id="plane_azimuth_${roofPlaneCount}" value="${defaults.azimuth}">
            </div>
            <div class="form-group">
                <label>倾角 (°)</label>
                <input type="number" id="plane_tilt_${roofPlaneCount}" value="${defaults.tilt}">
            </div>
            <div class="form-group">
                <label>最大面板数</label>
                <input type="number" id="plane_max_panels_${roofPlaneCount}" value="${defaults.maxPanels}">
            </div>
            <div class="form-group">
                <label>效率评分</label>
                <input type="number" step="0.01" id="plane_efficiency_${roofPlaneCount}" value="${defaults.efficiency}">
            </div>
        </div>
    `;
    
    container.appendChild(planeDiv);
    roofPlaneCount++;
}

// 删除屋顶坡面
function removeRoofPlane(index) {
    const element = document.getElementById(`roof_plane_${index}`);
    if (element) {
        element.remove();
    }
}

// 导出配置
function exportConfig() {
    const config = collectAllConfig();
    const json = JSON.stringify(config, null, 2);
    
    // 创建下载链接
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solar-config.json';
    a.click();
    URL.revokeObjectURL(url);
    
    alert('✅ 配置已导出为 solar-config.json');
}

// 收集所有配置
function collectAllConfig() {
    const states = ['TAS', 'NT', 'ACT', 'SA', 'NSW', 'QLD', 'WA', 'VIC'];
    
    // 收集年用电量
    const annualUsage = {};
    states.forEach(state => {
        annualUsage[state] = parseFloat(document.getElementById(`annual_${state}`).value);
    });
    
    // 收集月度比例
    const monthlyRatios = {};
    states.forEach(state => {
        monthlyRatios[state] = [];
        for (let i = 0; i < 12; i++) {
            monthlyRatios[state].push(parseFloat(document.getElementById(`monthly_${state}_${i}`).value));
        }
    });
    
    // 收集小时比例
    const hourlyRatios = {};
    states.forEach(state => {
        hourlyRatios[state] = [];
        for (let i = 0; i < 24; i++) {
            hourlyRatios[state].push(parseFloat(document.getElementById(`hourly_${state}_${i}`).value));
        }
    });
    
    // 收集屋顶数据
    const roofPlanes = [];
    for (let i = 0; i < roofPlaneCount; i++) {
        const planeIdElem = document.getElementById(`plane_id_${i}`);
        if (planeIdElem) {
            roofPlanes.push({
                plane_id: planeIdElem.value,
                azimuth: parseFloat(document.getElementById(`plane_azimuth_${i}`).value),
                tilt: parseFloat(document.getElementById(`plane_tilt_${i}`).value),
                max_panels: parseInt(document.getElementById(`plane_max_panels_${i}`).value),
                efficiency: parseFloat(document.getElementById(`plane_efficiency_${i}`).value)
            });
        }
    }
    
    return {
        user_info: {
            state: document.getElementById('userState').value,
            annual_usage_kwh: parseFloat(document.getElementById('userAnnualUsage').value),
            postcode: document.getElementById('userPostcode').value
        },
        state_data: {
            annual_usage: annualUsage,
            monthly_ratios: monthlyRatios,
            hourly_ratios: hourlyRatios
        },
        roof_planes: roofPlanes,
        hardware: {
            panel: {
                watts: parseFloat(document.getElementById('panel_watts').value),
                v_mp: parseFloat(document.getElementById('panel_v_mp').value),
                v_oc: parseFloat(document.getElementById('panel_v_oc').value),
                i_mp: parseFloat(document.getElementById('panel_i_mp').value)
            },
            inverter: {
                v_start: parseFloat(document.getElementById('inverter_v_start').value),
                v_max: parseFloat(document.getElementById('inverter_v_max').value),
                max_single_phase_kw: parseFloat(document.getElementById('inverter_max_single_phase_kw').value),
                max_three_phase_kw: parseFloat(document.getElementById('inverter_max_three_phase_kw').value)
            },
            battery: {
                standard_capacities: document.getElementById('battery_standard_capacities').value.split(',').map(s => parseFloat(s.trim())),
                dod: parseFloat(document.getElementById('battery_dod').value),
                rte: parseFloat(document.getElementById('battery_rte').value),
                c_rate: parseFloat(document.getElementById('battery_c_rate').value)
            }
        },
        strategies: {
            A: {
                name: document.getElementById('strategy_a_name').value,
                battery_ratio: parseFloat(document.getElementById('strategy_a_ratio').value)
            },
            B: {
                name: document.getElementById('strategy_b_name').value,
                battery_ratio: parseFloat(document.getElementById('strategy_b_ratio').value)
            },
            C: {
                name: document.getElementById('strategy_c_name').value,
                battery_ratio: parseFloat(document.getElementById('strategy_c_ratio').value)
            }
        }
    };
}

// 导入配置
function importConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const config = JSON.parse(event.target.result);
                applyConfig(config);
                alert('✅ 配置已成功导入');
            } catch (error) {
                alert('❌ 配置文件格式错误：' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// 应用配置
function applyConfig(config) {
    // 应用用户信息
    if (config.user_info) {
        document.getElementById('userState').value = config.user_info.state;
        document.getElementById('userAnnualUsage').value = config.user_info.annual_usage_kwh;
        document.getElementById('userPostcode').value = config.user_info.postcode;
    }
    
    // 应用硬件参数
    if (config.hardware) {
        if (config.hardware.panel) {
            document.getElementById('panel_watts').value = config.hardware.panel.watts;
            document.getElementById('panel_v_mp').value = config.hardware.panel.v_mp;
            document.getElementById('panel_v_oc').value = config.hardware.panel.v_oc;
            document.getElementById('panel_i_mp').value = config.hardware.panel.i_mp;
        }
        if (config.hardware.inverter) {
            document.getElementById('inverter_v_start').value = config.hardware.inverter.v_start;
            document.getElementById('inverter_v_max').value = config.hardware.inverter.v_max;
            document.getElementById('inverter_max_single_phase_kw').value = config.hardware.inverter.max_single_phase_kw;
            document.getElementById('inverter_max_three_phase_kw').value = config.hardware.inverter.max_three_phase_kw;
        }
    }
    
    // 应用策略
    if (config.strategies) {
        document.getElementById('strategy_a_name').value = config.strategies.A.name;
        document.getElementById('strategy_a_ratio').value = config.strategies.A.battery_ratio;
        document.getElementById('strategy_b_name').value = config.strategies.B.name;
        document.getElementById('strategy_b_ratio').value = config.strategies.B.battery_ratio;
        document.getElementById('strategy_c_name').value = config.strategies.C.name;
        document.getElementById('strategy_c_ratio').value = config.strategies.C.battery_ratio;
    }
}

// 应用到计算器
function applyToCalculator() {
    const config = collectAllConfig();
    localStorage.setItem('solarCalculatorConfig', JSON.stringify(config));
    alert('✅ 配置已保存到浏览器，计算器将自动使用新配置');
}

// 恢复默认值
function resetDefaults() {
    if (confirm('确定要恢复所有默认值吗？')) {
        location.reload();
    }
}

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', initPage);
