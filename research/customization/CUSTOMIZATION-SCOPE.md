# 自定义菜单完整范围（按用户截图）

2026-10-27。此表替代“只研究 Frame / Turntable / Qpro”的狭窄范围。主目标是网页中即时预览整套自定义配置，仍维持离线转换、运行时不依赖 HDD。

下表数量为本机 LDJ-34 graphic 根目录的匹配 IFS 包数，不代表可选样式数量：其中含长度/厚度、语言等变体；也没有声称本轮已解包整套素材。样本检查结果保存在生成的 expanded-inventory.json。

| 截图项目 | 本地证据 / 资源候选 | 网页预览要求 | 本轮验证状态 |
|---|---|---|---|
| Frame | gmframe / basic_frame，上一轮共递归找到 50 包 | 完整场景、SP/DP、1P/2P、动画和遮罩 | ZINRAI 纹理已解包，完整场景未还原 |
| Turntable Decal | turn00–45，46 包 | 贴花、旋转、锚点、底盘遮挡 | 46 项切换与旋转已验证 |
| Note Burst | expNN，27 包；exp00 样本 9 张纹理，含 AFP 项 | 判定触发、连击、透明混合、时序 | 样本纹理已解包；动画未还原 |
| SUDDEN+ Cover | laneNNN 基础命名匹配 346 包；lane 前缀总数还含其他变体 | 上遮挡、裁剪、位置与可视高度 | lane000 样本已解包；菜单 ID 映射待核对 |
| Lift Cover | lane 类资源为候选，尚未确认具体菜单映射 | 下遮挡、判定线位置、与 SUDDEN+ 叠加 | 未验证所选项对应资源，不另虚构专用包 |
| Note Skin | notesNN 及变体，45 包；样本 4 张纹理 | 白键/黑键/Scratch、下落位置与厚度 | notes00 样本已解包 |
| Charge Note Skin | notes_cnNN 及变体，44 包；样本 43 张纹理 | CN 起点、身体、终点及伸缩规则 | notes_cn00 样本已解包 |
| Full Combo Effect | fcomboNN，25 包；样本 19 张纹理，含 AFP 项 | FULL COMBO 事件、全屏层、单次重播 | fcombo00 样本已解包；动画未还原 |
| Note Beam | beamNN 及变体，60 包；样本 3 张纹理，含 AFP 项 | Key Down/Up、按住、淡出、长度 | beam00 样本已解包；时序未还原 |
| Judge Font | judgeNN，21 包；样本 47 张纹理 | 判定类型、FAST/SLOW、Combo 数字、缩放 | judge00 字形纹理已解包 |
| Pacemaker Skin | 1/graph.ifs 有 gr_gt_pacemaker；不能仅凭此认定其为 ANEMONE 皮肤 | 目标分数、差分与图形状态 | 发现相关对象；完整皮肤包/ID 映射待查 |
| Breaking News | 1/common.ifs 有 2dx_news 对象；1/sub_premium_area.ifs 有 news_* 对象 | 开关、示例消息、滚动和区域遮挡 | 成员名已验证，尚未解出完整显示逻辑 |
| Premium Area Skin | sub_customize_panelNNN 及语言变体，24 包；样本 38 张纹理，含 AFP 项 | 独立副屏布局、Panel 分层与按钮状态 | sub_customize_panel000 样本已解包 |
| Premium Area Background | sub_customize_bgNNN，119 包；info/0、1 中有对应 XML | 背景、缩放、亮度和上层 Panel 合成 | bg000 样本已解包；ID 映射需解析 XML |
| Concentration Mode Background | 先复用上述背景目录作为候选；不能当作另一套 119 项 | Concentration 状态下独立背景、亮度与遮挡 | 待验证与背景目录的实际绑定 |
| Entry Card Background | entry_cardNNN，52 包；样本 2 张纹理 | 登录/退出玩家卡、文字与 Qpro 等上层元素 | entry_card000 样本已解包 |
| First Note Preview | 菜单参数，不应先假定有独立素材包 | 首 Note 预览的开关/时机/位置与当前 Skin | 参数含义及具体状态机仍需核对 |
| Disable HCN Colors | 参数；本机另有 notes_hcnNN 及变体 44 包，样本 43 张纹理 | HCN 颜色模式与 Charge Note Skin 联动 | HCN 纹理已解包；开关语义和映射待核对 |
| Effector Preset | 音效参数，与静态图形素材分开 | 当前预设名称；若扩展试听需 Web Audio 与 DSP 参数 | 本轮未解析 DSP；不能把自拟效果标称实机一致 |
| Qpro / お供クプロ（截图以外的原始需求） | qp_* 部件、主控时间轴、背景、部件 ID | 完整换装、背景、动作/表情及层级 | 五类样本已解包，完整角色仍待合成验证 |

