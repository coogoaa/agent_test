# 🎉 v1.1.0 更新说明

## 更新日期
2024-12-01

## 主要更新

### 1. ⚙️ 新增系统配置页面

创建了全新的配置管理页面 `config-editor.html`，允许用户自定义系统参数。

#### 访问方式
- 顶部导航栏新增 "⚙️ 系统配置" 链接
- 位于 "新建系统" 左侧，"批量处理" 右侧
- 直接访问: `config-editor.html`

#### 配置项分类

**🔧 仿真参数配置**
- 电池参数: RTE、DOD、充放电倍率
- 电网参数: 导出/进口限制
- 光伏参数: 单板功率、季节性调整
- 优化参数: 二分法阈值、最大迭代次数

**🎯 方案优化目标**
- 方案A (高端型): 夜间覆盖率、自给率
- 方案B (平衡型): 夜间覆盖率、自耗率
- 方案C (经济型): 夜间覆盖率

**⚡ 逆变器规格库**
- 支持单相/三相逆变器配置
- 可自定义型号和容量
- 支持启用/关闭开关

**🔋 电池规格库**
- 标准电池容量配置
- 支持自定义容量选项

### 2. 🔒 逆变器规格库默认关闭

#### 变更说明
- **之前**: 逆变器规格库默认启用
- **现在**: 逆变器规格库默认关闭 ❌

#### 影响
- **关闭状态** (默认):
  - 使用简化的逆变器选型逻辑
  - 不依赖具体型号
  - 计算速度更快
  - 适合快速原型设计

- **开启状态**:
  - 从规格库选择实际型号
  - 更符合实际情况
  - 可用于精确报价

#### 如何开启
1. 进入 "⚙️ 系统配置" 页面
2. 找到 "逆变器规格库" 区域
3. 打开 "启用规格库" 开关
4. 点击 "💾 保存配置"

### 3. 💾 配置持久化

#### 存储机制
- 配置保存在浏览器 localStorage
- 键名: `solarfit_config`
- 格式: JSON

#### 自动加载
- 每次运行仿真时自动加载配置
- 无需重复设置
- 跨会话保持

#### 配置管理
- **保存配置**: 保存到本地存储
- **恢复默认**: 重置所有参数
- **导出配置**: 下载JSON文件

### 4. 📊 推算逻辑展示 (v1.0.0遗留)

之前版本已实现的功能：

#### 方案推算逻辑详解
- 6个详细步骤展示
- 完整公式和推导
- 支持方案切换

#### 推演过程可视化
- 🔢 推演过程详解
- ⚖️ 能量守恒验证
- 🔋 电池优化过程

## 文件变更

### 新增文件
```
1130_计算/page/
├── config-editor.html          # 配置管理页面
├── CONFIG_GUIDE.md             # 配置指南
├── UPDATE_v1.1.0.md            # 更新说明 (本文件)
└── CALCULATION_DISPLAY_GUIDE.md # 推算逻辑展示指南 (v1.0.0)
```

### 修改文件
```
1130_计算/page/
└── equipment-recommender.html  # 新建系统页面
    ├── 导航菜单: 新增 "系统配置" 链接
    └── JavaScript: 新增 loadSystemConfig() 函数
```

## 使用示例

### 场景1: 调整电池参数

```
1. 进入 "⚙️ 系统配置"
2. 修改电池参数:
   - RTE: 0.90 → 0.95
   - DOD: 0.90 → 0.85
3. 点击 "💾 保存配置"
4. 返回 "📊 新建系统"
5. 运行仿真 → 使用新参数
```

### 场景2: 调整优化目标

```
1. 进入 "⚙️ 系统配置"
2. 修改方案A目标:
   - 夜间覆盖率: 90% → 95%
   - 自给率: 70% → 80%
3. 保存配置
4. 重新运行仿真
5. 方案A会使用更大的电池容量
```

### 场景3: 启用逆变器规格库

```
1. 进入 "⚙️ 系统配置"
2. 找到 "逆变器规格库"
3. 打开 "启用规格库" 开关
4. 修改规格库 (可选):
   - 添加新型号
   - 修改容量
5. 保存配置
6. 运行仿真 → 从规格库选择型号
```

## 技术实现

### 配置加载流程

```javascript
// equipment-recommender.html

async function startSimulation() {
    // 加载配置
    const config = loadSystemConfig();
    
    // 创建模块实例，传入配置
    const synthesizer = new DataSynthesizer(config.simulation);
    const simulator = new HourlySimulator(config.simulation);
    const generator = new PlanGenerator(synthesizer, simulator, config);
    
    // 使用配置参数进行计算
    // ...
}

function loadSystemConfig() {
    const DEFAULT_CONFIG = { /* ... */ };
    const savedConfig = localStorage.getItem('solarfit_config');
    return savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIG;
}
```

