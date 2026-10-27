# IIDXLab · Vite + React + shadcn/ui

界面音游术语保留原文：Notes、Long Notes、Scratch、Chord、Jack、Lane、NPS、BPM、RANDOM 等，不使用“音符头”“长条头”等译法。Notes 按 Note Start 统计，Long Note End 不重复计入；统计口径与数据字段保持不变。

Hi-Speed 可在 0.25–4× 范围调节小节高度和 Note 垂直间距，默认 1× 保持原显示；不改变 Note 厚度、时间、Lane 或排列，PNG/SVG/JSON/离线 HTML 沿用该设置。SDK 使用 `renderChartSVG(chart, title, 8, {hiSpeed: 1.5})`，也可通过 `chart.display.hiSpeed` 保存。Lane mapping 使用上下两排键位与彩色连线表示 Original → Target，DP 分别显示双侧，Scratch 固定。

小节谱面位于 controls 下方，统计面板位于谱面之后。页首侧栏按钮可收起/展开资料库。界面精简常驻说明，统计图支持悬停查看数据，数据异常提示仍保留。PNG 下载在浏览器本地由当前完整 SVG 生成，沿用当前 RANDOM、1P/2P、阅读方向和 BPM 标记；默认 2× 分辨率，超大图自动限制为最大边 16384px、6400 万像素以内，不截取屏幕或裁掉横向内容。

左侧支持 VERSION / LEVEL / TITLE 分类，配合 SP / DP、DIFFICULTY 与搜索使用。VERSION 使用 metadata.style 的初出代目（1st style 和 substream 分开），并非导入文件来自哪一代。LEVEL 按实际谱面逐张列出，点击直接打开该难度；0 或缺失等级归入“未标定 LEVEL”。TITLE 优先使用数据库 title_ascii 排序及分类，数字归入 0–9，未能归入 A–Z 的标题单列“其他”。列表可继续加载全部结果。

曲目列表用紫色 OMNI 标记实际选自 omni 扩展目录的谱面包；仅部分难度来自 omni 的曲目标记为 OMNI+，悬停可查看难度列表。LEVEL 模式按该条具体谱面的来源标记，避免将本体谱面误标为 omni。标记根据逐谱面 provenance 判定，表示数据来源，不代表该曲从未在本体出现。SDK 提供 `getOmniInfo(song)`（isOmni、partial、difficulties）和 `isOmniSource(path)`。

左侧难度与星数使用同色标签：ANOTHER 红、HYPER 黄、NORMAL 蓝、BEGINNER 绿、LEGGENDARIA / BLACK ANOTHER 紫；SP/DP 同类难度共用配色。曲名 15px，星数 13px。本数据内部槽位 SPB/DPB 指 Beginner，列表显示为 BEGINNER / DP BEGINNER，避免与用户所称的 Black Another（SPB）混淆。明确带 variant=black / black_another 的谱面才显示黑谱 SPB / DPB 标签；不通过等级猜测黑谱类型。

数据策略：33 omni 扩展优先，其次 33 本体；仅用 34 补齐缺少的歌曲或难度。无 23 代导入来源，每个 ID 一条记录（2,693 首、16,679 张谱面）。谱面变速小节以橙色（加速）/紫色（减速）粗线标记，小节中间变速另标精确拍位置。

`dist/` 是可以直接放在任意静态文件服务器上的完整成品。没有后端 API、数据库服务、第三方 CDN 或 npm 运行依赖。谱面解压、随机模拟、分析和绘图都由浏览器完成。旧版 CLI 继续可用，与前端共用 `src/core.mjs` 和 `src/render.mjs`。

界面使用 shadcn/ui Base UI 的 nova 组件、neutral 主题与 neutral 底色、Nunito Sans 字体及 lucide 图标。点击重新随机按钮会自动生成种子并立即应用，与当前排列不同；选择 RANDOM 模式也会立即随机。仍可手动输入种子复现排列。SP 支持 1P（左转盘）/2P（右转盘）切换，仅改变显示位置，不镜像键号或修改原始事件；切换谱面难度时保留显示侧。DP 始终完整显示双侧。

## 开发与构建

