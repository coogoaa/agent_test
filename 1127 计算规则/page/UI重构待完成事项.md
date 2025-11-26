# UI重构待完成事项

## 已完成 ✅

1. **UI结构调整**
   - ✅ 添加计算按钮（大型渐变按钮）
   - ✅ 三套方案卡片添加最终报价显示区
   - ✅ 推导过程区域改为Tab结构（光伏系统 / 成本计算）
   - ✅ 添加成本和补贴配置常量
   - ✅ 添加成本计算函数 `calculateCost()`
   - ✅ 添加补贴计算函数 `calculateSubsidy()`

## 待完成 🚧

### 1. JavaScript事件监听器

需要在 `init()` 函数中添加：

```javascript
// 计算按钮点击事件
document.getElementById('calculateBtn').addEventListener('click', () => {
    const houseId = document.getElementById('houseSelector').value;
    if (!houseId) {
        alert('请先选择房屋ID');
        return;
    }
    updateUI();
    // 滚动到结果区域
    document.getElementById('proposalsContainer').scrollIntoView({ behavior: 'smooth' });
});

// Tab切换事件
document.querySelectorAll('.derivation-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        // 移除所有active
        document.querySelectorAll('.derivation-tab').forEach(b => {
            b.classList.remove('active', 'border-green-500', 'text-green-600');
            b.classList.add('border-transparent', 'text-gray-500');
        });
        document.querySelectorAll('.derivation-content').forEach(c => c.classList.add('hidden'));
        
        // 激活当前tab
        btn.classList.add('active', 'border-green-500', 'text-green-600');
        btn.classList.remove('border-transparent', 'text-gray-500');
        document.getElementById(btn.dataset.tab).classList.remove('hidden');
    });
});
```

### 2. 成本推导过程生成函数

需要创建 `generateCostDerivation()` 函数：

```javascript
function generateCostDerivation(planA, planB, planC, state) {
    const steps = [];
    
    // Step 1: 成本计算
    steps.push({
        step: 1,
        title: '系统成本计算',
        desc: '根据配置计算各组件成本',
        details: []
    });
    
    ['A', 'B', 'C'].forEach((plan, idx) => {
        const data = [planA, planB, planC][idx];
        const cost = calculateCost(data.totalKw, data.inverter, data.battery.standard);
        
        steps[0].details.push({
            text: `方案${plan}: PV ${data.totalKw.toFixed(2)}kW × $540 + 逆变器 ${data.inverter}kW × $280 + 电池 ${data.battery.standard}kWh × $865`,
            highlight: true
        });
        steps[0].details.push({
            text: `  税前: $${cost.preTaxTotal.toFixed(2)}, 含税: $${cost.taxTotal.toFixed(2)}`
        });
    });
    
    // Step 2: 补贴计算
    steps.push({
        step: 2,
        title: 'STC补贴计算',
        desc: `Deeming Period: ${SUBSIDY_CONFIG.deemingEndYear - SUBSIDY_CONFIG.installYear + 1}年, Zone Rating (${state}): ${SUBSIDY_CONFIG.zoneRating[state]}`,
        details: []
    });
    
    ['A', 'B', 'C'].forEach((plan, idx) => {
        const data = [planA, planB, planC][idx];
        const subsidy = calculateSubsidy(data.totalKw, data.battery.standard, state);
        
        steps[1].details.push({
            text: `方案${plan}: PV STC ${subsidy.pvStc} + Battery STC ${subsidy.batteryStc} = ${subsidy.totalStc} STC`,
            highlight: true
        });
        steps[1].details.push({
            text: `  补贴金额: ${subsidy.totalStc} × $39 = $${subsidy.subsidyAmount.toFixed(2)}`
        });
    });
    
    // Step 3: 最终报价
    steps.push({
        step: 3,
        title: '最终客户报价',
        desc: '含税价 - STC补贴 = 客户实付',
        details: []
    });
    
    ['A', 'B', 'C'].forEach((plan, idx) => {
        const data = [planA, planB, planC][idx];
        const cost = calculateCost(data.totalKw, data.inverter, data.battery.standard);
        const subsidy = calculateSubsidy(data.totalKw, data.battery.standard, state);
        const finalPrice = cost.taxTotal - subsidy.subsidyAmount;
        
        steps[2].details.push({
            text: `方案${plan}: $${cost.taxTotal.toFixed(2)} - $${subsidy.subsidyAmount.toFixed(2)} = $${finalPrice.toFixed(2)}`,
            highlight: true,
            success: true
        });
    });
    
    return steps;
}
```

### 3. 更新updateCard函数

需要添加价格信息的更新：

```javascript
function updateCard(prefix, planData) {
    // ... 现有代码 ...
    
    // 计算成本和补贴
    const state = AppData.currentState;
    const cost = calculateCost(planData.totalKw, planData.inverter, planData.battery.standard);
    const subsidy = calculateSubsidy(planData.totalKw, planData.battery.standard, state);
    const finalPrice = cost.taxTotal - subsidy.subsidyAmount;
    
    // 更新价格显示
    document.getElementById(`${prefix}-finalPrice`).textContent = `$${finalPrice.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    document.getElementById(`${prefix}-taxPrice`).textContent = `$${cost.taxTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    document.getElementById(`${prefix}-subsidy`).textContent = `$${subsidy.subsidyAmount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}
```

### 4. 更新updateUI函数

需要添加成本推导的渲染：

```javascript
function updateUI() {
    // ... 现有代码 ...
    
    // 渲染成本推导
    const costSteps = generateCostDerivation(
        data.plans.planA,
        data.plans.planB,
        data.plans.planC,
        AppData.currentState
    );
    
    const costContainer = document.getElementById('costDerivationSteps');
    costContainer.innerHTML = '';
    costSteps.forEach(step => {
        const stepHtml = renderDerivationStep(step);
        costContainer.innerHTML += stepHtml;
    });
}
```

## 测试检查清单

- [ ] 计算按钮点击后能正常计算
- [ ] 三套方案都显示正确的最终报价
- [ ] 含税价和补贴金额显示正确
- [ ] Tab切换正常工作
- [ ] 光伏系统推导显示正常
- [ ] 成本计算推导显示正常
- [ ] 不同州的Zone Rating计算正确
- [ ] 价格格式化正确（千位分隔符）

## 示例数据验证

### 方案C (NSW州, 6.6kW PV + 5kW逆变器 + 6.5kWh电池)

**成本计算**:
- PV: 6.6 × 540 = $3,564
- 逆变器: 5 × 280 = $1,400
- 电池: 6.5 × 865 = $5,622.5
- 税前: $10,586.5
- 含税: $11,645.15

**补贴计算**:
- Deeming Period: 6年
- Zone Rating (NSW): 1.382
- PV STC: FLOOR(6.6 × 1.382 × 6) = 54
- Battery STC: FLOOR(6.5 × 9.3) = 60
- 总STC: 114
- 补贴: 114 × 39 = $4,446

**最终报价**:
- $11,645 - $4,446 = **$7,199**

## 文件位置

- 主文件: `/1127 计算规则/page/equipment-recommender.html`
- 成本说明: `/1127 计算规则/page/成本与补贴计算说明.md`
- 配置编辑器: `/1127 计算规则/page/config-editor.html`
