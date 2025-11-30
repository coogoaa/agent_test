# 🔌 逆变器选型逻辑说明

## 问题背景

**用户疑问**: 
> 配置页面逆变器规格库不是未启用么？为什么计算过程展示的房屋27方案B显示"从规格库选择: 8kW Hybrid"？

## 问题分析

### 原始代码问题

在 `PlanGenerator.js` 的 `selectInverter` 方法中，**硬编码**了逆变器规格：

```javascript
// ❌ 问题代码
selectInverter(pvRatedKw, phaseType, planKey) {
    // ...
    
    // 硬编码的规格，完全没有使用配置！
    const catalog = phaseType === 'single' 
        ? [5, 6, 8, 10]
        : [5, 8, 10, 15, 20, 30];
    
    // ...
}
```

**问题**:
1. ❌ 没有检查 `config.inverters.enabled` 状态
2. ❌ 没有使用配置中的规格库数据
3. ❌ 始终使用硬编码的通用规格
4. ❌ 用户无法通过配置控制逆变器选型

### 配置结构

```javascript
config: {
    inverters: {
        enabled: false,  // 是否启用规格库
        singlePhase: [
            "Sungrow SH5.0RS", 5.0,
            "Sungrow SH6.0RS", 6.0,
            "Sungrow SH8.0RS", 8.0,
            "Sungrow SH10RT", 10.0
        ],
        threePhase: [
            "Sungrow SH10RT", 10.0,
            "Sungrow SH15T", 15.0,
            "Sungrow SH20T", 20.0,
            "Sungrow SH25T", 25.0,
            "Sungrow SH30T", 30.0
        ]
    }
}
```

数组格式: `[型号1, 容量1, 型号2, 容量2, ...]`

## 解决方案

### 修复后的逻辑

```javascript
selectInverter(pvRatedKw, phaseType, planKey) {
    const maxRatio = 2.0;
    const phaseMax = phaseType === 'single' ? 10 : 30;
    const requiredInv = Math.ceil(pvRatedKw / maxRatio);
    
    let catalog;
    let modelName = null;
    
    // ✅ 检查是否启用规格库
    if (this.config.inverters && this.config.inverters.enabled) {
        // ✅ 启用规格库：从配置中提取
        const specs = phaseType === 'single' 
            ? this.config.inverters.singlePhase 
            : this.config.inverters.threePhase;
        
        // 解析规格库数组 [name1, kw1, name2, kw2, ...]
        catalog = [];
        const models = {};
        for (let i = 0; i < specs.length; i += 2) {
            const name = specs[i];
            const kw = specs[i + 1];
            catalog.push(kw);
            models[kw] = name;
        }
        
        let selectedInv = catalog.find(kw => kw >= requiredInv) || phaseMax;
        modelName = models[selectedInv] || `${selectedInv}kW Hybrid`;
        
        return {
            selected_model: modelName,  // ✅ 使用真实型号
            inverter_kw: selectedInv,
            dcac_ratio: pvRatedKw / selectedInv,
            needsTrim: pvRatedKw > selectedInv * maxRatio,
            maxAllowedKw: selectedInv * maxRatio,
            notes: []
        };
    } else {
        // ✅ 未启用规格库：使用通用规格
        catalog = phaseType === 'single' 
            ? [5, 6, 8, 10]
            : [5, 8, 10, 15, 20, 30];
        
        let selectedInv = catalog.find(kw => kw >= requiredInv) || phaseMax;
        
        return {
            selected_model: `${selectedInv}kW Hybrid`,  // ✅ 通用型号
            inverter_kw: selectedInv,
            dcac_ratio: pvRatedKw / selectedInv,
            needsTrim: pvRatedKw > selectedInv * maxRatio,
            maxAllowedKw: selectedInv * maxRatio,
            notes: []
        };
    }
}
```

## 两种选型模式

### 模式1: 通用模式 (enabled: false)

**特点**:
- 使用简化的容量规格
- 型号格式: `{容量}kW Hybrid`
- 适用于快速计算和通用场景

**规格**:
- 单相: `[5, 6, 8, 10] kW`
- 三相: `[5, 8, 10, 15, 20, 30] kW`

**示例**:
```
PV额定: 13.20 kW
所需最小: 6.60 kW
选择: 8kW Hybrid  ← 通用型号
```

### 模式2: 规格库模式 (enabled: true)

**特点**:
- 使用配置中的真实产品规格
- 型号格式: 真实产品型号（如 `Sungrow SH8.0RS`）
- 适用于精确报价和产品推荐

**规格**:
- 单相: 从配置中读取（如 Sungrow SH5.0RS, SH6.0RS, SH8.0RS, SH10RT）
- 三相: 从配置中读取（如 Sungrow SH10RT, SH15T, SH20T, SH25T, SH30T）

**示例**:
```
PV额定: 13.20 kW
所需最小: 6.60 kW
选择: Sungrow SH8.0RS  ← 真实产品型号
```

## 界面展示增强

### 新增选型模式说明

在"步骤3: 逆变器选型"中，现在会显示：

#### 通用模式 (enabled: false)
```
⚙️ 选型模式:
📊 通用模式
使用简化的通用容量规格 (5, 8, 10, 15, 20, 30 kW)

💡 提示: 可在系统配置页面启用/禁用规格库
```