已安装并遵循官方 `shadcn-ui/ui` 的 `skills/shadcn` skill。原始 `a1l2B0K` 中的 mist 底色 + neutral 主题被官方 registry 拒绝（HTTP 400），因此按用户选择改成 neutral 底色，保留 neutral 主题。使用官方 CLI 初始化 `nova`，再配置 Nunito Sans；`components.json` 和 `src/styles.css` 为实际配置。当前官方 CLI 检测到的兼容 preset 为 `bX2`（nova / neutral 底色 / neutral 主题与图表 / lucide / nunito-sans / 默认圆角 / subtle menu accent）。

```powershell
cd K:\HDD\Dev\IIDXLab\frontend
npm ci
npm run dev
npm run build
npm run preview
```

`npm run dev` 先准备静态数据，再启动 Vite（默认 5173）。`npm run build` 执行 TypeScript 检查、Vite 构建并复制 SDK 与数据；`npm run preview` 在 4173 提供 dist。修改组件使用 `npx shadcn@latest add ...`；组件源代码在 `src/components/ui/`。

React 页面直接组合 Sidebar、Field、Select、ToggleGroup、Badge、Card、Chart 等组件；统计图由 shadcn Chart + Recharts 绘制，专用小节谱面保留 SVG 引擎，无 iframe。字体和运行资源都打包在本地。纯 JS SDK 及 CLI 离线报告继续独立使用，不依赖 React。

`npm test` 验证引擎、来源与筛选逻辑。`qa.cjs` 是当前机器的浏览器验证脚本，使用预装 Playwright 与 Chrome；检查 React 页面、下载、移动端和模块示例，不属于生产依赖。

## 本地打开与部署

本地双击上一级 `START-FRONTEND.cmd`，然后打开 http://127.0.0.1:4173 。此处 Node 仅提供静态文件，生产部署不需要它。也可以用你已有的静态服务器托管 `dist/`。ES Modules 与 fetch 需要 HTTP(S)，不能通过双击 `file://.../index.html` 启动整个应用；已经导出的单文件报告仍可直接双击。

部署时上传 **dist 内的内容**，可以放在网站子目录。需要让 `.js` 和 `.mjs` 返回 JavaScript MIME 类型，`.json.gz` 当作普通二进制文件返回即可（SDK 也兼容服务器已经解压的 JSON 响应）。若从其他域加载数据，数据服务器需要允许对应的 CORS 访问。

浏览器需要支持原生 ES Modules 与 `DecompressionStream('gzip')`。支持情况会在加载时检测；不支持时提示错误，不依赖外部解压库。

## 在其他项目中调用

将 `dist/index.mjs`、`core.mjs`、`render.mjs`、`browse.mjs`、`difficulty.mjs` 放在同一目录；可以仅引入代码，数据地址单独配置。提供数据时使用构建后的 `data/catalog.json` 和 `data/songs/`。

```javascript
import {
  createDataset, transform, analyze,
  measureLayout, renderChartSVG, renderStatsHTML, createReportHTML
} from './iidxlab/index.mjs';

const dataset = createDataset(new URL('./iidxlab/data/', location.href));
const matches = await dataset.search('冥');
// 当前主库每个 ID 唯一，仍可传完整 key 确定内容哈希。
const bundle = await dataset.loadChart(matches[0].key, 'SPA');
const chart = transform(bundle.chart, 'random', 'my-seed');
const stats = analyze(chart, 1000);

document.querySelector('#stats').innerHTML = renderStatsHTML(chart, stats);
document.querySelector('#chart').innerHTML = renderChartSVG(chart, bundle.metadata.title);
const standaloneHTML = createReportHTML(bundle);
```

参见 `dist/example.html`，里面是一份可运行的外部集成示例。`renderStatsHTML` 返回语义化 HTML + SVG；宿主可自定义 `.cards/.card/.grid/.panel/.muted/.warning` 样式。`renderChartSVG` 自带谱面样式。

