# 保存为 calc_system_size_bins.py，Python 3 环境运行
import csv, re
from collections import Counter

FILES = [
    ("2025年评论数据", "scraped_data/analysis_output/2025年评论数据.csv"),
    ("2025年7月后评论数据", "scraped_data/analysis_output/2025年7月后评论数据.csv"),
]

PATTERN = re.compile(r"([0-9]+(?:\.[0-9]+)?)\s*k", re.IGNORECASE)
BINS = [
    (0, 4, "<4kW"),
    (4, 6, "4-6kW"),
    (6, 8, "6-8kW"),
    (8, 10, "8-10kW"),
    (10, 13, "10-13kW"),
    (13, 15, "13-15kW"),
    (15, 20, "15-20kW"),
    (20, 30, "20-30kW"),
    (30, 60, "30-60kW"),
    (60, float("inf"), "60kW以上"),
]

for title, path in FILES:
    values = []
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw = (row.get("system_size") or "").strip()
            if not raw:
                continue
            m = PATTERN.search(raw)
            if m:
                values.append(float(m.group(1)))

    total = len(values)
    print(f"\n=== {title} ===")
    print(f"可识别样本：{total}")

    top = Counter(round(v, 2) for v in values).most_common(8)
    for size, count in top:
        print(f"  {size}kW -> {count} ({count / total * 100:.1f}%)")

    print("区间分布：")
    for low, high, label in BINS:
        count = sum(1 for v in values if low <= v < high)
        pct = count / total * 100 if total else 0
        print(f"  {label:<8} {count:4d} ({pct:5.1f}%)")