### 配置保存流程

```javascript
// config-editor.html

function saveConfig() {
    const config = {
        simulation: { /* 从表单读取 */ },
        planTargets: { /* 从表单读取 */ },
        inverters: { /* 从表单读取 */ },
        batteries: { /* 从表单读取 */ }
    };
    
    localStorage.setItem('solarfit_config', JSON.stringify(config));
    
    // 显示保存成功提示
    showNotification();
}
```

### 开关实现

```javascript
// 逆变器规格库开关

const checkbox = document.getElementById('enableInverterCatalog');

checkbox.addEventListener('change', function() {
    const enabled = this.checked;
    const content = document.getElementById('inverterCatalogContent');
    
    // 更新可见性
    content.style.opacity = enabled ? '1' : '0.5';
    content.style.pointerEvents = enabled ? 'auto' : 'none';
    
    // 更新开关样式
    updateToggleStyle();
});
```

## 默认配置

```json
{
  "simulation": {
    "batteryRTE": 0.90,
    "batteryDOD": 0.90,
    "batteryChargeRate": 0.5,
    "batteryDischargeRate": 0.6,
    "exportLimit": 5.0,
    "importLimit": 0,
    "panelPower": 0.44,
    "seasonalFactor": 0.2,
    "binarySearchThreshold": 0.5,
    "maxIterations": 10
  },
  "planTargets": {
    "planA": { "nightCoverage": 90, "autarky": 70 },
    "planB": { "nightCoverage": 80, "selfConsumption": 40 },
    "planC": { "nightCoverage": 50 }
  },
  "inverters": {
    "enabled": false,
    "singlePhase": [
      "Sungrow SH5.0RS", 5.0,
      "Sungrow SH6.0RS", 6.0,
      "Sungrow SH8.0RS", 8.0,
      "Sungrow SH10RT", 10.0
    ],
    "threePhase": [
      "Sungrow SH10RT", 10.0,
      "Sungrow SH15T", 15.0,
      "Sungrow SH20T", 20.0,
      "Sungrow SH25T", 25.0,
      "Sungrow SH30T", 30.0
    ]
  },
  "batteries": {
    "capacities": [5, 6.5, 9.6, 10, 13.5, 16, 20]
  }
}
```

## 兼容性

### 浏览器支持
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### 向后兼容
- 如果没有保存的配置，使用默认值
- 不影响现有功能
- 可以随时恢复默认配置

## 已知问题

### 1. 配置导入功能
- **状态**: 未实现
- **计划**: v1.2.0
- **临时方案**: 手动复制粘贴JSON

### 2. 配置验证
- **状态**: 基础验证
- **改进**: 需要更严格的参数范围检查
- **计划**: v1.2.0

### 3. 配置预设
- **状态**: 未实现
- **需求**: 提供多个预设配置模板
- **计划**: v1.2.0

## 未来计划

### v1.2.0 (计划中)
- [ ] 配置导入功能
- [ ] 配置预设模板
- [ ] 参数范围验证增强
- [ ] 配置版本管理
- [ ] 配置对比功能

### v1.3.0 (计划中)
- [ ] 多用户配置管理
- [ ] 云端配置同步
- [ ] 配置历史记录
- [ ] 配置回滚功能

## 升级指南

### 从 v1.0.0 升级到 v1.1.0

1. **无需操作**: 直接使用新版本
2. **首次使用**: 系统使用默认配置
3. **自定义配置**: 进入配置页面设置
4. **验证功能**: 运行一次仿真确认

### 配置迁移

如果之前有自定义代码中的参数：

```javascript
// 旧方式 (v1.0.0)
const synthesizer = new DataSynthesizer({
    batteryRTE: 0.95,  // 硬编码
    // ...
});

// 新方式 (v1.1.0)
const config = loadSystemConfig();  // 从配置加载
const synthesizer = new DataSynthesizer(config.simulation);
```

## 反馈与支持

### 问题反馈
- 发现Bug请及时反馈
- 提供详细的复现步骤
- 附上配置文件 (导出的JSON)

### 功能建议
- 欢迎提出新功能建议
- 说明使用场景和需求
- 优先级评估后纳入开发计划

---

**版本**: v1.1.0  
**发布日期**: 2024-12-01  
**开发团队**: SolarFit Pro Development Team

**重要提示**: 
- ⚠️ 逆变器规格库默认关闭
- 💾 配置保存在浏览器本地
- 🔄 可随时恢复默认配置
