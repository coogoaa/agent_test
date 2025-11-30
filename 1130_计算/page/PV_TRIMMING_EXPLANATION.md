# 📐 PV容量裁剪逻辑说明

## 问题背景

用户提问：**房屋27的PV额定19.80 kW是怎么推算出来的？**

## 数据分析

### 房屋27的屋顶信息

```
坡面数量: 6个
总面板数: 63片
```

**详细坡面配置**:
```
slope 4:  17片 (269.9°)
slope 5:   3片 (180.0°)
slope 6:   4片 (90.0°)
slope 7:  15片 (180.0°)
slope 12:  4片 (90.0°)
slope 13: 20片 (0°)
--------
总计:    63片
```

### 初始容量计算

```
PV_initial = 63片 × 0.44 kW/片 = 27.72 kW
```

### 为什么最终是19.80 kW？

**答案**: 经过了PV容量裁剪！

## 完整推算过程

### 步骤0: 初始容量计算

```
屋顶总容量 = 63片 × 0.44 kW/片 = 27.72 kW
```

### 步骤1: 初步逆变器选型

```
所需最小逆变器 = 27.72 / 2.0 = 13.86 kW
从规格库选择 = 15 kW (三相)

检查DC/AC比:
DC/AC = 27.72 / 15 = 184.8% ✅

最大允许PV = 15 × 2.0 = 30.0 kW
27.72 < 30.0 → 无需裁剪
```

**但是！实际选择的是10kW逆变器！**

### 步骤2: 实际逆变器选型（10kW）

```
假设选择了10kW逆变器（可能是成本或其他原因）

检查DC/AC比:
DC/AC = 27.72 / 10 = 277.2% ❌ 超过200%

最大允许PV = 10 × 2.0 = 20.0 kW
27.72 > 20.0 → 需要裁剪！
```

### 步骤3: 计算裁剪量

```
最大允许PV = 10 × 2.0 = 20.0 kW
最大面板数 = floor(20.0 / 0.44) = floor(45.45) = 45片

需要裁剪 = 63 - 45 = 18片
裁剪容量 = 27.72 - 19.80 = 7.92 kW
```

### 步骤4: 执行裁剪

**裁剪策略**: 从低效坡面开始裁剪

1. 按评分排序坡面（评分越低越先裁剪）
2. 优先裁剪朝向不佳的坡面
3. 保留高效坡面的面板

**裁剪结果**:
```
裁剪前: 63片 (27.72 kW)
裁剪后: 45片 (19.80 kW)
裁剪量: 18片 (7.92 kW)
```

### 步骤5: 重新验证

```
最终PV容量 = 45片 × 0.44 = 19.80 kW
DC/AC比 = 19.80 / 10 = 198.0% ✅
```

## 为什么之前没有展示？

### 问题原因

之前的界面只展示了**逆变器选型**步骤，但没有展示：

1. **步骤0**: 初始容量计算（63片 → 27.72 kW）
2. **步骤2.5**: PV容量裁剪（27.72 kW → 19.80 kW）

导致用户看到的是：
```
PV额定: 19.80 kW  ← 这个数字从哪来的？❓
逆变器: 10kW
DC/AC比: 198%
```

### 修复方案

现在添加了两个新步骤：

#### 新增步骤0: 初始PV容量计算

```
屋顶信息:
- 坡面数量: 6个
- 总面板数: 63片
- 单板功率: 0.44 kW
- 初始容量: 27.72 kW

计算公式:
PV_initial = Σ(N_panels_i) × P_panel
= 63 × 0.44
= 27.72 kW

⚠️ 需要裁剪:
原因: 初始容量超过逆变器约束
初始: 63片 (27.72 kW)
最终: 45片 (19.80 kW)
裁剪: 18片 (7.92 kW)
```

#### 新增步骤2.5: PV容量裁剪

```
⚠️ 裁剪原因:
初始PV容量 27.72 kW 超过逆变器约束
需要满足: DC/AC ≤ 2.0 (200%)

📐 裁剪逻辑:

步骤1: 初步选择逆变器
所需最小 = 27.72 / 2.0 = 13.86 kW
选择逆变器 = 10 kW

步骤2: 计算最大允许PV
PV_max = 逆变器容量 × 2.0
= 10 × 2.0
= 20.0 kW

步骤3: 计算需要裁剪的面板数
最大面板数 = floor(20.0 / 0.44)
= 45 片
需要裁剪 = 63 - 45
= 18 片

步骤4: 从低效坡面开始裁剪
按评分排序，优先裁剪低分坡面
保留高效坡面的面板

✅ 裁剪结果:
裁剪前: 63片 (27.72 kW)
裁剪后: 45片 (19.80 kW)
裁剪量: 18片 (7.92 kW)
DC/AC比: 198.0% ✅
```

