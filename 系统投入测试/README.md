# 系统投入计算器

## 📖 简介

这是一个简单的系统投入计算器，用于计算光伏+储能系统的报价。界面简洁，展示详细的计算过程。

## 🚀 使用方法

1. 直接在浏览器中打开 `index.html` 文件
2. 在三个标签页中填写参数：
   - **基础参数**：系统容量、面板数量、电池容量等
   - **成本参数**：各项成本和利润率
   - **补贴参数**：STC、VIC、NSW等补贴相关参数
3. 点击"计算报价"按钮
4. 查看详细的计算过程和最终报价

## 📊 计算流程

计算器按以下步骤进行计算：

1. **Key Products** - 面板、逆变器、电池成本
2. **Balance of System (BOS)** - 安装费用
3. **Additional Charges** - 附加费用
4. **GST税费** - 商品服务税
5. **System Total** - 系统总价
6. **Deductions** - 各项补贴
7. **Final Price** - 最终报价

## ⚙️ 预设参数说明

### 基础参数
- 系统容量：6.6 kW
- 面板数量：15 块
- 逆变器容量：5 kW
- 电池容量：10 kWh
- 电池可用容量：9 kWh

### 成本参数
- 面板单价：80 AUD/块
- 逆变器单价：200 AUD/kW
- 电池单价：320 AUD/kWh
- 各项利润率：30%
- 光伏基础安装费：1000 AUD
- 光伏每kW安装费：150 AUD/kW
- 电池基础安装费：1000 AUD
- 电池每kWh安装费：250 AUD/kWh

### 补贴参数
- Zone Rating：1.382
- Deeming Period：6年
- PV STC单价：39 AUD
- Battery STC因子：9.3 STCs/kWh
- Battery STC单价：39 AUD
- VIC州补贴：1400 AUD
- VIC州无息贷款：1400 AUD
- NSW PRC单价：40 AUD
- 网络损耗系数：1.05

## ⚠️ 补充的参数

根据计算规则文档，我补充了以下之前缺少的参数：

1. **GST税率** (gst_rate)
   - 默认值：0.1 (10%)
   - 用途：计算商品服务税

2. **网络损耗系数** (network_loss_factor)
   - 默认值：1.05
   - 用途：NSW VPP Rebate计算中的PRC数量计算

3. **Solar VIC Rebate金额** (vic_rebate)
   - 默认值：1400 AUD
   - 用途：VIC州光伏补贴

4. **Solar VIC Interest Free Loan金额** (vic_loan)
   - 默认值：1400 AUD
   - 用途：VIC州无息贷款

5. **NSW每张PRC价格** (nsw_prc_price)
   - 默认值：40 AUD
   - 用途：NSW VPP Rebate补贴金额计算

## 📝 注意事项

- 储能扩容项目的面板和逆变器成本为0
- VIC州补贴仅在新建系统且安装PV面板时有效
- NSW VPP Rebate仅在电池可用容量在2-28kWh范围内时有效
- 所有金额单位为澳元(AUD)

## 🎨 界面特点

- ✅ 简洁的标签页设计，参数分类清晰
- ✅ 详细展示每一步计算过程
- ✅ 实时计算，无需后端服务器
- ✅ 响应式设计，适配不同屏幕尺寸
- ✅ 所有参数可预设和修改
