# 1130版本 - 小时级仿真光伏系统

## 📋 概述

本系统是基于 `1130_计算/docs` 文档规划实现的**小时级仿真版光伏设备推荐系统**，核心特点：

- ✅ **8760小时动态仿真** - 从经验系数估算升级为逐小时能量平衡计算
- ✅ **PV溢出优先充电策略** - 光伏溢出优先充电池，充满后才并网导出
- ✅ **精确KPI计算** - 自耗率、自给率、夜间覆盖率、溢出吸收率、裁切量
- ✅ **三套差异化方案** - Plan A (Maximum)、Plan B (Balanced)、Plan C (Economy)
- ✅ **可视化展示** - 典型日能量流向图、方案KPI对比图

## 🏗️ 系统架构

```
1130_计算/page/
├── equipment-recommender.html    # 主页面
├── js/
│   └── core/                     # 核心算法模块
│       ├── DataSynthesizer.js    # 数据合成器
│       ├── HourlySimulator.js    # 小时级仿真器
│       └── PlanGenerator.js      # 方案生成器
├── docs/                         # 文档目录
│   ├── planning.md              # 系统规划文档
│   ├── implementation_logic.md  # 实施逻辑详解
│   └── api_interface.md         # API接口定义
└── README.md                     # 本文件
```

## 🚀 快速开始

### 1. 打开系统

直接在浏览器中打开 `equipment-recommender.html` 文件即可使用。

### 2. 使用流程

1. **选择房屋** - 从下拉列表选择GIS房屋样本
2. **配置参数** - 选择州、电网相位
3. **开始仿真** - 点击"开始仿真计算"按钮
4. **查看结果** - 系统将自动生成三套方案并展示仿真结果

### 3. 查看详细信息

- 点击"查看该房屋屋顶坡面详细数据"可展开屋顶详情
- 在结果区域可查看每个方案的详细配置和KPI
- 切换"典型日能量流向"和"方案KPI对比"Tab查看可视化图表

## 📊 核心模块说明

### DataSynthesizer (数据合成器)

**功能**: 生成8760小时负荷曲线和光伏发电曲线

**主要方法**:
- `generateLoadProfile(annualKwh, stateCode)` - 生成负荷曲线
- `generatePVProfileForPlane(aspect, panelCount, panelPower)` - 生成单坡面PV曲线
- `generateTotalPVProfile(planes, panelPower)` - 生成总PV曲线
- `calculatePlaneScore(aspect, tilt, shadeFactor, latitude)` - 计算坡面评分

**数据源**:
- 各州月度用电比例 (12个月)
- 各州小时用电比例 (24小时)
- 光伏发电模板 (按方位角分组)

### HourlySimulator (小时级仿真器)

**功能**: 执行8760小时能量平衡仿真

**核心策略**:
```
白天 (PV >= Load):
  1. PV优先供负荷
  2. 溢出优先充电池 (受充电功率、SOC上限限制)
  3. 剩余才并网导出 (受导出限制)
  4. 无法导出的部分被裁切

夜间 (PV < Load):
  1. PV供负荷
  2. 电池放电补充 (受放电功率、SOC下限限制)
  3. 剩余从电网进口
```

**输出KPI**:
- 自耗率 (Self-consumption Rate)
- 自给率 (Autarky Rate)
- 夜间覆盖率 (Night Coverage Rate)
- 溢出吸收率 (Surplus Absorbed Rate)
- 裁切率 (Clipping Rate)
- 电池循环次数 (Battery Cycles)

### PlanGenerator (方案生成器)

**功能**: 生成A/B/C三套差异化方案

#### Plan A - Maximum (高端型)
- **目标**: 最大化能源独立性
- **PV**: 使用所有可用坡面 (满铺)
- **Inverter**: 选择能满足 DC/AC ≤ 2.0 的最大规格
- **Battery**: 二分查找最小容量满足:
  - 夜间覆盖 ≥ 90%
  - 自给率 ≥ 70%

#### Plan B - Balanced (平衡型)
- **目标**: 性价比最优
- **PV**: 根据坡面评分选择高效组合，目标 10-13kW
- **Inverter**: 选择常用档位 (5/8/10kW)，DC/AC 在 1.5-2.0
- **Battery**: 优化容量满足:
  - 夜间覆盖 ≥ 80%
  - 自耗率 ≥ 40%

