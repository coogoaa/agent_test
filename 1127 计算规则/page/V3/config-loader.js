/**
 * 共享配置加载器
 * 用于所有页面从localStorage加载配置
 */

// 默认配置
const DEFAULT_CONFIG = {
    pv: {
        model: 'JA Solar JAM72S30 550/MR',
        pmax: 440,
        annualKwhPerKw: 1526  // 年发电系数 (kWh/kW/yr)
    },
    battery: {
        // V3: 基于光伏剩余能量的新算法系数
        premium: { daily: 0.5, evening: 1.5, surplus: 0.85 },
        balanced: { daily: 0.3, evening: 1.2, surplus: 0.6 },
        economy: { daily: 0.2, evening: 0.8, surplus: 0.4 },
        standards: [5, 6.5, 9.6, 10, 13.5, 16, 20, 25, 30, 40, 50],
        useStandards: true,  // 是否使用标准电池规格标准化
        minCapacity: 5,      // 最小电池容量 (kWh)
        maxCapacity: 50,     // 最大电池容量 (kWh)
        dod: 0.9,    // Depth of Discharge (放电深度)
        rte: 0.95,   // Round Trip Efficiency (往返效率)
        // 白天用电比例 (6:00-17:00)
        daytimeRatio: {
            NSW: 0.45, VIC: 0.47, QLD: 0.48, SA: 0.44,
            WA: 0.48, TAS: 0.47, ACT: 0.42, NT: 0.48
        },
        selfConsumptionFactor: 0.7  // 白天自消纳系数
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
        enableSingleOptions: false, // 是否强制使用单相可用规格列表
        enableThreeOptions: false,  // 是否强制使用三相可用规格列表
        singleMaxKw: 10,   // 单相Hybrid逆变器最大功率
        threeMaxKw: 30,    // 三相Hybrid逆变器最大功率
        targetRatio: 180,  // 目标容配比 180%
        maxRatio: 200      // 最大容配比 200%
    },
    expansion: {
        roofCapacityFactor: 0.7,  // 储能扩容屋顶容量系数
        replaceInverter: true      // 储能扩容是否更换逆变器
    },
    proposals: {
        // 方案A (高端型): 满铺策略，999表示无上限
        premium: { targetKw: 999 },
        // 方案B (平衡型): 根据屋顶容量动态选择目标功率
        balanced: { 
            targetKwSmall: 10.0,   // 小屋顶目标功率 (屋顶容量 <= roofThreshold)
            targetKwLarge: 13.0,   // 大屋顶目标功率 (屋顶容量 > roofThreshold)
            roofThreshold: 15      // 屋顶容量阈值 (kW)，用于判断选择哪个目标功率
        },
        // 方案C (经济型): 固定目标功率
        economy: { targetKw: 6.6 }
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
        // 成本计算方案选择: 'A' = 线性方案, 'B' = 基准+增量方案, 'C' = $/kW简化定价
        scheme: 'A',
        // 方案A: 线性定价 (原有方案)
        schemeA: {
            pvPerKw: 540,
            inverterPerKw: 280,
            batteryPerKwh: 865
        },
        // 方案B: 基准+增量定价
        schemeB: {
            // 光伏系统配置
            baseKw: 6.6,              // 基准系统容量 (kW)
            basePrice: 4500,          // 6.6kW基准系统售价 (不含GST)
            adderPricePerKw: 500,     // 超额每kW单价
            // 储能系统配置
            batteryInstallFee: 1500,  // 储能基础安装费
            batteryPerKwh: 700        // 电池容量单价 (每kWh)
        },
        // 方案C: $/kW 简化定价 (市场通用报价方式)
        schemeC: {
            // Solar Only (纯光伏): 包含 PV 面板 + 逆变器 + 安装费
            solarOnly: {
                exGstExStc: 750,      // 不含税不含补贴 (AUD/kW)
                incGstIncStc: 600     // 含税含补贴 (AUD/kW)
            },
            // Hybrid (光伏+储能): 光伏部分 (含混合逆变器)
            hybridPv: {
                exGstExStc: 800,      // 不含税不含补贴 (AUD/kW)
                incGstIncStc: 650     // 含税含补贴 (AUD/kW)
            },
            // 电池储能 (基于标称容量)
            battery: {
                exGstExStc: 700,      // 不含税不含补贴 (AUD/kWh)
                incGstIncStc: 450     // 含税含补贴 (AUD/kWh)
            }
        },
        // 方案D: 分离式定价 (PV + 电池安装费 + 电池容量)
        // 调整后参数，使价格接近方案 A/B
        schemeD: {
            // Solar Only (无电池)
            solarOnly: {
                exGstExStc: 750,      // 不含税不含补贴 (AUD/kW)
                incGstIncStc: 600     // 含税含补贴 (AUD/kW)
            },
            // Hybrid (有电池): PV 部分单价 (电池成本单独计算)
            hybridPv: {
                exGstExStc: 650,      // 不含税不含补贴 (AUD/kW)
                incGstIncStc: 520     // 含税含补贴 (AUD/kW)
            },
            // 电池安装费 (固定)
            batteryInstallFee: {
                exGstExStc: 1800,     // 不含税不含补贴 (AUD)
                incGstIncStc: 1500    // 含税含补贴 (AUD)
            },
            // 自定义电池容量单价 (无标准电池价格时使用)
            batteryPerKwh: {
                exGstExStc: 550,      // 不含税不含补贴 (AUD/kWh)
                incGstIncStc: 450     // 含税含补贴 (AUD/kWh)
            },
            // 标准电池价格表 (预留，未来可配置)
            standardBatteries: {
                // 格式: "容量kWh": { name, exGstExStc, incGstIncStc }
                // 示例: "10": { name: "Tesla Powerwall 2", exGstExStc: 12000, incGstIncStc: 10000 }
            }
        },
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
            const merged = {
                ...DEFAULT_CONFIG,
                ...config,
                pv: {
                    ...DEFAULT_CONFIG.pv,
                    ...(config.pv || {})
                },
                battery: {
                    ...DEFAULT_CONFIG.battery,
                    ...(config.battery || {}),
                    premium: {
                        ...DEFAULT_CONFIG.battery.premium,
                        ...(config.battery?.premium || {})
                    },
                    balanced: {
                        ...DEFAULT_CONFIG.battery.balanced,
                        ...(config.battery?.balanced || {})
                    },
                    economy: {
                        ...DEFAULT_CONFIG.battery.economy,
                        ...(config.battery?.economy || {})
                    }
                },
                inverter: {
                    ...DEFAULT_CONFIG.inverter,
                    ...(config.inverter || {}),
                    single: {
                        ...DEFAULT_CONFIG.inverter.single,
                        ...(config.inverter?.single || {})
                    },
                    three: {
                        ...DEFAULT_CONFIG.inverter.three,
                        ...(config.inverter?.three || {})
                    }
                },
                proposals: {
                    ...DEFAULT_CONFIG.proposals,
                    ...(config.proposals || {}),
                    premium: {
                        ...DEFAULT_CONFIG.proposals.premium,
                        ...(config.proposals?.premium || {})
                    },
                    balanced: {
                        ...DEFAULT_CONFIG.proposals.balanced,
                        ...(config.proposals?.balanced || {})
                    },
                    economy: {
                        ...DEFAULT_CONFIG.proposals.economy,
                        ...(config.proposals?.economy || {})
                    }
                },
                expansion: {
                    ...DEFAULT_CONFIG.expansion,
                    ...(config.expansion || {})
                },
                consumption: {
                    ...DEFAULT_CONFIG.consumption,
                    ...(config.consumption || {})
                },
                cost: {
                    ...DEFAULT_CONFIG.cost,
                    ...(config.cost || {}),
                    schemeA: {
                        ...DEFAULT_CONFIG.cost.schemeA,
                        ...(config.cost?.schemeA || {})
                    },
                    schemeB: {
                        ...DEFAULT_CONFIG.cost.schemeB,
                        ...(config.cost?.schemeB || {})
                    },
                    schemeC: {
                        ...DEFAULT_CONFIG.cost.schemeC,
                        ...(config.cost?.schemeC || {})
                    },
                    schemeD: {
                        ...DEFAULT_CONFIG.cost.schemeD,
                        ...(config.cost?.schemeD || {})
                    }
                },
                subsidy: {
                    ...DEFAULT_CONFIG.subsidy,
                    ...(config.subsidy || {}),
                    zoneRating: {
                        ...DEFAULT_CONFIG.subsidy.zoneRating,
                        ...(config.subsidy?.zoneRating || {})
                    }
                }
            };

            console.log('✅ 已加载保存的配置');
            return merged;
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
