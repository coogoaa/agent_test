# V6 页面更新说明

## 更新时间
2025-01-05

## 更新内容

### 1. 详细推导过程

所有 V6 页面现已包含完整的计算推导过程，参考原版页面的详细展示方式：

#### `equipment-recommender.html` (新建系统)
- ✅ **Step 1: 屋顶潜力评估** - GIS 分析结果、组件参数
- ✅ **Step 2: V6 能量维度计算** - 基础参数、日均用电/发电、晚高峰、整夜、光伏剩余
- ✅ **Step 3: 电池容量推导** - 三种方案对比（A/B/C）、效率参数、目标能量、标准化
- ✅ **Step 4: 成本计算** - 方案 A 线性定价、详细分项、补贴、税费
- ✅ **V6 核心优势总结** - 更准确的估算、更合理的容量

#### `storage-expansion.html` (储能扩容)
- ✅ **Step 0: 储能扩容模式说明** - 屋顶容量调整、扩容场景
- ✅ **Step 1: 可用屋顶评估** - 扩容后可用空间
- ✅ **Step 2: V6 能量维度计算** - 全年日均数据
- ✅ **Step 3: 电池容量推导** - 三种方案对比
- ✅ **Step 4: 成本计算** - 方案 A 线性定价

### 2. 统一成本计算方案

所有页面现已统一使用**方案 A (线性定价)**：

#### 更新的文件
- ✅ `equipment-recommender.html` & `equipment-recommender-logic.js`
- ✅ `storage-expansion.html` & `storage-expansion-logic.js`
- ✅ `batch-processor.html`

#### 方案 A 定价参数
```javascript
{
  pvPerKw: 价格/kW,           // 光伏单价
  inverterPerKw: 价格/kW,     // 逆变器单价
  batteryPerKwh: 价格/kWh     // 电池单价
}
```

#### 计算公式
```
不含税不含补贴 = PV容量 × pvPerKw + 逆变器容量 × inverterPerKw + 电池容量 × batteryPerKwh
含税含补贴 = (不含税不含补贴 - 补贴) × (1 + GST税率)
```

### 3. 推导过程特点

#### 可视化展示
- 🎨 使用颜色编码区分不同步骤（蓝色、绿色、紫色、琥珀色）
- 📊 计算框 (calculation-box) 展示详细公式
- 🔢 实时数据填充，根据用户选择动态更新

#### 详细程度
- 每个计算步骤都有完整的公式展示
- 中间值和最终结果都清晰标注
- 包含参数说明和单位标注

#### 教育性
- V6 核心变化说明（全年日均 vs 6月份）
- 系数调整说明（aSurplus: 0.7, bSurplus: 0.55）
- 电池效率参数解释（DOD、RTE）

## V6 核心逻辑

### 光伏剩余估算
```
V4: 使用 6 月份单月数据
V6: 使用全年日均数据 ✅ 更准确
```

### 电池容量系数
```
方案 A: aSurplus = 0.7 (从 0.8 调整) ✅ 更合理
方案 B: bSurplus = 0.55 (从 0.5 调整)
方案 C: 晚高峰用电
```

### 电池容量计算
```
方案 A: max(整夜用电, 0.7 × 光伏剩余) / 效率
方案 B: max(晚高峰用电, 0.55 × 光伏剩余) / 效率
方案 C: 晚高峰用电 / 效率

效率 = DOD × RTE = 0.9 × 0.95 = 0.855
```

## 文件清单

### 核心文件
- `config-loader.js` - V6 配置和计算逻辑
- `equipment-recommender.html` - 新建系统页面
- `equipment-recommender-logic.js` - 新建系统逻辑（详细推导）
- `storage-expansion.html` - 储能扩容页面
- `storage-expansion-logic.js` - 储能扩容逻辑（详细推导）
- `batch-processor.html` - 批量处理器
- `config-editor.html` - 配置编辑器

### 文档文件
- `V6_完整计算逻辑.md` - 完整计算逻辑文档
- `VERIFICATION_REPORT.md` - 验证报告
- `QUICK_START.md` - 快速开始指南
- `README.md` - 项目说明

## 使用方法

### 本地测试
```bash
cd "1127 计算规则/page/V6/page"
python3 -m http.server 8080
```

访问：
- 新建系统: http://localhost:8080/equipment-recommender.html
- 储能扩容: http://localhost:8080/storage-expansion.html
- 批量处理: http://localhost:8080/batch-processor.html
- 配置编辑: http://localhost:8080/config-editor.html

### 查看推导过程
1. 选择房屋样本
2. 选择所在州
3. 选择电网相位
4. 页面自动计算并显示三套方案
5. 向下滚动查看**完整推导过程**

## 关键改进

### 1. 推导过程完整性
- ✅ 每个计算步骤都有详细说明
- ✅ 公式和数值都清晰展示
- ✅ 中间结果和最终结果都标注

### 2. 成本计算统一性
- ✅ 所有页面使用方案 A 线性定价
- ✅ 移除了其他定价方案的复杂性
- ✅ 计算逻辑清晰一致

### 3. 用户体验
- ✅ 颜色编码便于区分不同步骤
- ✅ 实时数据更新
- ✅ V6 标识清晰可见

## 验证建议

1. **功能测试**
   - 测试不同房屋样本
   - 测试不同州的计算结果
   - 测试单相/三相切换

2. **推导过程验证**
   - 检查计算公式是否正确
   - 验证中间值是否合理
   - 确认最终结果准确性

3. **成本计算验证**
   - 确认使用方案 A 定价
   - 验证补贴计算
   - 检查税费计算

## 注意事项

1. **配置参数**
   - V6 参数在 `config-loader.js` 中定义
   - 可通过配置编辑器修改
   - 修改后需刷新页面

2. **浏览器兼容性**
   - 推荐使用现代浏览器（Chrome, Firefox, Safari, Edge）
   - 需要支持 ES6+ JavaScript

3. **数据来源**
   - 房屋数据为示例数据
   - 实际使用需替换为真实 GIS 数据

## 下一步建议

1. **集成真实数据**
   - 连接真实的 GIS 数据库
   - 使用实际的房屋信息

2. **性能优化**
   - 批量处理大数据集时的性能优化
   - 添加加载动画和进度提示

3. **功能扩展**
   - 添加方案对比功能
   - 导出详细报告（PDF）
   - 添加图表可视化

## 技术支持

如有问题，请检查：
1. 浏览器控制台是否有错误
2. `config-loader.js` 是否正确加载
3. 配置参数是否正确设置
