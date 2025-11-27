/**
 * 共享配置加载器
 * 用于所有页面从localStorage加载配置
 */

// 默认配置
const DEFAULT_CONFIG = {
    pv: {
        model: 'JA Solar JAM72S30 550/MR',
        pmax: 440
    },
    battery: {
        premium: { daily: 0.5, evening: 2.0, pv: 1.5 },
        balanced: { daily: 0.3, evening: 1.5, pv: 1.0 },
        economy: { daily: 0.2, evening: 1.0, pv: 0.8 },
        standards: [5, 6.5, 9.6, 10, 13.5, 16, 20],
        useStandards: true,  // 是否使用标准电池规格标准化
        dod: 0.9,    // Depth of Discharge (放电深度)
        rte: 0.9     // Round Trip Efficiency (往返效率)
    },
    inverter: {
        single: {
            a: [5, 6, 8, 10],
            b: [5, 8],
            c: [5, 8]
        },
        three: {
            a: [5, 8, 10, 15, 20, 30],
            b: [5, 8, 10, 15],
            c: [5, 8, 10]
        },
        targetRatio: 180,  // 目标容配比 180%
        maxRatio: 200      // 最大容配比 200%
    },
    consumption: {
        TAS: 10148,
        NT: 10008,
        ACT: 8632,
        SA: 7129,
        NSW: 7778,
        QLD: 7270,
        WA: 7634,
        VIC: 6778
    },
    cost: {
        pvPerKw: 540,
        inverterPerKw: 280,
        batteryPerKwh: 865,
        gstRate: 0.1
    },
    subsidy: {
        stcPrice: 39,
        installYear: 2025,
        deemingEndYear: 2030,
        batteryStcFactor: 9.3,
        batteryCapacityCap: 50,
        zoneRating: {
            TAS: 1.382,
            NT: 1.622,
            ACT: 1.382,
            SA: 1.536,
            NSW: 1.382,
            QLD: 1.536,
            VIC: 1.382,
            WA: 1.536
        }
    }
};

/**
 * 从localStorage加载配置，如果没有则使用默认配置
 */
function loadConfig() {
    try {
        const stored = localStorage.getItem('solarConfig');
        if (stored) {
            const config = JSON.parse(stored);
            console.log('✅ 已加载保存的配置');
            return config;
        }
    } catch (error) {
        console.error('❌ 加载配置失败:', error);
    }
    
    console.log('ℹ️ 使用默认配置');
    return DEFAULT_CONFIG;
}

/**
 * 获取配置的特定部分
 */
function getConfig(section) {
    const config = loadConfig();
    return section ? config[section] : config;
}

// 导出函数供其他页面使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadConfig, getConfig, DEFAULT_CONFIG };
}
