#!/bin/bash
# 批量处理快速启动脚本

echo "======================================"
echo "光伏系统批量处理"
echo "======================================"
echo ""

# 检查Python版本
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 python3"
    exit 1
fi

# 进入脚本目录
cd "$(dirname "$0")"

# 默认参数
INPUT_FILE="../验证数据/agent_sample_data - 坡面信息.csv"
STATE="NSW"
PHASE="single"
MODE="both"
LIMIT=""

echo "请选择处理模式:"
echo "1. 新建系统 + 储能扩容（推荐）"
echo "2. 仅新建系统"
echo "3. 仅储能扩容"
echo "4. 测试模式（仅处理10个房屋）"
echo "5. 自定义参数"
echo ""
read -p "请输入选项 (1-5): " choice

case $choice in
    1)
        MODE="both"
        echo ""
        echo "✅ 将处理新建系统和储能扩容"
        ;;
    2)
        MODE="new"
        echo ""
        echo "✅ 将仅处理新建系统"
        ;;
    3)
        MODE="expansion"
        echo ""
        echo "✅ 将仅处理储能扩容"
        ;;
    4)
        MODE="both"
        LIMIT="-l 10"
        echo ""
        echo "✅ 测试模式：仅处理前10个房屋"
        ;;
    5)
        echo ""
        read -p "州代码 (NSW/VIC/QLD/SA/WA/TAS/ACT/NT) [默认:NSW]: " input_state
        STATE=${input_state:-NSW}
        
        read -p "电网类型 (single/three) [默认:single]: " input_phase
        PHASE=${input_phase:-single}
        
        read -p "处理模式 (new/expansion/both) [默认:both]: " input_mode
        MODE=${input_mode:-both}
        
        read -p "限制数量 (留空处理全部): " input_limit
        if [ ! -z "$input_limit" ]; then
            LIMIT="-l $input_limit"
        fi
        
        echo ""
        echo "✅ 自定义参数已设置"
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

# 显示配置
echo ""
echo "======================================"
echo "处理配置"
echo "======================================"
echo "输入文件: $INPUT_FILE"
echo "州: $STATE"
echo "电网类型: $PHASE"
echo "处理模式: $MODE"
if [ ! -z "$LIMIT" ]; then
    echo "限制数量: ${LIMIT#-l }"
else
    echo "限制数量: 全部"
fi
echo ""

read -p "确认开始处理? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "❌ 已取消"
    exit 0
fi

# 执行处理
echo ""
echo "======================================"
echo "开始处理..."
echo "======================================"
echo ""

python3 batch_processor.py \
    -i "$INPUT_FILE" \
    -s "$STATE" \
    -p "$PHASE" \
    -m "$MODE" \
    $LIMIT

echo ""
echo "======================================"
echo "完成"
echo "======================================"
echo ""
echo "输出文件位置: ../out/"
echo ""
echo "查看结果:"
echo "  cd ../out"
echo "  ls -lh"
echo ""
