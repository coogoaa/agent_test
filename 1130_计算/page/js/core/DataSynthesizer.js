/**
 * 数据合成器 - 生成负荷曲线和光伏发电曲线
 * 基于 1130_计算/docs/implementation_logic.md 实现
 */

class DataSynthesizer {
    constructor(config) {
        this.config = config;
        this.stateMonthlyWeights = this.loadMonthlyWeights();
        this.stateHourlyWeights = this.loadHourlyWeights();
        this.pvGenerationTemplates = this.loadPVTemplates();
    }

    /**
     * 加载各州月度用电比例
     */
    loadMonthlyWeights() {
        // 各州月用电比例 (12个月)
        return {
            'TAS': [0.0855, 0.0778, 0.0751, 0.0729, 0.0778, 0.0923, 0.0960, 0.0936, 0.0874, 0.0826, 0.0778, 0.0812],
            'NT': [0.0843, 0.0767, 0.0740, 0.0718, 0.0767, 0.0910, 0.0947, 0.0923, 0.0862, 0.0814, 0.0767, 0.0801],
            'ACT': [0.0863, 0.0785, 0.0758, 0.0736, 0.0785, 0.0931, 0.0969, 0.0945, 0.0883, 0.0835, 0.0785, 0.0820],
            'SA': [0.0884, 0.0804, 0.0777, 0.0754, 0.0804, 0.0954, 0.0993, 0.0968, 0.0905, 0.0856, 0.0804, 0.0840],
            'NSW': [0.0891, 0.0811, 0.0784, 0.0761, 0.0811, 0.0962, 0.1001, 0.0976, 0.0913, 0.0863, 0.0811, 0.0847],
            'QLD': [0.0895, 0.0814, 0.0787, 0.0764, 0.0814, 0.0966, 0.1005, 0.0980, 0.0917, 0.0867, 0.0814, 0.0851],
            'VIC': [0.0908, 0.0826, 0.0799, 0.0775, 0.0826, 0.0980, 0.1020, 0.0994, 0.0930, 0.0879, 0.0826, 0.0863],
            'WA': [0.0914, 0.0831, 0.0804, 0.0780, 0.0831, 0.0986, 0.1026, 0.1000, 0.0936, 0.0885, 0.0831, 0.0869]
        };
    }

    /**
     * 加载各州小时用电比例
     */
    loadHourlyWeights() {
        // 各州24小时用电比例
        return {
            'TAS': [0.0238, 0.0221, 0.0205, 0.0193, 0.0189, 0.0205, 0.0267, 0.0357, 0.0402, 0.0398, 0.0390, 0.0398, 0.0414, 0.0422, 0.0426, 0.0430, 0.0471, 0.0586, 0.0614, 0.0586, 0.0520, 0.0455, 0.0373, 0.0295],
            'NT': [0.0234, 0.0217, 0.0201, 0.0189, 0.0185, 0.0201, 0.0262, 0.0350, 0.0394, 0.0390, 0.0382, 0.0390, 0.0406, 0.0414, 0.0418, 0.0422, 0.0462, 0.0574, 0.0602, 0.0574, 0.0510, 0.0446, 0.0366, 0.0289],
            'ACT': [0.0240, 0.0223, 0.0207, 0.0195, 0.0191, 0.0207, 0.0269, 0.0360, 0.0405, 0.0401, 0.0393, 0.0401, 0.0417, 0.0425, 0.0429, 0.0433, 0.0474, 0.0590, 0.0618, 0.0590, 0.0524, 0.0458, 0.0376, 0.0297],
            'SA': [0.0246, 0.0229, 0.0212, 0.0200, 0.0196, 0.0212, 0.0276, 0.0369, 0.0415, 0.0411, 0.0403, 0.0411, 0.0427, 0.0435, 0.0439, 0.0443, 0.0485, 0.0604, 0.0633, 0.0604, 0.0537, 0.0469, 0.0385, 0.0304],
            'NSW': [0.0248, 0.0230, 0.0214, 0.0201, 0.0197, 0.0214, 0.0278, 0.0372, 0.0418, 0.0414, 0.0406, 0.0414, 0.0430, 0.0438, 0.0442, 0.0446, 0.0489, 0.0609, 0.0638, 0.0609, 0.0541, 0.0473, 0.0388, 0.0307],
            'QLD': [0.0249, 0.0231, 0.0215, 0.0202, 0.0198, 0.0215, 0.0279, 0.0374, 0.0420, 0.0416, 0.0408, 0.0416, 0.0432, 0.0440, 0.0444, 0.0448, 0.0491, 0.0611, 0.0641, 0.0611, 0.0543, 0.0475, 0.0390, 0.0308],
            'VIC': [0.0252, 0.0234, 0.0217, 0.0205, 0.0201, 0.0217, 0.0283, 0.0379, 0.0426, 0.0422, 0.0414, 0.0422, 0.0438, 0.0446, 0.0450, 0.0454, 0.0498, 0.0619, 0.0649, 0.0619, 0.0550, 0.0481, 0.0395, 0.0312],
            'WA': [0.0254, 0.0236, 0.0219, 0.0206, 0.0202, 0.0219, 0.0285, 0.0381, 0.0429, 0.0425, 0.0417, 0.0425, 0.0441, 0.0449, 0.0453, 0.0457, 0.0501, 0.0623, 0.0654, 0.0623, 0.0554, 0.0484, 0.0398, 0.0314]
        };
    }

