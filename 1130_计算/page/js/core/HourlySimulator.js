/**
 * 小时级仿真器 - 执行8760小时能量平衡仿真
 * 基于 1130_计算/docs/implementation_logic.md 实现
 * 核心策略: PV溢出优先充电池，只有电池充满或功率受限后才并网导出
 */

class HourlySimulator {
    constructor(config = {}) {
        this.timeStep = config.timeStep || 1; // 小时
        this.days = config.days || 365;
    }

    /**
     * 执行小时级仿真
     * @param {Object} inputs - 仿真输入参数
     * @returns {Object} - 仿真结果
     */
    simulate(inputs) {
        const {
            pv_generation,      // Float32Array[8760] - PV发电曲线 (kW)
            load_profile,       // Float32Array[8760] - 负荷曲线 (kW)
            battery,           // 电池参数
            inverter,          // 逆变器参数
            policy = {}        // 策略参数
        } = inputs;

        const hours = pv_generation.length;
        
        // 初始化结果数组
        const results = {
            grid_import: new Float32Array(hours),
            grid_export: new Float32Array(hours),
            battery_charge: new Float32Array(hours),
            battery_discharge: new Float32Array(hours),
            battery_soc: new Float32Array(hours),
            clipped: new Float32Array(hours),
            pv_to_load: new Float32Array(hours),
            pv_to_battery: new Float32Array(hours),
            pv_to_grid: new Float32Array(hours)
        };

        // 电池参数
        const C_usable = battery.usable_kwh;
        const eta_chg = Math.sqrt(battery.rte);  // √0.9 ≈ 0.949
        const eta_dis = Math.sqrt(battery.rte);
        let SOC = battery.initial_soc || 0.5;    // 初始SOC 50%

        // 逆变器参数
        const inv_max_ac = inverter.max_ac_kw;
        const export_limit = inverter.export_limit_kw || inv_max_ac;

        // 执行逐小时仿真
        for (let h = 0; h < hours; h++) {
            const pv = pv_generation[h];
            const load = load_profile[h];

            if (pv >= load) {
                // ========== 白天场景: PV有盈余 ==========
                let surplus = pv - load;
                results.pv_to_load[h] = load;

                // 步骤1: 优先充电池
                const space_available = (1 - SOC) * C_usable;
                const charge_possible = Math.min(
                    surplus,
                    battery.max_charge_kw,
                    inv_max_ac,  // 逆变器充电功率限制
                    space_available / eta_chg
                );

                if (charge_possible > 0) {
                    const energy_stored = charge_possible * eta_chg;
                    SOC += energy_stored / C_usable;
                    SOC = Math.min(SOC, 1.0); // 限制在100%
                    results.battery_charge[h] = charge_possible;
                    results.pv_to_battery[h] = charge_possible;
                    surplus -= charge_possible;
                }

                // 步骤2: 剩余才并网
                const export_possible = Math.min(surplus, export_limit);
                results.grid_export[h] = export_possible;
                results.pv_to_grid[h] = export_possible;
                surplus -= export_possible;

                // 步骤3: 无法导出的部分被裁切
                if (surplus > 0.001) {
                    results.clipped[h] = surplus;
                }

            } else {
                // ========== 夜间场景: PV不足 ==========
                let deficit = load - pv;
                results.pv_to_load[h] = pv;

                // 步骤1: 电池放电
                const energy_available = SOC * C_usable;
                const discharge_possible = Math.min(
                    deficit,
                    battery.max_discharge_kw,
                    inv_max_ac,
                    energy_available * eta_dis
                );

                if (discharge_possible > 0) {
                    const energy_delivered = discharge_possible / eta_dis;
                    SOC -= energy_delivered / C_usable;
                    SOC = Math.max(SOC, 0.0); // 限制在0%
                    results.battery_discharge[h] = discharge_possible;
                    deficit -= discharge_possible;
                }

                // 步骤2: 剩余从电网进口
                results.grid_import[h] = deficit;
            }

            results.battery_soc[h] = SOC;
        }

        // 计算KPI
        const kpis = this.computeKPIs(results, pv_generation, load_profile, battery);

        return {
            summary: kpis,
            time_series: results
        };
    }

