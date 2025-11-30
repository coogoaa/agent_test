#!/bin/bash
# 快速运行脚本

echo "======================================"
echo "光伏系统计算验证脚本"
echo "======================================"
echo ""

# 检查Python版本
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 python3"
    echo "请先安装 Python 3.7+"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "✅ Python 版本: $PYTHON_VERSION"
echo ""

# 进入脚本目录
cd "$(dirname "$0")"

# 选择运行模式
echo "请选择运行模式:"
echo "1. 运行内置测试案例 (solar_calculator.py)"
echo "2. 运行批量测试 (从 test_data.json 加载)"
echo "3. 清理输出目录"
echo ""
read -p "请输入选项 (1/2/3): " choice

case $choice in
    1)
        echo ""
        echo "运行内置测试案例..."
        python3 solar_calculator.py
        ;;
    2)
        echo ""
        echo "运行批量测试..."
        python3 run_batch_test.py
        ;;
    3)
        echo ""
        read -p "确认清理 ../out 目录? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            rm -rf ../out/*
            echo "✅ 输出目录已清理"
        else
            echo "❌ 取消清理"
        fi
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo "完成"
echo "======================================"