    /**
     * 加载光伏发电模板 (简化版 - 按方位角)
     * 实际应用中应从 发电样例.md 加载完整数据
     */
    loadPVTemplates() {
        // 标准化的24小时发电曲线模板 (按方位角分组)
        // 这里使用简化模型，实际应该从GIS数据或PVGIS API获取
        return {
            // 北向 (0°) - 南半球最佳
            0: [0, 0, 0, 0, 0, 0, 0.05, 0.15, 0.28, 0.42, 0.55, 0.65, 0.70, 0.65, 0.55, 0.42, 0.28, 0.15, 0.05, 0, 0, 0, 0, 0],
            // 东北 (45°)
            45: [0, 0, 0, 0, 0, 0, 0.08, 0.22, 0.38, 0.50, 0.58, 0.62, 0.60, 0.55, 0.48, 0.38, 0.25, 0.12, 0.04, 0, 0, 0, 0, 0],
            // 东向 (90°)
            90: [0, 0, 0, 0, 0, 0, 0.12, 0.30, 0.45, 0.55, 0.58, 0.55, 0.48, 0.40, 0.32, 0.22, 0.12, 0.05, 0.02, 0, 0, 0, 0, 0],
            // 东南 (135°)
            135: [0, 0, 0, 0, 0, 0, 0.10, 0.25, 0.40, 0.50, 0.55, 0.55, 0.52, 0.45, 0.38, 0.28, 0.18, 0.08, 0.03, 0, 0, 0, 0, 0],
            // 南向 (180°)
            180: [0, 0, 0, 0, 0, 0, 0.03, 0.10, 0.20, 0.30, 0.38, 0.42, 0.45, 0.42, 0.38, 0.30, 0.20, 0.10, 0.03, 0, 0, 0, 0, 0],
            // 西南 (225°)
            225: [0, 0, 0, 0, 0, 0, 0.04, 0.12, 0.22, 0.32, 0.40, 0.48, 0.55, 0.58, 0.55, 0.45, 0.30, 0.15, 0.05, 0, 0, 0, 0, 0],
            // 西向 (270°)
            270: [0, 0, 0, 0, 0, 0, 0.02, 0.08, 0.18, 0.28, 0.38, 0.48, 0.55, 0.60, 0.58, 0.50, 0.38, 0.22, 0.08, 0, 0, 0, 0, 0],
            // 西北 (315°)
            315: [0, 0, 0, 0, 0, 0, 0.04, 0.12, 0.25, 0.38, 0.48, 0.55, 0.60, 0.62, 0.58, 0.50, 0.38, 0.22, 0.08, 0, 0, 0, 0, 0]
        };
    }

    /**
     * 生成8760小时负荷曲线
     * @param {number} annualKwh - 年用电量 (kWh)
     * @param {string} stateCode - 州代码
     * @returns {Float32Array} - 8760小时负荷曲线 (kW)
     */
    generateLoadProfile(annualKwh, stateCode) {
        const monthlyWeights = this.stateMonthlyWeights[stateCode];
        const hourlyWeights = this.stateHourlyWeights[stateCode];
        
        if (!monthlyWeights || !hourlyWeights) {
            throw new Error(`未找到州 ${stateCode} 的数据`);
        }

        const loadProfile = new Float32Array(8760);
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        
        let hourIndex = 0;
        
        for (let month = 0; month < 12; month++) {
            const monthlyKwh = annualKwh * monthlyWeights[month];
            const dailyKwh = monthlyKwh / daysInMonth[month];
            
            for (let day = 0; day < daysInMonth[month]; day++) {
                for (let hour = 0; hour < 24; hour++) {
                    // 每小时负荷 = 日均用电量 × 该小时权重
                    loadProfile[hourIndex] = dailyKwh * hourlyWeights[hour];
                    hourIndex++;
                }
            }
        }
        
        // 验证总和
        const totalLoad = loadProfile.reduce((sum, val) => sum + val, 0);
        console.log(`负荷曲线生成完成: 年用电量=${annualKwh.toFixed(0)} kWh, 实际总和=${totalLoad.toFixed(0)} kWh, 误差=${((totalLoad - annualKwh) / annualKwh * 100).toFixed(2)}%`);
        
        return loadProfile;
    }

