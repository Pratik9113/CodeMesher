import matplotlib.pyplot as plt
import numpy as np

# Data
categories = [
    "① Small (<8K LOC)",
    "② Medium (8K–15K LOC)",
    "③ Large (>15K LOC)"
]

sequential_time = [17, 43, 88.5]
parallel_time = [3.83, 6.68, 10.4]

# X-axis positions
x = np.arange(len(categories))
width = 0.35

# Create figure
plt.figure(figsize=(9, 5))

# Bars
plt.bar(x - width/2, sequential_time, width, label='Sequential')
plt.bar(x + width/2, parallel_time, width, label='Parallel')

# Labels on bars
for i, v in enumerate(sequential_time):
    plt.text(i - width/2, v + 1, f"{v}s", ha='center', fontsize=10)

for i, v in enumerate(parallel_time):
    plt.text(i + width/2, v + 1, f"{v}s", ha='center', fontsize=10)

# Axis labels and title
plt.ylabel("Time (seconds)", fontsize=12)
plt.xticks(x, categories, fontsize=11)

# Y-axis limit
plt.ylim(0, 120)

# Legend
plt.legend()

# Grid
plt.grid(axis='y', linestyle='--', alpha=0.5)

# Layout
plt.tight_layout()

# Show graph
plt.show()