#### 规格库模式 (enabled: true)
```
⚙️ 选型模式:
✅ 规格库模式
使用配置页面中的逆变器产品规格库

💡 提示: 可在系统配置页面启用/禁用规格库
```

## 完整选型流程

```
步骤1: 检查配置
    ↓
config.inverters.enabled?
    ↓
┌─────────┴─────────┐
│                   │
NO                 YES
↓                   ↓
通用模式           规格库模式
↓                   ↓
使用硬编码规格     从配置读取规格
[5,6,8,10]         ["SH5.0RS",5.0,...]
[5,8,10,15,20,30]  ["SH10RT",10.0,...]
↓                   ↓
选择容量           选择容量+型号
↓                   ↓
返回通用型号       返回真实型号
"8kW Hybrid"       "Sungrow SH8.0RS"
```

## 房屋27方案B示例

### 当前配置 (enabled: false)

```
输入:
- PV额定: 13.20 kW
- 电网相位: 三相
- 配置: enabled = false

计算:
- 所需最小逆变器 = 13.20 / 2.0 = 6.60 kW
- 可选规格 = [5, 8, 10, 15, 20, 30] kW
- 选择 = 8 kW (第一个 >= 6.60 的)
- 型号 = "8kW Hybrid" (通用型号)
- DC/AC比 = 13.20 / 8 = 165.0% ✅

输出:
⚙️ 选型模式: 📊 通用模式
从通用规格选择: 8kW Hybrid
逆变器容量: 8 kW
DC/AC比: 165% ✅
```

### 如果启用规格库 (enabled: true)

```
输入:
- PV额定: 13.20 kW
- 电网相位: 三相
- 配置: enabled = true

计算:
- 所需最小逆变器 = 13.20 / 2.0 = 6.60 kW
- 可选规格 = [10, 15, 20, 25, 30] kW (从配置读取)
- 选择 = 10 kW (第一个 >= 6.60 的)
- 型号 = "Sungrow SH10RT" (真实型号)
- DC/AC比 = 13.20 / 10 = 132.0% ✅

输出:
⚙️ 选型模式: ✅ 规格库模式
从规格库选择: Sungrow SH10RT
逆变器容量: 10 kW
DC/AC比: 132% ✅
```

## 配置方法

### 方法1: 通过配置页面

1. 打开 `config-editor.html`
2. 找到"逆变器规格库"部分
3. 勾选"启用逆变器规格库"
4. 点击"保存配置"

### 方法2: 通过localStorage

```javascript
const config = {
    inverters: {
        enabled: true,  // 启用规格库
        singlePhase: [
            "Sungrow SH5.0RS", 5.0,
            "Sungrow SH6.0RS", 6.0,
            "Sungrow SH8.0RS", 8.0,
            "Sungrow SH10RT", 10.0
        ],
        threePhase: [
            "Sungrow SH10RT", 10.0,
            "Sungrow SH15T", 15.0,
            "Sungrow SH20T", 20.0,
            "Sungrow SH25T", 25.0,
            "Sungrow SH30T", 30.0
        ]
    },
    // ... 其他配置
};

localStorage.setItem('solarfit_config', JSON.stringify(config));
```

## 使用建议

### 使用通用模式的场景

- ✅ 快速计算和评估
- ✅ 不需要具体产品型号
- ✅ 通用性报告
- ✅ 初步方案设计

### 使用规格库模式的场景

- ✅ 精确报价
- ✅ 产品推荐
- ✅ 客户提案
- ✅ 订单生成
- ✅ 库存管理

## 代码变更总结

### 修改文件

1. ✅ `js/core/PlanGenerator.js`
   - 修改 `selectInverter` 方法
   - 添加配置检查逻辑
   - 支持两种选型模式

2. ✅ `equipment-recommender.html`
   - 添加选型模式展示
   - 显示当前使用的模式
   - 添加配置页面链接

### 新增功能

1. ✅ 动态选型模式切换
2. ✅ 规格库配置支持
3. ✅ 真实产品型号显示
4. ✅ 选型模式可视化

## 验证方法

### 测试用例1: 通用模式

```
配置: enabled = false
房屋: 27
方案: B
PV: 13.20 kW

预期结果:
- 选型模式: 📊 通用模式
- 型号: 8kW Hybrid
- 容量: 8 kW
- DC/AC: 165%
```

### 测试用例2: 规格库模式

```
配置: enabled = true
房屋: 27
方案: B
PV: 13.20 kW

预期结果:
- 选型模式: ✅ 规格库模式
- 型号: Sungrow SH10RT
- 容量: 10 kW
- DC/AC: 132%
```

## 总结

### 问题
- ❌ 逆变器选型硬编码，不使用配置
- ❌ 无法区分通用模式和规格库模式
- ❌ 用户不知道当前使用的是哪种模式

### 解决方案
- ✅ 检查 `config.inverters.enabled` 状态
- ✅ 根据配置动态选择规格
- ✅ 界面显示当前选型模式
- ✅ 支持真实产品型号

### 效果
- 🎯 配置生效，用户可控
- 🎯 选型逻辑清晰透明
- 🎯 支持两种使用场景
- 🎯 界面友好，易于理解

---

**版本**: v1.1.3  
**更新日期**: 2024-12-01  
**文档类型**: 技术说明
