/**
 * 方案生成器 - 生成A/B/C三套差异化方案
 * 基于 1130_计算/docs/implementation_logic.md 和 cankao.md 实现
 */

class PlanGenerator {
    constructor(dataSynthesizer, simulator, config) {
        this.dataSynthesizer = dataSynthesizer;
        this.simulator = simulator;
        this.config = config;
    }

    /**
     * 生成所有三套方案
     * @param {Object} houseData - 房屋数据
     * @param {Object} userConfig - 用户配置
     * @returns {Object} - 包含三套方案的结果
     */
    generateAllPlans(houseData, userConfig) {
        const {
            planes,           // 坡面数组 [{aspect, max_panels, score}]
            stateCode,        // 州代码
            annualKwh,        // 年用电量
            phaseType,        // 电网相位
            panelPower = 0.44 // 单板功率 (kW)
        } = houseData;

        console.log('🚀 开始生成三套方案...');

        // 生成负荷曲线
        const loadProfile = this.dataSynthesizer.generateLoadProfile(annualKwh, stateCode);

        // 计算屋顶总容量
        const totalMaxPanels = planes.reduce((sum, p) => sum + p.max_panels, 0);
        const totalMaxKw = totalMaxPanels * panelPower;

        console.log(`屋顶总容量: ${totalMaxPanels}片 (${totalMaxKw.toFixed(2)} kW)`);

        // 生成三套方案
        const planA = this.generatePlanA(planes, loadProfile, phaseType, panelPower, stateCode);
        const planB = this.generatePlanB(planes, loadProfile, phaseType, panelPower, stateCode, totalMaxKw);
        const planC = this.generatePlanC(planes, loadProfile, phaseType, panelPower, stateCode);

        return {
            planA,
            planB,
            planC,
            metadata: {
                stateCode,
                annualKwh,
                phaseType,
                totalMaxPanels,
                totalMaxKw
            }
        };
    }

    /**
     * 方案A - Maximum (高端型)
     * 目标: 最大化能源独立性
     */
    generatePlanA(planes, loadProfile, phaseType, panelPower, stateCode) {
        console.log('📋 生成方案A - 高端型 (Maximum)');

        // 使用所有可用坡面 (满铺)
        const usedPlanes = planes.map(p => ({
            ...p,
            used_panels: p.max_panels
        }));

        const totalPanels = usedPlanes.reduce((sum, p) => sum + p.used_panels, 0);
        let pvRatedKw = totalPanels * panelPower;

        // 选择逆变器
        let inverterResult = this.selectInverter(pvRatedKw, phaseType, 'a');
        
        // 如果需要裁剪
        if (inverterResult.needsTrim) {
            console.log(`⚠️ 方案A需要裁剪: ${pvRatedKw.toFixed(2)}kW → ${inverterResult.maxAllowedKw.toFixed(2)}kW`);
            const trimResult = this.trimPanels(usedPlanes, inverterResult.maxAllowedKw, panelPower);
            usedPlanes.forEach((p, i) => p.used_panels = trimResult.trimmedPlanes[i].used_panels);
            pvRatedKw = trimResult.finalKw;
            
            // 重新选择逆变器（使用裁剪后的容量）
            inverterResult = this.selectInverter(pvRatedKw, phaseType, 'a');
            console.log(`✅ 裁剪后PV容量: ${pvRatedKw.toFixed(2)}kW, DC/AC比: ${(inverterResult.dcac_ratio * 100).toFixed(1)}%`);
        }
        
        // 生成PV发电曲线（使用最终的面板配置）
        const pvProfile = this.dataSynthesizer.generateTotalPVProfile(
            usedPlanes.map(p => ({ aspect: p.aspect, panelCount: p.used_panels })),
            panelPower
        );

        // 优化电池容量 (目标: 夜间覆盖≥90%, 自给率≥70%)
        const batteryKwh = this.optimizeBatteryCapacity(
            pvProfile,
            loadProfile,
            inverterResult.inverter_kw,
            { night_coverage: 0.9, autarky: 0.7 },
            'A'
        );

        // 最终仿真
        const simulation = this.runSimulation(
            pvProfile,
            loadProfile,
            batteryKwh,
            inverterResult.inverter_kw,
            phaseType
        );

        return {
            name: 'Plan A - Maximum',
            policy: 'max',
            panels: {
                total: usedPlanes.reduce((sum, p) => sum + p.used_panels, 0),
                per_slope: usedPlanes.map(p => ({ id: p.id, used_panels: p.used_panels, aspect: p.aspect }))
            },
            pv_rated_kw: pvRatedKw,
            inverter: inverterResult,
            battery: {
                nominal_kwh: batteryKwh,
                usable_kwh: batteryKwh * 0.9,
                dod: 0.9,
                p_charge_kw: Math.min(batteryKwh * 0.5, inverterResult.inverter_kw),
                p_discharge_kw: Math.min(batteryKwh * 0.5, inverterResult.inverter_kw)
            },
            simulation: simulation.summary,
            compliance: {
                dcac_ok: inverterResult.dcac_ratio <= 2.0,
                export_ok: simulation.summary.total_export_kwh < 50000,
                notes: inverterResult.notes || []
            }
        };
    }

