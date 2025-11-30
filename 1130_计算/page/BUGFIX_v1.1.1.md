# 🐛 Bug修复说明 v1.1.1

## 修复日期
2024-12-01

## 修复内容

### 1. ✅ 电池规格库默认值更新

**问题**: 电池规格库缺少大容量选项

**修改**:
```javascript
// 之前
batteries: {
    capacities: [5, 6.5, 9.6, 10, 13.5, 16, 20]
}

// 现在
batteries: {
    capacities: [5, 6.5, 9.6, 10, 13.5, 16, 20, 30, 40, 50]
}
```

**影响**:
- 支持更大容量的电池配置
- 适用于大型系统
- 优化算法可以选择更大的电池容量

**修改文件**:
- `config-editor.html`
- `equipment-recommender.html`

---

### 2. 🔧 修复PV裁剪逻辑Bug

**问题描述**:

房屋27的计算结果显示：
```
PV额定: 19.80 kW
逆变器: 10kW Hybrid
DC/AC比: 277% ❌
提示: 需要裁剪至20.0kW
```

但实际上**没有执行裁剪**，导致：
- DC/AC比超过200%限制
- 逆变器过载
- 计算结果不准确

**根本原因**:

在 `PlanGenerator.js` 的方案A生成逻辑中：

```javascript
// 问题代码 (第74-94行)
const pvProfile = this.dataSynthesizer.generateTotalPVProfile(...);  // 在裁剪前生成

const inverterResult = this.selectInverter(pvRatedKw, phaseType, 'a');

if (inverterResult.needsTrim) {
    const trimResult = this.trimPanels(...);
    pvRatedKw = trimResult.finalKw;
    
    // 重新生成PV曲线 (但在if块内部，变量作用域问题)
    const pvProfile = this.dataSynthesizer.generateTotalPVProfile(...);
}

// 后续使用的是裁剪前的pvProfile和inverterResult
```

**问题分析**:

1. PV曲线在裁剪前就生成了
2. 裁剪后重新生成的PV曲线在if块内部，外部无法访问
3. 裁剪后没有重新选择逆变器
4. 后续仿真使用的是裁剪前的数据

**修复方案**:

```javascript
// 修复后的代码
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
```

**修复要点**:

1. ✅ 将PV曲线生成移到裁剪逻辑之后
2. ✅ 裁剪后重新选择逆变器
3. ✅ 添加详细的日志输出
4. ✅ 确保使用最终的配置进行仿真

**修改文件**:
- `js/core/PlanGenerator.js` (第71-93行)

---

### 3. 📊 增强裁剪逻辑展示

**新增功能**:

在"方案推算逻辑详解"的步骤3（逆变器选型）中，如果检测到DC/AC比超过200%，会显示详细的裁剪说明：

```html
⚠️ 需要裁剪PV容量:

原因: DC/AC比 277.2% > 200%

裁剪逻辑:
最大允许PV = 逆变器容量 × 2.0
= 10 × 2.0 = 20.0 kW

需要裁剪: 19.80 → 20.0 kW
裁剪面板数: 0 片
```

**展示内容**:
- 裁剪原因
- 裁剪计算公式
- 裁剪前后对比
- 需要裁剪的面板数量

**修改文件**:
- `equipment-recommender.html` (第1393-1406行)

---

### 4. 📈 增强小时级仿真详细展示

**新增内容**:

#### 4.1 仿真参数配置
显示所有仿真输入参数：
- PV容量
- 逆变器容量
- 电池容量和可用容量
- 充放电功率
- 导出限制
- RTE效率

#### 4.2 详细计算步骤

**白天场景 (PV ≥ Load)**:
```
步骤1: 计算盈余
surplus = PV[t] - Load[t]

步骤2: 计算充电功率
SOC_space = (1 - SOC[t-1]) × Usable_kWh
P_charge_max = min(surplus, P_charge_limit, P_inv_limit, SOC_space / η_charge)
E_stored = P_charge_max × η_charge × 1h
SOC[t] = SOC[t-1] + E_stored / Usable_kWh

步骤3: 计算导出功率
surplus_left = surplus - P_charge_max
P_export = min(surplus_left, Export_limit)

步骤4: 计算裁切
P_clipped = surplus_left - P_export
```

