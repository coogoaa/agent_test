# 光伏系统计算验证脚本

## 概述

基于 `1127 计算规则/page` 的完整逻辑，生成Python脚本用于快速验证光伏系统计算结果。

## 文件说明

- `solar_calculator.py` - 主计算脚本
- `config.json` - 配置文件（包含所有计算参数）
- `README.md` - 使用说明（本文件）

## 功能特性

### 1. 完整计算逻辑

- ✅ 屋顶坡面评分（基于方位角）
- ✅ 贪心算法填充屋顶
- ✅ 逆变器智能选型
- ✅ 容配比自动调整（200%限制）
- ✅ 储能容量动态计算（三种方法取最大值）
- ✅ 成本与补贴计算
- ✅ 三套差异化方案生成

### 2. 三套方案

#### 方案 A: 高端型
- 策略：物理极限满铺
- 储能系数：日用电×50%, 傍晚峰×2.0, PV×1.5
- 目标：能源独立

#### 方案 B: 平衡型
- 策略：10-13kW动态调整
- 储能系数：日用电×30%, 傍晚峰×1.5, PV×1.0
- 目标：性价比最优

#### 方案 C: 经济型
- 策略：6.6kW入门配置
- 储能系数：日用电×20%, 傍晚峰×1.0, PV×0.8
- 目标：快速回本

## 安装依赖

```bash
# Python 3.7+ 即可，无需额外依赖
python3 --version
```

## 快速开始

### 1. 运行内置测试案例

```bash
cd "1127 计算规则/脚本"
python3 solar_calculator.py
```

这将运行3个内置测试案例，输出结果到 `../out` 目录。

### 2. 自定义测试数据

编辑 `solar_calculator.py` 中的 `test_cases` 列表：

```python
test_cases = [
    {
        'name': '你的测试案例',
        'house_data': [
            {'id': 'slope 1', 'aspect': 0, 'max': 20},    # 正北，20片
            {'id': 'slope 2', 'aspect': 90, 'max': 10}    # 正东，10片
        ],
        'state': 'NSW',           # 州代码
        'phase_type': 'single'    # 'single' 或 'three'
    }
]
```

### 3. 修改配置参数

编辑 `config.json` 文件，可修改：

- **PV参数**: `pv.pmax` (组件功率)
- **电池系数**: `battery.premium/balanced/economy`
- **逆变器规格**: `inverter.single/three`
- **成本参数**: `cost.pvPerKw`, `cost.batteryPerKwh` 等
- **补贴参数**: `subsidy.stcPrice`, `subsidy.zoneRating` 等

## 输出说明

### 输出目录

所有结果保存在 `1127 计算规则/out/` 目录，每次运行带时间戳。

### 输出文件

每个测试案例生成3个文件：

1. **`result_N_YYYYMMDD_HHMMSS.txt`** - 人类可读的详细报告
2. **`result_N_YYYYMMDD_HHMMSS.json`** - 机器可读的JSON数据
3. **`summary_YYYYMMDD_HHMMSS.txt`** - 所有案例的汇总报告

### 输出内容

#### 文本报告包含：

```
【屋顶分析】
  - 总坡面数、最大容量
  - 每个坡面的评分和朝向

【方案 A/B/C】
  - 光伏组件配置
  - 逆变器选型
  - 容配比
  - 储能容量（计算公式）
  - 成本明细
  - 补贴计算
  - 最终报价
  - 面板布局
```

#### JSON数据包含：

```json
{
  "roofAnalysis": {...},
  "state": "NSW",
  "phaseType": "single",
  "proposals": {
    "A": {
      "panels": 45,
      "pvKw": 19.8,
      "inverterKw": 10,
      "ratio": 198,
      "battery": {...},
      "cost": {...},
      "subsidy": {...},
      "finalPrice": 25000
    }
  }
}
```

## 计算逻辑验证

### 1. 坡面评分

```python
# 正北(0°) = 100分
# 东北/西北(45°) = 95分
# 正东/正西(90°) = 80分
# 正南(180°) = 40分
```

### 2. 容配比调整

```python
# 如果容配比 > 200%:
#   1. 尝试增大逆变器
#   2. 如果不行，减少面板（从低分坡面开始）
```

### 3. 储能容量

```python
# 三种方法取最大值:
#   方法1: 日均用电 × 系数
#   方法2: 傍晚高峰用电 × 系数
#   方法3: PV容量 × 系数
# 然后标准化到: [5, 6.5, 9.6, 10, 13.5, 16, 20] kWh
```

### 4. 补贴计算

```python
# PV STC = PV容量 × 区域系数 × 剩余年限
# Battery STC = 可用容量 × 9.3 (上限50kWh)
# 总补贴 = (PV STC + Battery STC) × $39
```

## 测试案例说明

### 案例1: 小屋顶
- 仅2片可用
- 测试极小屋顶场景
- 预期：三个方案容量相同

### 案例2: 中等屋顶
- 27片可用
- 测试标准住宅场景
- 预期：A满铺, B适中, C入门

### 案例3: 大屋顶三相
- 46片可用，三相电
- 测试大功率系统
- 预期：可选大功率逆变器

## 常见问题

### Q1: 如何添加新的州？

在 `config.json` 中添加：
```json
"consumption": {
  "NEW_STATE": 8000
},
"hourlyProfile": {
  "NEW_STATE": [3.5, 3.2, ...]  // 24个小时的比例
},
"subsidy": {
  "zoneRating": {
    "NEW_STATE": 1.5
  }
}
```

### Q2: 如何修改逆变器可选规格？

编辑 `config.json`:
```json
"inverter": {
  "single": {
    "a": [5, 6, 8, 10],  // 方案A可选规格
    "b": [5, 8],
    "c": [5, 8]
  }
}
```

### Q3: 如何禁用电池容量标准化？

在 `config.json` 中设置：
```json
"battery": {
  "useStandards": false
}
```

### Q4: 输出文件太多怎么办？

每次运行前可以清理旧文件：
```bash
rm -rf ../out/*
```

## 与HTML版本的对比

| 特性 | HTML版本 | Python脚本 |
|------|---------|-----------|
| 交互性 | ✅ 实时交互 | ❌ 批量处理 |
| 可视化 | ✅ 图表展示 | ❌ 文本输出 |
| 批量处理 | ❌ 单个处理 | ✅ 批量验证 |
| 自动化 | ❌ 手动操作 | ✅ 脚本自动化 |
| 数据导出 | ❌ 需手动复制 | ✅ 自动保存 |
| 适用场景 | 演示、单个报价 | 测试、批量验证 |

## 扩展开发

### 添加CSV批量导入

```python
import csv

def load_houses_from_csv(csv_path):
    houses = []
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            houses.append({
                'id': row['slope_id'],
                'aspect': float(row['aspect']),
                'max': int(row['max_panels'])
            })
    return houses
```

### 生成Excel报告

```python
import pandas as pd

def export_to_excel(results, output_path):
    df = pd.DataFrame([
        {
            '方案': prop['name'],
            'PV容量': prop['pvKw'],
            '逆变器': prop['inverterKw'],
            '储能': prop['battery']['standard'],
            '最终报价': prop['finalPrice']
        }
        for prop in results['proposals'].values()
    ])
    df.to_excel(output_path, index=False)
```

## 更新日志

### v1.0 (2024-11-27)
- ✅ 初始版本
- ✅ 完整计算逻辑
- ✅ 三套方案生成
- ✅ 时间戳输出
- ✅ JSON + TXT 双格式输出

## 技术支持

如有问题，请参考：
- `1127 计算规则/page/完整推导逻辑文档.md`
- `1127 计算规则/cankao.md`
