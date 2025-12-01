# 智能光伏推荐系统 - 未来演进规划与思考

本文档针对系统从"逻辑估算"向"精准选品与落地"演进过程中的关键问题进行深度分析与规划。

## 1. 智能选品引擎 (Smart Product Selection Engine)

从单纯的 kW/kWh 数值推荐，进化为具体的 SKU (库存单位) 推荐，需要构建一个多层的筛选漏斗。

### 1.1 筛选漏斗模型

选品过程应遵循以下优先级的筛选漏斗：

1.  **物理硬约束 (Hard Constraints)** - *必须满足，否则系统报错*
    *   **功率匹配**: 组件总功率 / 逆变器额定功率 (容配比 1.33 内)。
    *   **电气安全匹配 (核心难点)**:
        *   `Max Voc` (开路电压) * 串联数量 < 逆变器最大输入电压 (考虑低温系数)。
        *   `Max Isc` (短路电流) < 逆变器 MPPT 最大输入电流。
        *   `Start-up Voltage`: 串联电压 > 逆变器启动电压。
    *   **MPPT 与坡面映射**:
        *   多朝向屋顶需要多 MPPT 逆变器。
        *   *算法逻辑*: 如果屋顶有 2 个主要朝向安装了面板 -> 筛选 MPPT 数量 >= 2 的逆变器。
    *   **电池兼容性**: 混合逆变器与电池的通讯协议匹配、充放电电压/电流匹配。

2.  **库存与分销策略 (OSW Business Logic)** - *决定推荐优先级*
    *   **库存状态**: 优先推荐 `In Stock` 或 `Low Stock` (但非缺货) 的商品。
    *   **分销优先级**: 标记 `Promoted` (主推)、`Clearance` (清仓) 或 `High Margin` (高利) 商品，给予权重加分。

3.  **安装商偏好 (Installer Preferences)** - *千人千面*
    *   **配置面板**: 允许安装商在后台配置"首选品牌库" (例如：只做 Sungrow + Jinko)。
    *   **黑名单**: 排除安装商不喜欢的品牌。

### 1.2 实现路径建议
建立一个标准化的 `Product Database` (PDB)，包含关键电气字段：
*   **PV**: `Pmax`, `Voc`, `Isc`, `Vmpp`, `Impp`, `TempCoeff_Voc`.
*   **Inverter**: `MaxInputVoltage`, `MinStartVoltage`, `MPPT_Count`, `MaxCurrent_Per_MPPT`.

---

## 2. 方案分层策略重构：规格 vs 品质

您提到了安装商希望"同一规格，不同档次"的需求，这与我们目前"不同容量策略"的逻辑有所不同。建议采用 **"矩阵式方案"** 或 **"模式切换"**。

### 2.1 现状 vs 需求
*   **现状 (Capacity-Based)**: 经济型(小系统) vs 平衡型(中系统) vs 高端型(大系统)。
    *   *优点*: 给客户展示不同的投资规模选择。
*   **需求 (Tier-Based)**: 同样的 10kW 系统，分为 入门品牌(GoodWe) vs 中端品牌(Sungrow) vs 高端品牌(Fronius/Enphase)。
    *   *优点*: 便于客户在确定容量后进行比价。

### 2.2 建议解决方案：双模式切换
在前端增加一个 **"方案对比维度"** 的开关：

1.  **模式 A：容量对比 (默认)**
    *   展示：6.6kW 系统 vs 10kW 系统 vs 13kW 系统
    *   适用：客户还没决定要装多大的系统。

2.  **模式 B：品质/品牌对比**
    *   逻辑：先锁定计算出的最佳容量 (例如 10kW + 10kWh)。
    *   展示：
        *   **经济型**: 10kW (二线品牌组件 + 逆变器)
        *   **标准型**: 10kW (一线主流品牌)
        *   **旗舰型**: 10kW (N型组件 + 微逆/优化器 + 特斯拉Powerwall)
    *   *实现*: 在代码中由 `calculateCapacity()` 算出统一容量后，传入三个不同的 `ProductSelector` 策略 (Budget/Standard/Premium) 进行具体 SKU 的匹配。

---

## 3. 视觉增强与品牌露出

商品推荐不再是冷冰冰的参数，需要电商级的展示体验。

### 3.1 动态资源加载
*   **Logo 露出**: 在方案卡片右上角或设备名称旁，根据选定的 SKU 动态加载品牌 Logo (例如 Jinko, Sungrow, Tesla, BYD)。
*   **产品图**: 点击设备名称弹出 Modal，展示产品大图。

### 3.2 渲染逻辑
```javascript
// 示例数据结构
const productVisuals = {
    "Sungrow": { logo: "assets/logos/sungrow.png", heroImage: "assets/products/sungrow_sh10rt.jpg" },
    "Tesla": { logo: "assets/logos/tesla.png", heroImage: "assets/products/powerwall2.jpg" }
};

// 在生成卡片 HTML 时注入
<img src="${productVisuals[inverterBrand].logo}" class="brand-watermark" />
```

---

## 4. BOM (材料清单) 自动生成

从"方案"到"订单"的关键一步。

### 4.1 BOM 层级结构
一个完整的 BOM 应包含：

1.  **主要设备 (Major Components)**:
    *   PV Panels (数量准确)
    *   Inverter (规格准确)
    *   Battery (包含主控模块 + 扩展模块)
    *   Smart Meter (智能电表，通常是必选项)

2.  **安装支架 (Racking System)** - *计算难点*
    *   根据排布图 (Layout) 计算。
    *   **Rails (导轨)**: 面板总宽 x 数量 + 冗余。需要知道面板是横排(Landscape)还是竖排(Portrait)。
    *   **Clamps (中压/侧压块)**:
        *   侧压块 = 排数 x 2 x 2
        *   中压块 = (每排片数 - 1) x 2 x 排数
    *   **Feet/Hooks (挂钩)**: 根据导轨长度和屋顶类型(瓦顶/铁皮顶)计算间距。

3.  **电气辅材 (BoS - Balance of System)**
    *   DC Isolators (直流隔离开关)
    *   AC Isolators (交流隔离开关)
    *   Solar Cable (光伏线缆 - 通常按卷估算，如 100m)
    *   MC4 Connectors (接头)

### 4.2 演进步骤
1.  **Phase 1**: 只生成主要设备清单 (PV, Inv, Bat)。
2.  **Phase 2**: 加入"安装包" (Installation Kits)，按 kW 数打包辅材 (例如 "10kW 瓦顶安装包")，不进行精细计算。
3.  **Phase 3**: 结合排布图进行精准的 Rail 和 Clamp 计算。

## 总结：下一步开发建议

建议按照 **2 -> 1 -> 3 -> 4** 的顺序进行迭代：

1.  **优先 (Point 2)**: 实现**品质分层**逻辑，因为这直接影响销售转化，且不需要复杂的电气算法，只需建立简单的品牌分级库。
2.  **其次 (Point 1)**: 引入**基础电气匹配**，确保推荐的逆变器功率和相位是正确的，MPPT 匹配可作为进阶功能。
3.  **再次 (Point 3)**: 加入**品牌 Logo**，提升 UI 质感。
4.  **最后 (Point 4)**: **BOM 生成**，初期使用"打包"策略，后期再做精准算法。