    /**
     * 方案B - Balanced (平衡型)
     * 目标: 性价比最优
     */
    generatePlanB(planes, loadProfile, phaseType, panelPower, stateCode, totalMaxKw) {
        console.log('📋 生成方案B - 平衡型 (Balanced)');

        // 目标容量: 10-13kW (根据屋顶大小自适应)
        const targetKw = totalMaxKw > 15 ? 13.2 : 10.0;

        // 按评分排序，选择高效坡面
        const sortedPlanes = [...planes].sort((a, b) => b.score - a.score);
        const selectedPlanes = this.selectPlanesForTarget(sortedPlanes, targetKw, panelPower);

        const totalPanels = selectedPlanes.reduce((sum, p) => sum + p.used_panels, 0);
        const pvRatedKw = totalPanels * panelPower;

        // 生成PV发电曲线
        const pvProfile = this.dataSynthesizer.generateTotalPVProfile(
            selectedPlanes.map(p => ({ aspect: p.aspect, panelCount: p.used_panels })),
            panelPower
        );

        // 选择逆变器 (目标DC/AC在1.5-2.0)
        const inverterResult = this.selectInverter(pvRatedKw, phaseType, 'b');

        // 优化电池容量 (目标: 夜间覆盖≥80%, 自耗率≥40%)
        const batteryKwh = this.optimizeBatteryCapacity(
            pvProfile,
            loadProfile,
            inverterResult.inverter_kw,
            { night_coverage: 0.8, self_consumption: 0.4 },
            'B'
        );

        // 最终仿真
        const simulation = this.runSimulation(
            pvProfile,
            loadProfile,
            batteryKwh,
            inverterResult.inverter_kw,
            phaseType
        );

        return {
            name: 'Plan B - Balanced',
            policy: 'balanced',
            panels: {
                total: totalPanels,
                per_slope: selectedPlanes.map(p => ({ id: p.id, used_panels: p.used_panels, aspect: p.aspect }))
            },
            pv_rated_kw: pvRatedKw,
            inverter: inverterResult,
            battery: {
                nominal_kwh: batteryKwh,
                usable_kwh: batteryKwh * 0.9,
                dod: 0.9,
                p_charge_kw: Math.min(batteryKwh * 0.5, inverterResult.inverter_kw),
                p_discharge_kw: Math.min(batteryKwh * 0.5, inverterResult.inverter_kw)
            },
            simulation: simulation.summary,
            compliance: {
                dcac_ok: inverterResult.dcac_ratio <= 2.0,
                export_ok: true,
                notes: []
            }
        };
    }

    /**
     * 方案C - Economy (经济型)
     * 目标: 最小化初期投资
     */
    generatePlanC(planes, loadProfile, phaseType, panelPower, stateCode) {
        console.log('📋 生成方案C - 经济型 (Economy)');

        // 固定6.6kW配置
        const targetKw = 6.6;

        // 按评分选择坡面
        const sortedPlanes = [...planes].sort((a, b) => b.score - a.score);
        const selectedPlanes = this.selectPlanesForTarget(sortedPlanes, targetKw, panelPower);

        const totalPanels = selectedPlanes.reduce((sum, p) => sum + p.used_panels, 0);
        const pvRatedKw = totalPanels * panelPower;

        // 生成PV发电曲线
        const pvProfile = this.dataSynthesizer.generateTotalPVProfile(
            selectedPlanes.map(p => ({ aspect: p.aspect, panelCount: p.used_panels })),
            panelPower
        );

        // 选择逆变器 (单相5kW)
        const inverterResult = this.selectInverter(pvRatedKw, phaseType, 'c');

        // 基础电池配置 (目标: 夜间覆盖≥50%)
        const batteryKwh = this.optimizeBatteryCapacity(
            pvProfile,
            loadProfile,
            inverterResult.inverter_kw,
            { night_coverage: 0.5 },
            'C'
        );

        // 最终仿真
        const simulation = this.runSimulation(
            pvProfile,
            loadProfile,
            batteryKwh,
            inverterResult.inverter_kw,
            phaseType
        );

        return {
            name: 'Plan C - Economy',
            policy: 'economy',
            panels: {
                total: totalPanels,
                per_slope: selectedPlanes.map(p => ({ id: p.id, used_panels: p.used_panels, aspect: p.aspect }))
            },
            pv_rated_kw: pvRatedKw,
            inverter: inverterResult,
            battery: {
                nominal_kwh: batteryKwh,
                usable_kwh: batteryKwh * 0.9,
                dod: 0.9,
                p_charge_kw: Math.min(batteryKwh * 0.5, inverterResult.inverter_kw),
                p_discharge_kw: Math.min(batteryKwh * 0.5, inverterResult.inverter_kw)
            },
            simulation: simulation.summary,
            compliance: {
                dcac_ok: inverterResult.dcac_ratio <= 2.0,
                export_ok: true,
                notes: []
            }
        };
    }