    /**
     * 计算关键性能指标 (KPIs)
     */
    computeKPIs(results, PV_t, Load_t, battery) {
        const total_pv = this.sum(PV_t);
        const total_load = this.sum(Load_t);
        const total_export = this.sum(results.grid_export);
        const total_import = this.sum(results.grid_import);
        const total_clipped = this.sum(results.clipped);
        const total_battery_charged = this.sum(results.battery_charge);
        const total_battery_discharged = this.sum(results.battery_discharge);

        // 自耗率: PV中被自己消耗的比例
        const self_consumed = total_pv - total_export - total_clipped;
        const self_consumption_rate = total_pv > 0 ? self_consumed / total_pv : 0;

        // 自给率: 负荷中由PV+电池满足的比例
        const autarky_rate = total_load > 0 ? 1 - (total_import / total_load) : 0;

        // 夜间覆盖率 (18:00-6:00)
        const night_hours = [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
        let night_load = 0;
        let night_battery = 0;

        for (let h = 0; h < results.battery_discharge.length; h++) {
            const hour_of_day = h % 24;
            if (night_hours.includes(hour_of_day)) {
                night_load += Load_t[h];
                night_battery += results.battery_discharge[h];
            }
        }

        const night_coverage_rate = night_load > 0 ? night_battery / night_load : 0;

        // 电池循环次数
        const avg_battery_cycles = battery.usable_kwh > 0 
            ? total_battery_discharged / battery.usable_kwh 
            : 0;

        // 溢出吸收率
        const total_surplus = this.sum(results.pv_to_battery) + this.sum(results.pv_to_grid) + total_clipped;
        const surplus_absorbed_rate = total_surplus > 0 
            ? this.sum(results.pv_to_battery) / total_surplus 
            : 0;

        return {
            total_pv_kwh: total_pv,
            total_load_kwh: total_load,
            total_import_kwh: total_import,
            total_export_kwh: total_export,
            total_self_consumed_kwh: self_consumed,
            total_battery_charged_kwh: total_battery_charged,
            total_battery_discharged_kwh: total_battery_discharged,
            total_clipped_kwh: total_clipped,
            self_consumption_rate: self_consumption_rate,
            autarky_rate: autarky_rate,
            night_coverage_rate: night_coverage_rate,
            surplus_absorbed_rate: surplus_absorbed_rate,
            avg_battery_cycles: avg_battery_cycles,
            clipping_rate: total_pv > 0 ? total_clipped / total_pv : 0
        };
    }

    /**
     * 数组求和辅助函数
     */
    sum(array) {
        let total = 0;
        for (let i = 0; i < array.length; i++) {
            total += array[i];
        }
        return total;
    }

    /**
     * 验证能量守恒
     */
    validateEnergyBalance(results, PV_t, Load_t) {
        const total_pv = this.sum(PV_t);
        const total_load = this.sum(Load_t);
        const total_export = this.sum(results.grid_export);
        const total_import = this.sum(results.grid_import);
        const total_clipped = this.sum(results.clipped);
        
        const battery_charged = this.sum(results.battery_charge);
        const battery_discharged = this.sum(results.battery_discharge);
        const battery_loss = battery_charged - battery_discharged;

        // 能量守恒: PV + Import = Load + Export + Clipped + Battery_Loss
        const balance = total_pv + total_import - total_load - total_export - total_clipped - battery_loss;

        if (Math.abs(balance) > 0.1) {
            console.warn('⚠️ 能量守恒违规:', balance.toFixed(2), 'kWh');
            return false;
        }

        console.log('✅ 能量守恒验证通过，误差:', balance.toFixed(4), 'kWh');
        return true;
    }

    /**
     * 获取典型日数据 (用于可视化)
     * @param {Object} results - 仿真结果
     * @param {number} dayIndex - 天数索引 (0-364)
     * @returns {Object} - 24小时数据
     */
    getTypicalDay(results, PV_t, Load_t, dayIndex = 180) {
        const startHour = dayIndex * 24;
        const endHour = startHour + 24;

        return {
            pv: Array.from(PV_t.slice(startHour, endHour)),
            load: Array.from(Load_t.slice(startHour, endHour)),
            battery_charge: Array.from(results.battery_charge.slice(startHour, endHour)),
            battery_discharge: Array.from(results.battery_discharge.slice(startHour, endHour)),
            battery_soc: Array.from(results.battery_soc.slice(startHour, endHour)),
            grid_import: Array.from(results.grid_import.slice(startHour, endHour)),
            grid_export: Array.from(results.grid_export.slice(startHour, endHour)),
            clipped: Array.from(results.clipped.slice(startHour, endHour))
        };
    }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HourlySimulator;
}
