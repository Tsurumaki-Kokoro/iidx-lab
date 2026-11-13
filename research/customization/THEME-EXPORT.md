# Theme 资源与设置编号

2026-10-28。只读 LDJ-33、LDJ-34 及用户指定的 `F:/tools/asphyxia-core-win-x64/plugins/iidx@asphyxia`；没有改动游戏、插件或档案。

## 提取结果

952 个按 SHA-256 去重的相关 IFS 包，25,529 张原始 PNG，解包失败 0。网页再次按图像内容去重，保留 10,763 张原分辨率 PNG。包含 33/34、0/1 子目录、语言、Note 厚度、Beam 长度、动画包纹理等变体，不再只保留代表样本。

提取范围由 extract_theme.py 的 PAT 明确列出：Frame、Decal、Burst、Cover、Notes/CN/HCN、Full Combo、Beam、Judge、Entry Card、Premium Background/Panel，及相关 graph/common/sub_premium_area/sub_card 共享 UI。AFP/GE2D 等原始成员保留在 raw；网页仍是独立纹理预览，尚未还原全部动画或 DSP。

| 项目根下的路径 | 内容 |
|---|---|
| theme-data/raw/ | 完整解包成员 |
| theme-data/manifest.json | 源版本、路径、哈希、纹理 |
| theme-data/name-evidence.json | 本地插件页哈希、名称来源表与原标签 |
| theme-data/web/catalog.json | ID、字段、名称、证据、变体、纹理索引 |
| theme-data/web/setting-ids.csv | Excel 可打开的编号清单 |
| theme-data/web/assets/ | 全部去重网页 PNG |
| frontend/dist/theme/ | 独立部署资源 |

## 设置值与名称

`idVerified` 与 `nameVerified` 分别记录。只有已核对编号才启用复制和单项 JSON 导出；候选 ID、旧代或共享资源有明确标记。名称表已收录不等于每项经过实机截图核验；找不到名称时显示“名称待核实”。

本地插件 handlers/webui.ts 把值直接转为 Number，33pcget.pug 直接发送 pskin/vskin，不按显示名称重新映射。Turntable 连续资源表与完整社区设置表可交叉核对。SUDDEN+、Lift、Pacemaker 独立保存字段，复用 Cover 资源池；共享 graph 不伪造独立皮肤编号。

Premium Skin/Background 优先使用对应游戏版本 data/info/0、1 下的 sub_customize_panel.xml 和 sub_customize_bg.xml，例如默认 ID 0 指向 bg001，不能机械取文件后缀。HCN 跟随 cn_color，颜色开关为 disable_hcn_color。First Note Preview、HCN 开关、Effector 是参数，不伪造独立图片。

## 你的本地插件存在的冲突

Turntable 下拉表只到 26，并有这些错位标签：

| 值 | 本地插件标签 | 核对的素材 |
|---:|---|---|
| 22 | CastHour | BEMANI PRO LEAGUE |
| 23 | RESIDENT | BPL ROUND1 |
| 24 | いちご | BPL APINA VRAMeS |
| 25 | EPOLIS | BPL SILKHAT |
| 26 | Pinky Crush | BPL レジャーランド |

实际 CastHour=30、RESIDENT=41、EPOLIS=43、Pinky Crush=44、Sparkle Shower=45、いちご=29。页面在冲突项显示本地原标签。正确的大编号未收录在你的插件菜单中，复制数字不会自动补齐该插件的下拉选项。本次没有写入氧无服务；JSON 是可审查的字段和值。

## 仍待核实

- 非默认 Frame 的真实可选 ID：99 条版本/资源变体全部保留；Default=0，其他项禁止直接复制，未把 gmframe 的代目数字或文件顺序当作设置值。
- 部分新增 Premium Panel/Background、Entry Card 名称未收录在可用名称表。XML 已确认的 ID 仍可复制。
- 无设置表或有效 XML 对应的新资源只列候选编号，不宣称可直接设置。
- 全量提取指上述匹配范围内的原始资源，不代表所有名称、编号、动画行为都已完全还原。

名称来源：用户本地插件，以及 [Asphyxia 社区插件](https://github.com/asphyxia-core/plugins)、[Ryu7w7 插件](https://github.com/Ryu7w7/asphyxia_plugins)。后者补充 BPL Turntable、背景、Entry 名称；其 Frame 列表与本机版本对应未证实，没有直接套用。

## 重建

```powershell
python research/customization/extract_theme.py
python research/customization/pack_theme.py
cd frontend
npm run build
node qa-theme.cjs
```

Python 使用现有 vendor/ifstools 与 Pillow。验证覆盖 20 类、设置编号、插件冲突、剪贴板与 JSON、XML 默认映射、33/34、移动端和本地请求。图像按需加载、纹理分页，运行成品不需要 HDD 或 F 盘插件。
