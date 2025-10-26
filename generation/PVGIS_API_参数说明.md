# PVGIS API 参数详解

## 一、配置文件参数是否参与计算

### 1. **参与计算的参数**

#### ✅ `system_loss`: 15
- **是否参与**: **是**，直接传给 PVGIS API
- **参数名**: `loss`
- **含义**: 系统损耗百分比
- **计算方式**: **乘法递减**，不是简单相减

**官方说明**：
根据 PVGIS 官方文档，损耗是**乘法计算**的：
```
总损耗 = 100 × (1 - (1-入射角损耗) × (1-温度/辐照损耗) × (1-系统损耗))
```

**示例**：
- 入射角损耗: 3.7%
- 温度/辐照损耗: 7.2%
- 系统损耗: 14%
- **总损耗** = 100×(1-(1-0.037)×(1-0.072)×(1-0.14)) = **23.1%**

**所以 `system_loss: 15` 的含义是**：
- 在扣除入射角损耗和温度/辐照损耗后
- 再对剩余功率乘以 (1-15%) = 85%
- **不是简单的** 标称功率 × (1-15%)

#### ✅ `power_watts`: 440
- **是否参与**: **是**
- **计算方式**: `peakpower = (power_watts × panel_count) / 1000` (转为 kWp)
- **传给 API**: `peakpower` 参数

#### ✅ `annual_degradation`: 0.4
- **是否参与**: **是**
- **参数名**: `pv_degradation`
- **含义**: 年衰减率 0.4%
- **同时设置**: `pvtechchoice: "crystSi"` (晶硅技术)

### 2. **未参与计算的参数**

#### ❌ `efficiency`: 22
- **是否参与**: **否**
- **原因**: PVGIS 只需要 `peakpower`（标称功率），不需要效率
- **说明**: 标称功率已经包含了效率信息
  - 标称功率 = 面积 × 效率（在标准测试条件下）
  - 如果你有 10% 效率的面板，需要 10m² 才能达到 1kWp
  - 如果你有 22% 效率的面板，只需要 4.5m² 就能达到 1kWp

#### ❌ `first_year_degradation`: 0
- **是否参与**: **否**
- **说明**: PVGIS API 不支持首年单独衰减率

#### ❌ `temperature_coefficient_pmax`: -0.3
- **是否参与**: **否**
- **说明**: PVGIS 使用自己的温度模型，不接受用户自定义温度系数

---

## 二、PVcalc API 调用详情

### 传入参数（每个坡面调用一次）

```python
params = {
    "lat": -41.1676875,              # 纬度
    "lon": 146.3472656,              # 经度
    "peakpower": 2.20,               # 峰值功率 (kWp) = 440W × 5块 / 1000
    "loss": 15,                      # 系统损耗 (%)
    "angle": 23,                     # 倾斜角 (度)
    "aspect": -55.62,                # 方位角 (度，0=南，-90=东，90=西)
    "pvtechchoice": "crystSi",       # 光伏技术类型：晶硅
    "pv_degradation": 0.4,           # 年衰减率 (%)
    "outputformat": "json"           # 输出格式
}
```

### 返回数据结构

```json
{
  "outputs": {
    "totals": {
      "fixed": {
        "E_y": 2248.05,        // 年发电量 (kWh)
        "E_d": 6.16,           // 日均发电量 (kWh/day)
        // ... 其他统计数据
      }
    },
    "monthly": {
      "fixed": [
        {
          "month": 1,
          "E_d": 10.99,        // 1月日均发电量
          "E_m": 340.69,       // 1月总发电量
          // ... 其他月度数据
        },
        // ... 12个月的数据
      ]
    }
  }
}
```

---

## 三、Seriescalc API - 小时辐射数据

### 当前调用方式

```python
params = {
    "lat": -41.1676875,
    "lon": 146.3472656,
    "outputformat": "json"
}
```

### ⚠️ 问题：能否只返回 2023 年数据？

**答案：可以！** 

根据 PVGIS 官方文档，`seriescalc` API 支持以下参数：

#### 可用的年份参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `startyear` | 整数 | 起始年份 |
| `endyear` | 整数 | 结束年份 |

#### 修改建议

```python
params = {
    "lat": -41.1676875,
    "lon": 146.3472656,
    "startyear": 2023,           # ✅ 添加起始年份
    "endyear": 2023,             # ✅ 添加结束年份
    "outputformat": "json"
}
```

#### 示例 API 调用

```
https://re.jrc.ec.europa.eu/api/seriescalc?lat=-41.1676875&lon=146.3472656&startyear=2023&endyear=2023&outputformat=json
```

#### 数据量对比

- **不指定年份**: 返回所有可用年份（通常 19 年，约 166,536 条记录）
- **指定 2023**: 只返回 2023 年（8,760 条记录，闰年 8,784 条）

#### 注意事项

1. **数据可用性**: 不是所有地区都有 2023 年的数据，需要查看该地区的数据覆盖范围
2. **数据库选择**: 不同数据库（PVGIS-SARAH2, PVGIS-ERA5 等）的时间覆盖范围不同
3. **可选参数**: 还可以添加 `raddatabase` 参数指定数据源

---

## 四、完整的 API 参数对照表

### PVcalc API 参数

| 配置文件参数 | API 参数 | 是否使用 | 说明 |
|-------------|---------|---------|------|
| `location.latitude` | `lat` | ✅ | 纬度 |
| `location.longitude` | `lon` | ✅ | 经度 |
| `panel_spec.power_watts` × `panel_count` | `peakpower` | ✅ | 峰值功率 (kWp) |
| `system_loss` | `loss` | ✅ | 系统损耗 (%) |
| `roof_surfaces[].tilt_angle` | `angle` | ✅ | 倾斜角 |
| `roof_surfaces[].azimuth` | `aspect` | ✅ | 方位角 |
| `panel_spec.annual_degradation` | `pv_degradation` | ✅ | 年衰减率 |
| - | `pvtechchoice` | ✅ | 固定为 "crystSi" |
| `panel_spec.efficiency` | - | ❌ | 不使用 |
| `panel_spec.first_year_degradation` | - | ❌ | 不使用 |
| `panel_spec.temperature_coefficient_pmax` | - | ❌ | 不使用 |

### Seriescalc API 参数

| 配置文件参数 | API 参数 | 当前是否使用 | 建议 |
|-------------|---------|------------|------|
| `location.latitude` | `lat` | ✅ | - |
| `location.longitude` | `lon` | ✅ | - |
| - | `startyear` | ❌ | **建议添加** |
| - | `endyear` | ❌ | **建议添加** |
| - | `raddatabase` | ❌ | 可选 |

---

## 五、参考资料

1. **PVGIS 官方 API 文档**:  
   https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/api-non-interactive-service_en

2. **PVGIS 常见问题**:  
   https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/using-pvgis-frequently-asked-questions_en

3. **损耗计算方法**:  
   损耗是乘法递减，不是简单相加

4. **API 限制**:
   - 速率限制: 30 次/秒/IP
   - 并发限制: 超过会返回 529 状态码
