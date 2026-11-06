# Brain World Model · 官网

Brain World Model 当前版本 **Cajal** 的项目主页：五任务 benchmark 与最强对手的差距、v0 → v1 的优化变化与 loss、实验记录、模型架构，以及只追加的进展快报。

本仓库只放网站，不含模型代码；网站与代码分离。

## 结构

```
index.html          页面骨架：Hero · 01 Benchmark · 02 差距 · 03 优化 · 04 实验 · 05 架构 · 06 进展快报
styles.css          简约风格的设计变量，自动适配浅色 / 深色
app.js              读取 data/ 并渲染斩杀线图、结果表、差距条、loss K 线和快报（无外部依赖）
data/benchmark.json 五任务评估结果：每个方法一行，每个指标一列，指标注明对手
data/optim.json     v0 / v1 各任务在编码器上的梯度份额（每 500 步）
data/experiments.json 1 万步实验记录：参照、改动、六项指标、结论
data/loss.json      v1 与 v0 预训练 loss：每 250 步一个均值（loss 看板）
data/news.json      进展快报，只追加
assets/logo.svg
```

## 更新

- **Benchmark**：用零样本评估生成的 `summary.csv` 重写 `data/benchmark.json`，同步改 `updated` 日期。
- **Loss 看板**：由训练日志 `train.jsonl` 按 250 步求均值，随版本更新，不实时。
- **进展快报**：在 `data/news.json` 里追加一条 `{date, tag, title, figure, figure_label, body}`，已有条目不改。页面按日期倒序显示，同一天内按文件顺序，最新一天标“最新”。

本地预览（页面用 `fetch` 读数据，需要通过 HTTP 打开）：

```bash
python3 -m http.server 8642
```
