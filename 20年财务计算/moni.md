下面我把代码里“自用率（self‑consumption）”的计算逻辑逐步拆解、结合关键代码行讲清楚，并给出一个完整的数值示例（含有电池 / 不含电池两种情形），最后指出代码中容易引起误差或看起来像 bug 的地方，并给出修正建议。

概览
- 自用率在本代码中主要在 calBaseData(...) 方法里计算（按月），公式大致是：
  月度自用率 = （发电被直接消耗的电量 + 电池最终能够提供的电量） / 月度发电量
- 这个月度自用率会被传入 calculate20YearDataFromDayBaseData(...)，用于估算 20 年内每月/每年的自用能量、上网量、购电量和经济指标。

一、代码中直接计算自用率的关键段（来自 calBaseData）
```java
// 日尺度的小时循环，统计：
BigDecimal usageGenDayPower = … // 每小时 min(gen, load) 累计（每天）
BigDecimal batteryDayPower = …  // 每小时 max(gen - load,0) 累计（每天）
BigDecimal genDayPower = …      // 每小时 gen 累计（每天）
BigDecimal useDayPower = …      // 每小时 load 累计（每天）

// 月尺度
BigDecimal monthGenPower = genDayPower.multiply(daysInMonth);                      // mP
BigDecimal usageGenMonthPower = usageGenDayPower.multiply(daysInMonth);           // 当月直接被发电覆盖的用电量
BigDecimal useMonthPowerNoSolar = useDayPower.multiply(daysInMonth).subtract(usageGenMonthPower); // 当月非发电时段或未被发电覆盖的用电量

// “最终能被电池用于覆盖的电量”：
BigDecimal batteryFinalMonthPower =
    min(
      new BigDecimal(daysInMonth).multiply(batteryDayPower),  // 当月可用于充电的剩余发电量（小时 surplus 累计 * 天）
      batteryCapacity.multiply(new BigDecimal(daysInMonth)),  // 代码中采用：电池容量 * 天数（即假设每日可放电 batteryCapacity）
      useMonthPowerNoSolar                                    // 需要被电池覆盖的非发电来源耗电量
    );

// 月度自用率（保留 4 位小数）
BigDecimal monthSelfConsumption =
    usageGenMonthPower.add(batteryFinalMonthPower).divide(monthGenPower, 4, RoundingMode.HALF_UP);
```

解释（逐项）
- usageGenMonthPower：发电时刻即时消费的电量（小时粒度取 min(gen, load) 后乘以天数）。
- batteryDayPower × daysInMonth：当月理论上可用于充电的总剩余发电量（小时粒度 surplus 累计乘以天数）。
- batteryCapacity × daysInMonth：代码把电池可用容量按“每天可循环使用一次”来累计（因此乘以天数），代表当月电池能提供的最大放电量（若你只允许每日最大放电为 batteryCapacity）。
- useMonthPowerNoSolar：当月不被发电即时覆盖的用电量（总负荷 - 发电时即时被覆盖的部分）。
- batteryFinalMonthPower = 三者取最小，代表在当前月电池实际能为非发电时段负荷提供的电量（受可充电量、电池容量和需求三方面限制）。
- 月度自用率 = （直接被 PV 消耗 + 电池放电覆盖的部分） / 月度发电量。

二、数值示例（基于一个月；方便演示假设：每天相同的小时序列，30 天）
设定（示例）
- 每日发电（kWh/小时，24h）：[0,0,0,0,0,0,1,2,3,4,5,6,5,4,3,2,1,0,0,0,0,0,0,0]
  — 每日发电总和 genDayPower = 36 kWh/day
- 每日负荷（kWh/小时）：假设恒定 1 kWh/小时 => useDayPower = 24 kWh/day
- batteryCapacity（可用电池容量）= 5 kWh（可日循环一次）
- daysInMonth = 30

先计算日尺度（逐项）
- usageGenDayPower = sum_hour min(genHour, loadHour)
  对应小时 min(...) 为： [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,...]，共 11 kWh/day
- batteryDayPower = sum_hour max(genHour - loadHour, 0)
  对应 surplus 为： [0,0,0,0,0,0,0,1,2,3,4,5,4,3,2,1,0,...]，总和 25 kWh/day

