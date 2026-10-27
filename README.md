# IIDXLab — 独立离线谱面资料与分析工具

整个文件夹可以复制到其他 Windows x64 电脑使用。运行阶段只读取本目录 `dataset`，不需要原 HDD、网络、Python 或系统 Node。双击 `START.cmd` 进入搜索与报告生成菜单。也可以打开终端使用 `lab.cmd`。

现已提供 Vite + React + shadcn/ui 纯前端版：双击 `START-FRONTEND.cmd` 启动本地静态预览，或把 `frontend/dist/` 上传到静态托管。第三方可以直接导入 ES Modules 使用随机、统计和小节渲染功能，详见 `frontend/README.md`。生产运行不需要 Node 或后端服务；HDD 解包仅为离线构建步骤。

## 使用

```powershell
cd K:\HDD\Dev\IIDXLab
.\lab.cmd list 冥
.\lab.cmd list 20001
# 将下面 KEY 换成 list 输出的完整 key。同一歌曲可能有多个历史版本。
.\lab.cmd report KEY SPA
.\lab.cmd report KEY SPA --mode random --seed 20261027
.\lab.cmd report KEY DPA --mode custom --map 7654321/1234567
.\lab.cmd report KEY SPA --bin-ms 500
.\lab.cmd simulate KEY SPA 1000 seed-example
.\lab.cmd verify
```

`report` 输出到 `reports/`：

网页内还可下载 PNG，导出当前完整小节谱面（含当前排列和显示侧），默认 2× 分辨率。

- `.html`：双击即可打开的独立报告，统计以指标卡片、每小节物量、时间密度、键位负载、同押大小、同押跨度和随机映射图呈现。可切换 NORMAL、MIRROR、RANDOM、指定排列，下载 SVG 和完整 JSON。此文件单独拷走也可使用。
- `.svg`：整曲谱面图，每列从下向上读取，向右换列，每列 8 小节，小节等高；优先采用原始小节线，小节内按 BPM 积分后的拍位置绘制，长条可跨小节与分栏。标注小节号、拍号和 BPM 变化；变速小节边界加粗，橙色为加速、紫色为减速，小节中间变速另标精确位置；缺失小节线时按 BPM/拍号推算并告警。可缩放、打印或用矢量软件处理。DP：1P 转盘在左、2P 转盘在右。
- `.json`：完整歌曲来源、元数据、谱面事件、随机映射和统计结果。
- `-density.csv`：时间分箱的音符头数、键盘头数、转盘头数、长条头数和 NPS。

`simulate` 输出 JSON，包含各个种子与实际键位映射，以及键位负载、123/4/567 区域负载、同押跨度。它进行有放回采样，不保证每次排列不同。几何跨度只是描述量，不等于难度。

## 数据集

- `dataset/catalog.json`：所有不同歌曲谱面包的索引、来源、难度和基础数量；每个歌曲 ID 一份有效谱面包。按难度槽优先选择 33 omni 扩展、33 本体，再用 34 omni 扩展和 34 本体补齐；完全排除 23 代导入来源。逐谱面来源见 selection.json 与 charts[].provenance。
- `dataset/songs/*.json.gz`：完整解析事件。gzip 是标准格式，Python/R/其他语言均可解压读取。
- `dataset/raw/*.1`：有效谱面包，用 SHA-256 命名。跨包补齐的 4 首按槽位重新封装，事件字节与对应来源一致；其余保留选中原包。完整的非 23 代导入包保存在 dataset-source/，用于重新选择。
- `dataset/metadata.json`：各个歌曲数据库完整导出的曲名、作者、风格、等级、谱面 identifier 等资料。
- `dataset/charts.csv`：方便表格软件读取的全部谱面索引。
- `dataset/inventory.json`、`errors.json`、`summary.json`：扫描范围、逐文件状态、错误与汇总。

歌曲资料优先采用 33 omni 数据库，再用其他 33/34 资料补齐；34 补充难度的等级也从所选来源补齐。主库每首只保留一份有效记录。dataset-source/ 保留 33/34 的导入记录，不含 23 来源，供重新构建；找不到曲名时使用数字 ID。

## 事件与统计定义