#### Plan C - Economy (经济型)
- **目标**: 最小化初期投资
- **PV**: 固定 6.6kW (澳洲常见入门配置)
- **Inverter**: 单相 5kW
- **Battery**: 基础配置，目标:
  - 夜间覆盖 ≥ 50%

## 🔧 技术实现细节

### 1. 负荷曲线生成

```javascript
// 算法步骤
1. 读取该州的月度分配系数 monthly_weights[12]
2. 读取该州的小时分配系数 hourly_weights[24]
3. 计算每月的天数 days_in_month[12]
4. 对每个月 m (0-11):
   - 该月总用电量 = annualKwh * monthly_weights[m]
   - 该月日均用电量 = 该月总用电量 / days_in_month[m]
   对该月的每一天 d:
     对每小时 h (0-23):
       index = (累计天数 + d) * 24 + h
       Load_t[index] = 该月日均用电量 * hourly_weights[h]
```

### 2. PV发电曲线生成

```javascript
// 插值查表法
1. 预处理发电样例数据，构建查找表 LUT[aspect][month][hour]
2. 对每个坡面:
   a. 根据 aspect 在 LUT 中查找最近的两个方位角
   b. 线性插值获取该坡面的发电模板
   c. 扩展到 8760 小时，应用季节性调整因子
```

### 3. 电池容量优化 (二分法)

```javascript
function optimizeBatteryCapacity(targets) {
    let minKwh = 0;
    let maxKwh = 50;
    
    while (maxKwh - minKwh > 0.5) {
        const midKwh = (minKwh + maxKwh) / 2;
        const result = simulate(pvProfile, loadProfile, midKwh, ...);
        
        if (meetsTarget(result, targets)) {
            maxKwh = midKwh;
            bestKwh = midKwh;
        } else {
            minKwh = midKwh;
        }
    }
    
    // 标准化到常见规格
    return standardize(bestKwh);
}
```

## 📈 与1127版本的对比

| 特性 | 1127版本 | 1130版本 |
|------|---------|---------|
| 计算方法 | 经验系数估算 | 8760小时仿真 |
| 电池容量 | 简单公式计算 | 二分法优化 |
| 充电策略 | 未明确 | PV溢出优先充电 |
| KPI指标 | 基础指标 | 精确KPI (自耗率、自给率等) |
| 裁切处理 | 未考虑 | 精确计算裁切量 |
| 能量守恒 | 未验证 | 自动验证 |
| 计算时间 | 即时 | 3-5秒 |

## 🎯 未来优化方向

### 短期优化
1. **Web Worker并行计算** - 将仿真放入后台线程，避免阻塞UI
2. **完整PV模型** - 接入PVGIS API或使用更精确的辐射模型
3. **成本计算集成** - 添加成本、补贴、ROI计算
4. **批量处理支持** - 支持批量房屋仿真

### 中期优化
1. **储能扩容模式** - 支持已有系统的扩容计算
2. **典型日数据展示** - 从仿真结果中提取真实的典型日数据
3. **月度/季度分析** - 提供更细粒度的时间维度分析
4. **导出功能** - 支持导出详细报告 (PDF/Excel)

### 长期优化
1. **实时电价优化** - 基于TOU电价优化充放电策略
2. **天气预测集成** - 结合天气预报优化电池调度
3. **多场景仿真** - 支持不同天气、负荷场景的对比分析
4. **机器学习优化** - 使用ML优化电池容量和充放电策略

## 📝 开发日志

### v1.0.0 (2024-12-01)
- ✅ 实现DataSynthesizer数据合成器
- ✅ 实现HourlySimulator小时级仿真器
- ✅ 实现PlanGenerator方案生成器
- ✅ 创建主页面equipment-recommender.html
- ✅ 实现三套方案生成逻辑
- ✅ 添加可视化图表展示

## 🤝 参考文档

- `1130_计算/docs/planning.md` - 系统规划文档
- `1130_计算/docs/implementation_logic.md` - 实施逻辑详解
- `1130_计算/docs/api_interface.md` - API接口定义
- `1130_计算/ cankao.md` - 完整推导逻辑参考

## 📧 联系方式

如有问题或建议，请联系开发团队。

---

**版本**: v1.0.0  
**更新日期**: 2024-12-01  
**开发团队**: SolarFit Pro
