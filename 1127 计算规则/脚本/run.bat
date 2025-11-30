@echo off
REM Windows 批处理脚本

echo ======================================
echo 光伏系统计算验证脚本
echo ======================================
echo.

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 Python
    echo 请先安装 Python 3.7+
    pause
    exit /b 1
)

python --version
echo.

REM 选择运行模式
echo 请选择运行模式:
echo 1. 运行内置测试案例 (solar_calculator.py)
echo 2. 运行批量测试 (从 test_data.json 加载)
echo 3. 清理输出目录
echo.
set /p choice="请输入选项 (1/2/3): "

if "%choice%"=="1" (
    echo.
    echo 运行内置测试案例...
    python solar_calculator.py
) else if "%choice%"=="2" (
    echo.
    echo 运行批量测试...
    python run_batch_test.py
) else if "%choice%"=="3" (
    echo.
    set /p confirm="确认清理 ..\out 目录? (y/n): "
    if "%confirm%"=="y" (
        del /q ..\out\* 2>nul
        echo ✅ 输出目录已清理
    ) else (
        echo ❌ 取消清理
    )
) else (
    echo ❌ 无效选项
    pause
    exit /b 1
)

echo.
echo ======================================
echo 完成
echo ======================================
pause
