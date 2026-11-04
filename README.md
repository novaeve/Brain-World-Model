# Brain World Model · 官网

Brain World Model 当前版本 **Cajal** 的项目主页：实验进展、持久的 benchmark（和机器学习基线的差距）、当前模型架构，以及只追加的进展快报。

代码在 [Minions-Land/Cajal](https://github.com/Minions-Land/Cajal)，本仓库只放网站，两者分离。

## 结构

```
index.html          页面骨架：Hero · 01 Benchmark · 02 差距 · 03 架构 · 04 进展快报
styles.css          与 nanoBrain 官网同一套设计变量，自动适配浅色 / 深色
app.js              读取 data/ 并渲染斩杀线图、结果表、差距条和快报（无外部依赖）
data/benchmark.json 零样本评估结果：每个方法一行，每个指标一列（来自 Cajal 的 eval_zero_shot.py）
data/news.json      进展快报，只追加
assets/logo.svg
```

## 更新

- **Benchmark**：用 Cajal 仓库 `scripts/eval_zero_shot.py` 生成的 `summary.csv` 重写 `data/benchmark.json`，同步改 `updated` 日期。
- **进展快报**：在 `data/news.json` 里追加一条 `{date, tag, title, figure, figure_label, body}`，已有条目不改。页面按日期倒序显示，同一天内按文件顺序，最新一天标“最新”。

本地预览（页面用 `fetch` 读数据，需要通过 HTTP 打开）：

```bash
python3 -m http.server 8642
```