    /**
     * 选择坡面以达到目标容量
     */
    selectPlanesForTarget(sortedPlanes, targetKw, panelPower) {
        const targetPanels = Math.ceil(targetKw / panelPower);
        let currentPanels = 0;
        const selected = [];

        for (const plane of sortedPlanes) {
            if (currentPanels >= targetPanels) break;
            
            const needed = targetPanels - currentPanels;
            const take = Math.min(plane.max_panels, needed);
            
            if (take > 0) {
                selected.push({
                    ...plane,
                    used_panels: take
                });
                currentPanels += take;
            }
        }

        return selected;
    }

    /**
     * 逆变器选型
     */
    selectInverter(pvRatedKw, phaseType, planKey) {
        const maxRatio = 2.0;
        const phaseMax = phaseType === 'single' ? 10 : 30;
        
        // 计算所需最小逆变器
        const requiredInv = Math.ceil(pvRatedKw / maxRatio);
        
        // 从配置中获取可选规格
        const catalog = phaseType === 'single' 
            ? [5, 6, 8, 10]
            : [5, 8, 10, 15, 20, 30];
        
        let selectedInv = catalog.find(kw => kw >= requiredInv) || phaseMax;
        
        // 检查是否需要裁剪
        const maxAllowedKw = selectedInv * maxRatio;
        const needsTrim = pvRatedKw > maxAllowedKw;
        
        const dcacRatio = pvRatedKw / selectedInv;
        
        return {
            selected_model: `${selectedInv}kW Hybrid`,
            inverter_kw: selectedInv,
            dcac_ratio: dcacRatio,
            needsTrim,
            maxAllowedKw,
            notes: needsTrim ? [`需要裁剪至${maxAllowedKw.toFixed(1)}kW`] : []
        };
    }

    /**
     * 裁剪面板
     */
    trimPanels(planes, maxAllowedKw, panelPower) {
        const maxPanels = Math.floor(maxAllowedKw / panelPower);
        let currentPanels = planes.reduce((sum, p) => sum + p.used_panels, 0);
        
        // 从低效坡面开始裁剪
        const sortedByScore = [...planes].sort((a, b) => a.score - b.score);
        
        for (const plane of sortedByScore) {
            if (currentPanels <= maxPanels) break;
            
            const toRemove = Math.min(plane.used_panels, currentPanels - maxPanels);
            plane.used_panels -= toRemove;
            currentPanels -= toRemove;
        }
        
        return {
            trimmedPlanes: planes,
            finalKw: currentPanels * panelPower
        };
    }

    /**
     * 优化电池容量 (二分法)
     */
    optimizeBatteryCapacity(pvProfile, loadProfile, inverterKw, targets, planType) {
        console.log(`🔋 优化方案${planType}电池容量...`);
        
        let minKwh = 0;
        let maxKwh = 50;
        let bestKwh = 5;
        
        const standards = [5, 6.5, 9.6, 10, 13.5, 16, 20, 30, 40, 50];
        
        // 二分搜索
        for (let iter = 0; iter < 10; iter++) {
            const midKwh = (minKwh + maxKwh) / 2;
            
            const simulation = this.runSimulation(pvProfile, loadProfile, midKwh, inverterKw, 'single');
            const kpis = simulation.summary;
            
            let meetsTarget = true;
            
            if (targets.night_coverage && kpis.night_coverage_rate < targets.night_coverage) {
                meetsTarget = false;
            }
            if (targets.autarky && kpis.autarky_rate < targets.autarky) {
                meetsTarget = false;
            }
            if (targets.self_consumption && kpis.self_consumption_rate < targets.self_consumption) {
                meetsTarget = false;
            }
            
            if (meetsTarget) {
                maxKwh = midKwh;
                bestKwh = midKwh;
            } else {
                minKwh = midKwh;
            }
            
            if (maxKwh - minKwh < 0.5) break;
        }
        
        // 标准化到常见规格
        const standardized = standards.find(s => s >= bestKwh) || standards[standards.length - 1];
        
        console.log(`✅ 方案${planType}电池容量: ${standardized} kWh (优化值: ${bestKwh.toFixed(1)} kWh)`);
        
        return standardized;
    }

    /**
     * 运行仿真
     */
    runSimulation(pvProfile, loadProfile, batteryKwh, inverterKw, phaseType) {
        const exportLimit = phaseType === 'single' ? 5 : 15;
        
        const inputs = {
            pv_generation: pvProfile,
            load_profile: loadProfile,
            battery: {
                usable_kwh: batteryKwh * 0.9,
                max_charge_kw: Math.min(batteryKwh * 0.5, inverterKw),
                max_discharge_kw: Math.min(batteryKwh * 0.5, inverterKw),
                rte: 0.9,
                initial_soc: 0.5
            },
            inverter: {
                max_ac_kw: inverterKw,
                export_limit_kw: exportLimit
            },
            policy: {
                charge_first: true
            }
        };
        
        return this.simulator.simulate(inputs);
    }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlanGenerator;
}