| API | 用途 |
| --- | --- |
| `createDataset(baseURL, {fetch?})` | 读取静态数据，可注入 fetch 方便测试或集成 |
| `dataset.catalog()` / `search(query)` | 获取索引 / 按 ID、key、曲名、作者搜索 |
| `dataset.browse(options)` / `browseSongs(songs, options)` | 按 VERSION、LEVEL、TITLE 分类与组合筛选；返回 entries、folders、totalSongs、totalCharts |
| `dataset.loadSong(key)` / `loadChart(key, difficulty)` | 按需读取并解压所选谱面，内存最多缓存 12 个歌曲包 |
| `transform(chart, mode, seed, mapping?)` | normal / mirror / random / custom；返回新对象，不修改原谱面 |
| `analyze(chart, binMs=1000)` | 物量、密度、键位负载、同押统计 |
| `measureLayout(chart)` | 原始小节线、BPM 积分、拍位置换算 |
| `renderChartSVG(chart, title, measuresPerColumn=8)` | 小节等高的整曲 SVG |
| `renderStatsHTML(chart, stats)` | 图形统计面板 |
| `createReportHTML(bundle, binMs=1000)` | 完整可独立保存、离线打开的 HTML 报告 |
| `await svgToPNG(svgText, {scale:2})` | 浏览器端返回 PNG Blob；无需服务端或第三方库 |

显示侧可通过 `renderChartSVG(chart, title, 8, {playSide:'2p'})` 或 `createReportHTML(bundle, 1000, {playSide:'2p'})` 指定。交互导出的 `chart.display.playSide` 也会保存显示侧；DP 忽略单侧设置。显示侧不改变 `transform` 的随机映射。

浏览示例：`await dataset.browse({groupBy:'level', category:'12', playMode:'DP', difficulty:'A', query:''})`。groupBy 可为 version / level / title；category 为 all、版本编号、等级数字或 A–Z / # / other；difficulty 为 all / B / N / H / A / L。等级模式的每个 entry 都含实际 chart 与 difficulty，避免只按歌曲最高等级筛选。

不需要歌曲库时，可以直接将已有的 `chart` 传入算法。事件结构仍为 `[time_ms, command, parameter, value]`。包含的数据缺口和特殊轨道限制与主项目相同，详见主 README；前端化没有改变谱面解码精度。固定 RANDOM 种子不与街机兼容。

## 数据与 SDK 单独更新

页面需要按上面的 `npm run build` 完整构建。以下脚本仅更新 SDK 和静态数据，不编译 React 页面：

```powershell
..\runtime\node.exe build.cjs
# 只复制五个 SDK 模块与 example.html，不复制数据
..\runtime\node.exe build.cjs --code-only
```

`build.cjs` 从主项目读取导出数据，生成静态索引并复制 gzip 歌曲包，不携带原始 `.1`、HDD 文件、离线提取依赖或 Node 运行时。`--code-only` 保留已有数据；只分发 SDK 时，请复制上述五个模块到单独目录。

HDD 的 IFS 解包属于一次性的离线数据构建步骤。当前项目未发布到 npm 或互联网，`package.json` 标记 private。

## 谱面六维雷达

Lane mapping 右侧为 IIDXLab 自定义六维雷达，小屏纵向排列。数值是固定标尺的 0–100 分析指标，不是 KONAMI 官方 NOTES RADAR，也不是难度等级或曲库百分位；超过参照值时截断到 100。悬停下方指标可查看计算定义。

- NOTES：平均 NPS / 20；DP 参照值 40。
- PEAK：滚动 1 秒 Peak Notes / 40；DP 参照值 80。
- SCRATCH：Scratch 每秒数量 / 5；DP 参照值 10。
- SOF-LAN：Note 有效时间内相邻 BPM 倍率的绝对 log₂ 之和 / 4；相同 BPM 不增加。
- CHARGE：Long Notes 数量占有效 Notes 的比例 / 25%，不含 Long Note End。
- CHORD：同一侧同一时间至少两个 Note 所包含的 Notes 占比 / 80%，包含 Scratch；DP 两侧单独分组。

六项比率乘 100 后显示一位小数，使用当前变换后的谱面，Hi-Speed 与 NPS interval 不影响雷达。公式位于 src/radar.mjs，可替换为经过验证的官方算法或曲库校准版本。