事件数组固定为 `[time_ms, command, parameter_unsigned, value_signed]`，保留所有事件类型及全部 12 个非空槽位。原始 `.1` 的终止标记不放入事件数组，原文件完整保留。此工作区的街机版均晚于 GOLD，时间单位为毫秒。

常用 command：0/1 为 1P/2P 音符头，2/3 为键音切换，4 为 BPM，5 为拍号，7 为背景音，12 为小节线。音符 parameter 0..6 为键 1..7、7 为转盘。非零音符 value 以长条处理并保留原值。未知事件不丢弃；未知轨道参数会在报告中告警，不擅自映射。

槽位标签参考公开解析工具：0 SPH、1 SPN、2 SPA、3 SPB、4 SPL、6 DPH、7 DPN、8 DPA、10 DPL。其余槽保留为 SLOTn，不假定用途。

NPS 默认按 1000ms 固定箱统计音符头（含转盘，长条尾不额外计入）。另输出滚动 1 秒半开区间 `[start,start+1000ms)` 的峰值。平均密度按首个音符头到最后音符结束的区间计算。`head_plus_tail_count` 只是头数加非零长度数，不能未经核查当作官方 EX 分物量。CN/HCN/BSS 的判定语义没有完整模拟；没有做播放、判定或音频导出。

同押按完全相同的毫秒时间分组，整体同押数量包含两侧及转盘；跨度按单侧键盘音符头计算。连续同键统计是相邻同轨道音符头相隔不超过 250ms，不代表完整的纵连识别。持续长条与其他音符重叠不额外记为同时按下数。

## RANDOM 的边界

- RANDOM：每侧 7 键使用固定一对一置换；DP 两侧独立，转盘固定，键音事件随键位一起变换。
- MIRROR：两侧各自反转 7 键。
- 自定义映射表示“原键 1..7 的目标键”，DP 用 `/` 分隔两侧。
- 记录 seed 与实际映射；使用自定义 FNV1a + Mulberry32 算法，不能用它复现街机相同 seed。
- 固定 RANDOM 保留时间、同押大小、长条长度和整体 NPS，只改变空间排列。未实现 S-RANDOM、H-RANDOM、ALL-SCRATCH、DP FLIP 或街机判定规则。

## 校验与再提取

`lab.cmd verify` 对 dataset 中所有原始文件检查 SHA-256，并逐事件比较 gzip JSON 与原始 `.1`；只访问本目录。`runtime/node.exe test.js` 检查随机与统计的关键边界。

当前主库共 2,693 首、16,679 张谱面、52,481,900 个事件。其中 16,294 张来自 33 代，385 张由 34 代补齐；不保留 23 代导入来源。所有已选谱面已对照其来源事件逐一校验。

当前有 73 个 33/34 来源文件未解析，另有 4 个仅引用缺失父包且不含自身谱面的文件。缺少可用导出的 ID 仍为 34083、33027、33029。175 张有效谱面含 parameter=107 的特殊事件，完整保留但不画入常规轨道；11 首未匹配曲名。详见 dataset/audit.json。

`extract.py` 只扫描 LDJ-33 与 LDJ-34，写入 dataset-source/，不直接覆盖主库。重新构建顺序：extract.py（仅需重新读取 HDD 时）→ curate.cjs → check-curation.cjs → promote-curation.cjs → audit.js → frontend 中执行 npm run build。curate.cjs 的结果先放在 dataset-next/，校验后再提升为主库。正常运行无需原 HDD 或 Python。

## 研究来源

- https://github.com/mon/ifstools — IFS 解析依赖，附带包内许可证。
- https://github.com/SaxxonPike/rhythm-game-formats/blob/master/iidx/1.md — 原始谱面结构、事件与时间单位说明。
- https://github.com/drmext/iidx-datatools/blob/master/parse_chart_notecounts.py — 难度槽位与 IFS 读取方式参考。
- https://github.com/drmext/iidx-datatools/blob/master/musicdata_tool.py — 数据库字段布局参考；本提取器独立实现只读解析。

`runtime/` 附带 Node.js 可执行文件及对应 LICENSE。`vendor/` 保留第三方依赖及其 dist-info 许可证。