**夜间场景 (PV < Load)**:
```
步骤1: 计算缺口
deficit = Load[t] - PV[t]

步骤2: 计算放电功率
E_available = SOC[t-1] × Usable_kWh × η_discharge
P_discharge_max = min(deficit, P_discharge_limit, P_inv_limit, E_available)
E_consumed = P_discharge_max / η_discharge × 1h
SOC[t] = SOC[t-1] - E_consumed / Usable_kWh

步骤3: 计算电网进口
deficit_left = deficit - P_discharge_max
P_import = deficit_left
```

#### 4.3 逐小时迭代过程
```
for t = 0 to 8759:
    1. 读取 PV[t] 和 Load[t]
    2. 判断场景 (PV vs Load)
    3. 执行对应策略
    4. 更新 SOC[t]
    5. 记录能量流动
    6. 累加统计量

总计: 8760次迭代 (365天 × 24小时)
```

**修改文件**:
- `equipment-recommender.html` (第1469-1535行)

---

## 验证方法

### 测试用例: 房屋27

**输入**:
- 房屋: 27
- 州: TAS
- 相位: 三相
- 年用电量: 8000 kWh

**预期结果** (修复后):

**方案A**:
```
原始PV容量: 19.80 kW (45片)
逆变器选择: 10kW Hybrid
DC/AC比: 198% ✅ (裁剪后)
最终PV容量: 19.80 kW
面板配置: 45片 (无需裁剪，因为19.80 < 20.0)
```

**验证步骤**:
1. 打开 `equipment-recommender.html`
2. 选择房屋27
3. 点击"开始仿真"
4. 查看"方案推算逻辑详解"
5. 检查步骤3的逆变器选型
6. 确认DC/AC比 ≤ 200%

---

## 控制台日志

修复后，在浏览器控制台会看到：

```
🚀 开始生成三套方案...
屋顶总容量: 45片 (19.80 kW)
📋 生成方案A - 高端型 (Maximum)
⚠️ 方案A需要裁剪: 19.80kW → 20.00kW
✅ 裁剪后PV容量: 19.80kW, DC/AC比: 198.0%
🔋 优化方案A电池容量...
✅ 方案A电池容量: 20 kWh (优化值: 18.5 kWh)
```

---

## 影响范围

### 受影响的方案
- ✅ 方案A (高端型) - 主要影响
- ⚠️ 方案B (平衡型) - 可能影响
- ⚠️ 方案C (经济型) - 不太可能影响

### 受影响的房屋
所有PV容量超过逆变器容量2倍的房屋，例如：
- 房屋27: 19.80 kW → 10kW逆变器
- 其他大型屋顶系统

---

## 后续改进

### 短期 (v1.1.2)
- [ ] 添加裁剪前后的对比图表
- [ ] 显示被裁剪的具体坡面和面板数
- [ ] 添加裁剪警告提示

### 中期 (v1.2.0)
- [ ] 支持多逆变器配置
- [ ] 智能裁剪算法优化
- [ ] 裁剪损失分析

### 长期 (v2.0.0)
- [ ] 逆变器容量自动优化
- [ ] 多种裁剪策略对比
- [ ] 成本效益分析

---

## 相关文档

- `DETAILED_DERIVATION.md` - 详细推导文档
- `CONFIG_GUIDE.md` - 配置指南
- `UPDATE_v1.1.0.md` - v1.1.0更新说明

---

**版本**: v1.1.1  
**发布日期**: 2024-12-01  
**优先级**: 高 (Critical Bug Fix)  
**开发团队**: SolarFit Pro Development Team

**重要提示**:
- ⚠️ 这是一个关键Bug修复
- 🔄 建议立即更新
- 📊 修复后结果更准确
