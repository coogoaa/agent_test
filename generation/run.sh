#!/bin/bash
# 光伏发电量计算程序启动脚本
# 默认使用2023年数据版本

echo "==================================="
echo "光伏发电量计算 - 2023年数据版本"
echo "==================================="
echo ""

# 检查配置文件
if [ ! -f "config_australia.json" ]; then
    echo "错误: 找不到配置文件 config_australia.json"
    exit 1
fi

# 运行2023年版本（默认）
python3 pv_calculator_2023.py config_australia.json

echo ""
echo "==================================="
echo "计算完成！"
echo "==================================="