    /**
     * 生成单个坡面的8760小时发电曲线
     * @param {number} aspect - 方位角 (度)
     * @param {number} panelCount - 面板数量
     * @param {number} panelPower - 单板功率 (kW)
     * @returns {Float32Array} - 8760小时发电曲线 (kW)
     */
    generatePVProfileForPlane(aspect, panelCount, panelPower = 0.44) {
        // 找到最近的两个方位角模板
        const angles = Object.keys(this.pvGenerationTemplates).map(Number).sort((a, b) => a - b);
        
        // 标准化方位角到0-360
        let normalizedAspect = aspect % 360;
        if (normalizedAspect < 0) normalizedAspect += 360;
        
        // 找到最近的模板
        let lowerAngle = 0;
        let upperAngle = 0;
        
        for (let i = 0; i < angles.length; i++) {
            if (normalizedAspect <= angles[i]) {
                upperAngle = angles[i];
                lowerAngle = i > 0 ? angles[i - 1] : angles[angles.length - 1];
                break;
            }
        }
        
        if (upperAngle === 0 && normalizedAspect > angles[angles.length - 1]) {
            lowerAngle = angles[angles.length - 1];
            upperAngle = 360;
        }
        
        // 线性插值
        const lowerTemplate = this.pvGenerationTemplates[lowerAngle] || this.pvGenerationTemplates[0];
        const upperTemplate = this.pvGenerationTemplates[upperAngle % 360] || this.pvGenerationTemplates[0];
        
        const weight = upperAngle !== lowerAngle 
            ? (normalizedAspect - lowerAngle) / (upperAngle - lowerAngle)
            : 0;
        
        // 生成8760小时曲线
        const pvProfile = new Float32Array(8760);
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        
        let hourIndex = 0;
        
        for (let month = 0; month < 12; month++) {
            // 季节性调整因子 (夏季更高，冬季更低)
            const seasonalFactor = 1.0 + 0.2 * Math.sin((month - 5) * Math.PI / 6);
            
            for (let day = 0; day < daysInMonth[month]; day++) {
                for (let hour = 0; hour < 24; hour++) {
                    // 插值获取该小时的标准化发电量
                    const normalizedGen = lowerTemplate[hour] * (1 - weight) + upperTemplate[hour] * weight;
                    
                    // 实际发电量 = 标准化值 × 季节因子 × 面板数 × 单板功率
                    pvProfile[hourIndex] = normalizedGen * seasonalFactor * panelCount * panelPower;
                    hourIndex++;
                }
            }
        }
        
        return pvProfile;
    }

    /**
     * 生成多个坡面的总发电曲线
     * @param {Array} planes - 坡面数组 [{aspect, panelCount}]
     * @param {number} panelPower - 单板功率 (kW)
     * @returns {Float32Array} - 8760小时总发电曲线 (kW)
     */
    generateTotalPVProfile(planes, panelPower = 0.44) {
        const totalProfile = new Float32Array(8760);
        
        planes.forEach(plane => {
            if (plane.panelCount > 0) {
                const planeProfile = this.generatePVProfileForPlane(
                    plane.aspect, 
                    plane.panelCount, 
                    panelPower
                );
                
                for (let i = 0; i < 8760; i++) {
                    totalProfile[i] += planeProfile[i];
                }
            }
        });
        
        const totalAnnual = totalProfile.reduce((sum, val) => sum + val, 0);
        const ratedPower = planes.reduce((sum, p) => sum + p.panelCount * panelPower, 0);
        console.log(`PV发电曲线生成完成: 装机容量=${ratedPower.toFixed(2)} kW, 年发电量=${totalAnnual.toFixed(0)} kWh`);
        
        return totalProfile;
    }

    /**
     * 计算坡面评分 (综合方位角、倾角、遮挡)
     * @param {number} aspect - 方位角 (度)
     * @param {number} tilt - 倾角 (度，可选)
     * @param {number} shadeFactor - 遮挡系数 (0-1，可选)
     * @param {number} latitude - 纬度 (用于计算理想倾角)
     * @returns {number} - 评分 (0-100)
     */
    calculatePlaneScore(aspect, tilt = null, shadeFactor = 1.0, latitude = -42) {
        // 方位角评分 (南半球北向最佳，aspect=0°)
        let normalizedAspect = aspect % 360;
        if (normalizedAspect < 0) normalizedAspect += 360;
        
        const diff = Math.min(Math.abs(normalizedAspect), 360 - Math.abs(normalizedAspect));
        const scoreAspect = Math.max(0, 1 - diff / 180);
        
        // 倾角评分
        let scoreTilt = 1.0;
        if (tilt !== null) {
            const idealTilt = Math.abs(latitude) * 0.8;
            scoreTilt = Math.max(0, 1 - Math.abs(tilt - idealTilt) / 90);
        }
        
        // 遮挡评分
        const scoreShade = shadeFactor;
        
        // 综合评分 (权重: 方位60%, 倾角30%, 遮挡10%)
        const totalScore = 100 * (0.6 * scoreAspect + 0.3 * scoreTilt + 0.1 * scoreShade);
        
        return totalScore;
    }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataSynthesizer;
}