月尺度
- monthGenPower = 36 * 30 = 1080 kWh
- usageGenMonthPower = 11 * 30 = 330 kWh
- totalDemand = useDayPower * 30 = 24 * 30 = 720 kWh
- useMonthPowerNoSolar = totalDemand - usageGenMonthPower = 720 - 330 = 390 kWh
- battery 可充电的月剩余发电量 = batteryDayPower * 30 = 25 * 30 = 750 kWh
- batteryCapacity * days = 5 * 30 = 150 kWh
- batteryFinalMonthPower = min(750, 150, 390) = 150 kWh

月度自用率
- monthSelfConsumption = (usageGenMonthPower + batteryFinalMonthPower) / monthGenPower
  = (330 + 150) / 1080 = 480 / 1080 ≈ 0.444444...，按代码保留4位 => 0.4444（44.44%）

三、自用率在 20 年计算中的用法（关键片段）
在 calculate20YearDataFromDayBaseData(...) 中，传入的是上面计算得到的 selfConsumptions（12 个值）。在每年每月循环中，它做了：

```java
BigDecimal ymP = monthBaseData.get("mP")
BigDecimal selfConsumption = selfConsumptions.get(month-1);
BigDecimal ymU;
if (isHasBattery) {
    ymU = min(ymP.multiply(selfConsumption), monthBaseData.get("mE"));
} else {
    ymU = ymP.multiply(selfConsumption);
}
// ymS = ymP - ymU  (上网量)
// ymD = max(monthBaseData.get("mE").subtract(ymU), 0)  (购电量)
```

含义（按代码实现）
- ymU：当年当月“来自发电的自用量”的估计（代码对有电池/无电池做了不同处理）。
- ymS：当年当月上网（售电/出口）量 = 月发电 - ymU
- ymD：当年当月购电量（计算中用到的是 baseData.get("mE") - ymU）

基于上面的数值示例（第 1 年，不计衰减）：
- ymP = 1080 kWh
- selfConsumption = 0.4444

情况 A：有电池（isHasBattery = true）
- 代码中 ymU = min(1080 * 0.4444 = 480, monthBaseData.get("mE") )
  注意：在 calBaseData 中 baseData.put("mE", usageGenMonthPower) = 330 （代码里 mE 不是总需求，而是“发电被即时消耗的量”）
  -> ymU = min(480, 330) = 330 kWh （也就是“即时消耗量”）
- ymS = 1080 - 330 = 750 kWh（代码把这当成上网量）
- ymD = max(330 - 330, 0) = 0 kWh（作为购电量）

情况 B：无电池（isHasBattery = false）
- ymU = 1080 * 0.4444 = 480 kWh
- ymS = 1080 - 480 = 600 kWh
- ymD = max(330 - 480, 0) = 0 kWh

注意：你会发现
- calBaseData 的 monthSelfConsumption 是把“电池放电覆盖量”包含在内的（480 = 330 + 150），但 calculate20YearDataFromDayBaseData 在有电池时又把 ymU 限制为 330（即时消耗），从而使得 ymS（上网量）变得比“实际应上网量”更大（示例中 750 kWh），这与直观的能流并不一致（实际上应：1080 - 330 - 150 = 600 kWh 上网）。这会影响馈网收入、购电量与电费节省的计算。

四、代码中容易引起误差 / 可能的 bug（与改进建议）
1) baseData.put("mE") 的含义不清 / 可能错误  
   - 在 calBaseData 中，baseData.put("mE", usageGenMonthPower)。注释写的是“月度用电量”，但实际放进去的是“发电时即时被覆盖的用电量（usageGenMonthPower）”，不是总需求 totalDemand（= useDayPower * days）。
   - 后续 calculate20Year... 中将 mE 用于计算“安装前每月电费”（mA = mE * price + fixedCharge），显然应该使用总用电量而不是发电时即时覆盖量。若不修正，会导致安装前电费被低估，进而影响回收期、IRR 等结果。

2) 在 20 年计算里对电池的计入不一致  
   - calBaseData 已经把 batteryFinalMonthPower 包进了 selfConsumptions，但 calculate20Year... 在 isHasBattery==true 时把 ymU 限制到即时被发电覆盖的量（mE），没有把 batteryFinalMonthPower 单独计入年度的购电减少或上网减少，导致上网量、购电量、馈网收入计算不一致（示例中导致上网更高反而带来看起来更高收益，但实际不合理）。

