# 新版 INFINITAS ALL-SCR 渲染可行性

检索日期：2026-10-27。目标为新版 INFINITAS，不混用 CS EMPRESS 等旧版规则。

## 结论

可以在纯前端实现 ALL-SCR 谱面预览，不需要在浏览器运行游戏或访问原 HDD。当前事件已有时间、SP/DP 侧、Lane 与 Long Notes 长度；小节渲染器已支持 Scratch Lane、双侧和 Hi-Speed。主要新增工作在事件变换层，而非绘图层。

若要求与当前 INFINITAS 的每一个 Note 分配完全一致，仅靠目前公开资料仍不足；不能将自行选择的时间阈值与随机算法当作实机规则。

## 官方确认

KONAMI 的 Premium Pass 功能说明将 ALL-SCR 定义为：把原谱面 Note 尽可能放到 Scratch。官方页面同时说明启用后不保存游玩结果。

来源：https://p.eagate.573.jp/game/infinitas/2/howto/premium_pass.html

官方页面没有公开分配伪代码、最小 Scratch 间隔、同刻 Note 的优先级、剩余键位的 RNG、CN/HCN/BSS/MSS 的细节。

## 社区观察，尚不能作为精确实现契约

SP 攻略 Wiki 的 INFINITAS 专节记载：部分同押与极近间隔的 Note 留在键盘；SP 剩余 Note 随机分配，DP 尽量靠近 Scratch；CN 系 Note 隐式启用 LEGACY。它将 Scratch 间隔描述为大约能到 BPM360 的 16分，即约 41.67ms，并使用推测性措辞。这不是官方确认的精确阈值。

来源：https://w.atwiki.jp/bemani2sp/pages/4662.html （ALL-SCR 专节，页面显示最后更新于 2026-03-22）

另一篇玩家日志把 CN 的处理描述为消失，和上述 LEGACY 说法不够一致。因此不能未经验证就删除整个 Long Note，或断言保留其起点。

来源：https://purotora.com/log/20260301.html （2026-03-13）

TexTage 自己的说明也明确指出其 ALL-SCR 连打容许范围与实机不同，不可将其算法直接当作 INFINITAS 的实现。

来源：https://textage.lolipop.jp/score/readme.html

## 对现有项目的实现方案

1. 在 core.mjs 增加独立的 ALL-SCR 变换；保留原事件，输出新 chart。
2. 每侧分别按时间处理 Note；同侧同刻最多生成一个 Scratch，其余 Note 留在不同键盘 Lane。不能把所有 Note 直接设成 Lane 7，否则同押会重叠消失。
3. 依据验证后的 Scratch 最小间隔决定极近 Note 是否留键盘。
4. 按新版实机验证结果处理 CN/HCN/BSS/MSS；当前统一长度事件可能不足以区分所有特殊 MSS 事件，应检测并标记数据限制。
5. SP 使用可复现 Seed 分配剩余键盘，DP 按验证后的靠 Scratch 排列策略处理；公开 Seed 不承诺兼容游戏 RNG。
6. ALL-SCR 属于随时间变化的分配，不是一张固定 7 键 permutation。Lane mapping 面板需切换成按 Lane 流量/来源分配的统计图，不能显示虚假的固定连线。
7. 统计、PNG、SVG、JSON 和离线 HTML 统一使用转换后的 chart；时间、小节、BPM、Hi-Speed 与 1P/2P 显示逻辑不变。

## 精确复现需要验证的样本

- 同侧二至八同押，以及原生 Scratch 与键盘同刻出现。
- 40/41/42/43ms 附近的连续 Note；确认与 BPM、帧率或时间量化是否相关。
- CN、HCN、BSS、MSS 各自的起点、中间点、终点处理。
- SP 剩余键位分配和 DP 两侧靠 Scratch 的确切顺序。
- 若需同 Seed 完全一致，还需验证游戏 RNG 和调用顺序。

本轮完成资料检索与本地渲染架构评估，未向页面加入未经验证却标称实机一致的 ALL-SCR 选项。