注：表中“含 AFP 项”来自成员路径统计，可能包含清单文件，不等同于动画数量。PNG 数量为该样本中的逻辑纹理数。

## 不应做成一张只切背景图的预览

需要至少三种独立场景，共用一份配置：

1. **Playfield**：Frame、Turntable、Burst、SUDDEN+/Lift、Notes/CN/HCN、Beam、Judge、Pacemaker、First Note Preview。具备播放/暂停、进度、SP/DP、1P/2P，以及手动触发 Key Down/Up、判定、FULL COMBO 的测试入口。
2. **Premium Area**：Skin、普通/Concentration 背景、Breaking News、亮度及显示状态。副屏布局不能直接套用主屏坐标。
3. **Entry / Qpro**：Entry Card 背景、玩家信息、Qpro/伴随 Qpro 换装与动作。

Effector Preset 放进音频设置区；未实现试听前只保存参数，不误导为已经模拟游戏音效。所有配置只作用于本地预览；写回游戏或远端账户不在当前范围。

## 索引和渲染数据要分开

索引记录：类别、真实 ID、显示名、源包、语言、资源版本、内容哈希、支持状态。渲染清单记录：纹理、UV、局部坐标、锚点、层级、混合、裁剪、状态名、帧率、触发器。配置中对 Cover、Note Skin、CN Skin、HCN Colors 等分别保存，不能用一个 theme 字段替代。

截图中的 DISTORTED、PASTEL、HAPPY SKY、SMART、ANEMONE 等显示名尚未完成到真实资源 ID 的映射；不会根据包的字母顺序或猜测硬编码。参数长度与厚度已在 beam00_long / short / veryshort、notes00_long / short / veryshort 等文件名得到线索，但具体游戏像素值仍需验证。

## 独立验证页已扩展

[demo/index.html](demo/index.html) 新增“其他自定义项目”区域，提供上述 11 类代表包中的 210 张纹理：Burst、Cover、普通 Notes、CN、HCN、FULL COMBO、Beam、Judge、Entry Card、Premium 背景和 Panel。

它们是原始纹理检查，**尚未实现对应的完整实时特效**，也不是截图中指定样式的最终对应结果。所有素材留在 Dev，运行时不读取 HDD。重建方法沿用 README 的 build_demo.py。

## 官方公开资料交叉核对

- [IIDX 33 自定义功能增强](https://p.eagate.573.jp/game/2dx/33/howto/new/customize.html)：Entry Card 背景、伴随 Qpro、Charge Notes 设计、HCN 颜色与 Concentration 背景等。
- [IIDX 33 Premium Area](https://p.eagate.573.jp/game/2dx/33/howto/lightning_model/premium.html)：Premium Area 与自定义功能场景。
- [IIDX 32 Premium Area](https://p.eagate.573.jp/game/2dx/32/howto/lightning_model/premium.html)：Lift 自定义、Beam 长度与 Note 厚度等参数。

上述资料用于核对功能范围，不代表已经确认 34 代各包的资源 ID、动画或完整实机行为。