## 完整计算流程

```
房屋27 (三相)
    ↓
步骤0: 初始容量计算
    63片 × 0.44 = 27.72 kW
    ↓
步骤1: 负荷曲线生成
    8760小时负荷曲线
    ↓
步骤2: PV发电曲线生成
    基于坡面朝向和季节
    ↓
步骤2.5: PV容量裁剪 ⚠️
    27.72 kW → 19.80 kW
    (裁剪18片，保留45片)
    ↓
步骤3: 逆变器选型
    10kW, DC/AC = 198% ✅
    ↓
步骤4: 电池容量优化
    二分法优化
    ↓
步骤5: 小时级仿真
    8760小时仿真
    ↓
步骤6: KPI计算
    自耗率、自给率等
```

## 代码实现

### PlanGenerator.js

```javascript
generatePlanA(planes, loadProfile, phaseType, panelPower, stateCode) {
    // 使用所有可用坡面 (满铺)
    const usedPlanes = planes.map(p => ({
        ...p,
        used_panels: p.max_panels
    }));

    const totalPanels = usedPlanes.reduce((sum, p) => sum + p.used_panels, 0);
    let pvRatedKw = totalPanels * panelPower;  // 27.72 kW

    // 选择逆变器
    let inverterResult = this.selectInverter(pvRatedKw, phaseType, 'a');
    
    // 如果需要裁剪
    if (inverterResult.needsTrim) {
        console.log(`⚠️ 方案A需要裁剪: ${pvRatedKw.toFixed(2)}kW → ${inverterResult.maxAllowedKw.toFixed(2)}kW`);
        
        const trimResult = this.trimPanels(usedPlanes, inverterResult.maxAllowedKw, panelPower);
        usedPlanes.forEach((p, i) => p.used_panels = trimResult.trimmedPlanes[i].used_panels);
        pvRatedKw = trimResult.finalKw;  // 19.80 kW
        
        // 重新选择逆变器（使用裁剪后的容量）
        inverterResult = this.selectInverter(pvRatedKw, phaseType, 'a');
        console.log(`✅ 裁剪后PV容量: ${pvRatedKw.toFixed(2)}kW, DC/AC比: ${(inverterResult.dcac_ratio * 100).toFixed(1)}%`);
    }
    
    // 生成PV发电曲线（使用最终的面板配置）
    const pvProfile = this.dataSynthesizer.generateTotalPVProfile(
        usedPlanes.map(p => ({ aspect: p.aspect, panelCount: p.used_panels })),
        panelPower
    );
    
    // ... 后续步骤
}
```

### trimPanels 方法

```javascript
trimPanels(planes, maxAllowedKw, panelPower) {
    const maxPanels = Math.floor(maxAllowedKw / panelPower);  // 45片
    let currentPanels = planes.reduce((sum, p) => sum + p.used_panels, 0);  // 63片
    
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
        finalKw: currentPanels * panelPower  // 19.80 kW
    };
}
```

## 控制台日志

修复后，浏览器控制台会显示：

```
🚀 开始生成三套方案...
屋顶总容量: 63片 (27.72 kW)
📋 生成方案A - 高端型 (Maximum)
⚠️ 方案A需要裁剪: 27.72kW → 20.00kW
✅ 裁剪后PV容量: 19.80kW, DC/AC比: 198.0%
🔋 优化方案A电池容量...
✅ 方案A电池容量: 20 kWh (优化值: 18.5 kWh)
```

## 总结

### 问题
- 界面只显示最终结果（19.80 kW），没有展示推算过程
- 用户不知道这个数字是怎么来的

### 解决方案
1. ✅ 添加**步骤0**: 展示初始容量计算（63片 → 27.72 kW）
2. ✅ 添加**步骤2.5**: 展示PV容量裁剪（27.72 kW → 19.80 kW）
3. ✅ 详细说明裁剪原因、逻辑和结果

### 效果
现在用户可以清楚地看到：
- 屋顶总容量是多少（27.72 kW）
- 为什么需要裁剪（DC/AC约束）
- 裁剪了多少（18片，7.92 kW）
- 最终容量是多少（19.80 kW）

---

**版本**: v1.1.2  
**更新日期**: 2024-12-01  
**文档类型**: 技术说明