3) batteryCapacity × daysInMonth 的含义要确认  
   - 代码把 batteryCapacity 乘以天数，等于“假设电池每天都能放电 batteryCapacity kWh（即每天一次满循环）”，这对周期数的假设需要确认——若电池设计每两天循环一次或允许多次循环，应改为 batteryCapacity × 预计循环次数（或使用可放电吞吐量参数）。

五、建议修正（思路 & 示范）
我建议把 calBaseData 的输出从只给 mP/mE/days 这种有限字段，改成把“总需求、即时被 PV 覆盖量、月度电池放电量、月度发电量”等关键值都保存下来；在 20 年计算里用这些明确的能流量来计算，而不是以“比例（selfConsumption）”混合电池影响再做截断。示例伪代码：

calBaseData 保存（每月）：
- mP = monthGenPower
- totalDemand = useDayPower * days
- directUse = usageGenMonthPower
- batteryDischarge = batteryFinalMonthPower

然后在 20 年计算中每月直接使用：
- ymP = mP * degradation^(year-1)
- if (isHasBattery) {
    ymDirectUse = directUse * degradationFactor?  // directUse 与发电同减？视业务
    ymBatteryDischarge = batteryDischarge (或按比例衰减)
    ymExport = max(ymP - ymDirectUse - ymBatteryDischarge, 0)
    ymGridImport = max(totalDemand - ymDirectUse - ymBatteryDischarge, 0)
  } else {
    ymDirectUse = ymP * selfConsumption  // 或用 directUse / mP 比例
    ymExport = ymP - ymDirectUse
    ymGridImport = max(totalDemand - ymDirectUse, 0)
  }

这样能保证能量守恒： ymDirectUse + ymBatteryDischarge + ymExport = ymP
并且 totalDemand = ymDirectUse + ymBatteryDischarge + ymGridImport

六、用修正逻辑给出的示例（同上数值，货币示例）
假设：
- 电价 electricityPrice = $0.30/kWh
- 上网电价 feedInTariff = $0.05/kWh
- 固定费 fixedChargeDayIncTax = $0.5/day => 月固定费 30*0.5 = $15

修正后（月）：
- totalDemand = 720 kWh
- directUse = 330 kWh
- batteryDischarge = 150 kWh
- export = 1080 - 330 - 150 = 600 kWh
- gridImport = totalDemand - directUse - batteryDischarge = 720 - 330 - 150 = 240 kWh
计算电费/收益：
- 安装前（正确）月电费 = totalDemand * 0.30 + 15 = 720*0.30 + 15 = $231
- 安装后购电费用 ymC = gridImport * 0.30 + 15 = 240*0.30 + 15 = $87
- 馈网收入 ymG = export * 0.05 = 600 * 0.05 = $30
- 安装后净电费 = 87 - 30 = $57
- 月节省 = 231 - 57 = $174

如果按代码当前（未修正）逻辑，则“安装前电费被算成 330*0.30 + 15 = $114”，且对上网和购电的计算会出现不一致（见前面示例），导致 IRR/回收期等严重偏差。

七、结论与我可以帮你的事情
- 总结：calBaseData 里关于“自用率”的计算本身（usageGen + batteryFinal）是合理的表达式，但后续 calculate20Year... 里对 mE 的使用和有电池/无电池时对 ymU 的处理存在不一致（很可能是 bug），会导致能量不守恒和经济量计算出错。
- 我可以帮你：
  1. 按上面建议把 calBaseData 输出字段改为更明确的能流量字段（并给出具体改动 patch）。
  2. 把 calculate20Year... 用更严格的能量守恒公式重写（示例代码）。
  3. 用你真实的小时序列与参数跑一次完整的 1 个月 / 1 年 / 20 年示例并输出关键中间量（发电、直接用电、电池充放电、上网、购电、账单、回收期、IRR）。

你想先看（A）我给出具体的代码修改补丁，还是（B）我用你的一组真实小时序列和费率帮你跑一次完整的数值演示？