# Qpro / Frame / Turntable Decal 网页预览研究

2026-10-28 更新：Theme 已从代表样本改为 952 个相关资源包的全量解包目录，并加入名称、设置 ID、插件冲突提示与待核实标记。当前结果及缺口以 [THEME-EXPORT.md](THEME-EXPORT.md) 为准。

检索与本地验证：2026-10-27。范围为现有 LDJ-33 / LDJ-34；仅只读原资源，所有输出在 Dev。未使用 LDJ-23，未改动游戏文件，未加载或执行游戏 DLL。

范围补充：按用户提供的完整自定义菜单，研究已扩展至 Burst、Cover、Notes/CN/HCN、Full Combo、Beam、Judge、Pacemaker、Premium Area、Entry Card、参数开关与 Effector。完整矩阵见 [CUSTOMIZATION-SCOPE.md](CUSTOMIZATION-SCOPE.md)，验证页也新增了 11 类代表包的 210 张纹理检查。

后续实现进度：Qpro 已完成全量提取并接入六类部件组合预览，详见 [QPRO-EXPORT.md](QPRO-EXPORT.md)。下文保留的是最初研究阶段的样本情况，不能用其“尚未组合”描述代表当前 Qpro 模块。

## 结论

可以继续维持纯前端、独立运行的产品形态。推荐将离线资源转换和网页实时组合分开：离线导出 PNG/WebP、动画层、布局及部件索引，网页使用本地静态资源即时换装、切换 Frame 和转盘。用户打开成品时不需要 HDD、Python 或游戏 DLL。

| 元素 | 已验证内容 | 完整预览还需完成 | 判断 |
|---|---|---|---|
| Turntable Decal | 46 个包可解出透明 PNG；独立页面可切换、旋转、暂停 | 与游戏底盘的中心、尺寸、前景遮挡和实际旋转机制对齐 | 最适合先接入正式应用 |
| Frame | ZINRAI 样本解出 153 张 PNG，另含 AFP/BSI/GE2D | 恢复场景布局、裁剪、状态与动画；核对 SP/DP、1P/2P | 静态近似容易，精确动画需要转换层 |
| Qpro | AEON 五类包成功解出 22 张纹理及部分动画数据 | 部件 ID、前后层、肢体变换、表情、动作、特效、时间轴 | 可做；不能直接按文件名叠加 PNG 当作完整角色 |

当前正式 React 页面未改动。验证页属于研究原型。

## 可直接打开的验证页

打开 [demo/index.html](demo/index.html)，也可双击该文件。所有样本都复制到了 demo/assets，catalog 内嵌到 HTML，因此不需要 fetch、HTTP 服务或原 HDD。浏览器验证通过：46 个 Decal、转动/暂停、Qpro 表情纹理、Frame 纹理切换、无网络请求、390px 页面无横向溢出。

原型包含：

- 46 个实际 Turntable Decal；旋转只演示浏览器能力，不代表游戏转速。
- AEON 的 body / face / hair / hand / head 原始纹理检查。
- ZINRAI Frame 的 153 张纹理检查。

**Frame 区域不是完整游戏画面，Qpro 区域不是组装后的角色，也未验证 Qpro 动画播放。** 这些限制在页面中直接标出。

重建样本：

```powershell
cd K:\HDD\Dev\IIDXLab
# 使用项目既有的 vendor/ifstools；Python 需要匹配这些依赖
python research/customization/build_demo.py --game-root K:\HDD\LDJ-34
```

脚本当前固定取 gmframe34 和 AEON 样本，适用于本次 34 代验证。可从另一个目录取资源，但不能把它当作所有代目的通用导出器。删除目标 samples 子目录后才能重新解包该样本，否则复用已有缓存。

## 本地资源盘点

按 graphic 目录递归统计 IFS 文件；这是文件数量，不是游戏可选项目数量，Frame 含 0/1 等变体，qp_ 包也含控制包。

| 资源包 | LDJ-33 | LDJ-34 |
|---|---:|---:|
| qp_*.ifs | 2,333 / 362.8 MiB | 2,388 / 370.7 MiB |
| gmframe* / basic_frame* | 49 / 311.4 MiB | 50 / 347.8 MiB |
| turnNN.ifs | 46 / 约 0.2 MiB | 46 / 约 0.2 MiB |

详细路径在生成的 inventory.json。文件名相同不意味着 33/34 内容相同；正式导出应记录 SHA-256 与代目，按内容去重，不能直接覆盖。

本次读取的实际样本：

- `LDJ-34/data/graphic/turn00.ifs`、`turn45.ifs`：各有纹理表和单张透明 Decal，没有在成员列表里看到 AFP 时间轴。
- `gmframe34.ifs`：成员树 608 项，当前解包实际生成 604 个文件，其中 153 张 PNG；逻辑图集项与实际写出的文件不必一一对应。
- `qp_aeon_{body,face,hair,hand,head}.ifs`：可见前/后发、身体、上下肢、左右手及多种表情纹理。部分包仅有纹理，另一些含 AFP/BSI/GE2D。
- Frame 的 `center_frame_sp.png` 解包后尺寸为 1922×1082，提示正式布局应使用 texturelist 的 uvrect，而非把含边缘 padding 的 PNG 尺寸直接当作游戏画布尺寸。

## 可复用的开源工作

### ifstools：已在本机验证

[mon/ifstools](https://github.com/mon/ifstools) 支持 IFS 解包、纹理转 PNG、二进制 XML 转文本，保留 AFP/BSI/GEO 命名。本机既有版本已成功读取上述样本，可直接作为离线导出第一步。它解决资源容器与纹理，不等于完整动画播放器。

### 573Renderer：最值得验证的 Qpro 转换候选

[Radioo/573Renderer](https://github.com/Radioo/573Renderer) 声明支持 IIDX 33，可用原游戏引擎离线渲染并导出 Qpro 网页素材；不是浏览器库。作者也明确说明项目为实验性实现，不能仅凭 README 推定本机资源兼容。

[Qpro 专项文档](https://github.com/Radioo/573Renderer/blob/master/docs/qpro.md) 描述了从 DLL 静态表恢复部件 ID、共享画布、前后层与动画素材输出的方案。它提供了一条避免在 JS 中立即重写 AFP 引擎的路径，但本轮未构建、运行或比对该工具，也未验证 34 代兼容性。若采用其代码，先检查具体版本的许可证；本次只把它作为研究参考。

### bemaniutils / afptools：格式研究与纯转换参考

[DragonMinded/bemaniutils](https://github.com/DragonMinded/bemaniutils) 的 afputils 包含 TXP2、GE2D、AFP/BSI 处理及动画渲染，作者说明复杂动画兼容并不完备。其 Qpro 编辑数据库支持范围不代表支持新版 Qpro 视觉合成。

[camprevail/afptools](https://github.com/camprevail/afptools) 提供格式说明及 AFP/BSI 解码工具，可用于验证布局和变换；不应把这里的 Konami AFP 与 IBM 同名打印文档格式混用。

## 推荐架构

```text
只读 LDJ-33/34
    → IFS / 纹理导出
    → 布件索引 + 布局/时间轴验证 + 内容去重
    → 独立静态资源包
        → Vite + React 控件
        → Canvas2D / WebGL 合成与动画时钟
        → PNG 截图 / 配置 JSON
```

配置和资源索引分开。配置只存版本、稳定 asset ID、颜色参数、SP/DP、1P/2P 与所选动作；索引记录 source/hash、画布大小、透明通道约定、UV、层级、帧率、循环区间与依赖。不把包名的字母排序当作游戏中的 Qpro ID。

Qpro 不需要预渲染所有服装组合：把可替换部分导出成对齐的独立图层，网页按经过验证的层顺序组合。前/后头饰与头发要分别处理；身体含多个肢体，不是单张衣服贴图。静态换装可先完成，再扩展 neutral/attack/damage 等动作。

Frame 先选择一套资源验证完整静态组合，不根据图片名字猜坐标；随后导出时间轴、遮罩与混合方式。普通层可用 Canvas2D；特殊混合和大量动态层再评估 WebGL。原游戏 DLL 只可能用于离线转换阶段，不能作为生产网页依赖。

透明动画应验证目标浏览器的真实 alpha 解码。不要仅凭 MIME 支持判断透明 WebM/AVIF/HEVC 可用；初期静态 PNG 最稳妥，动画可保留序列帧回退。多个动画部件使用同一逻辑时钟，不能让若干独立 video 自由播放后假定长期同步。

## 实施顺序和验收

1. **正式接入 Turntable Decal**：完整 46 项索引、尺寸/锚点验证、左右侧切换、暂停/转速、配置保存与截图。原型已证明基础可行。
2. **Qpro 静态换装**：优先用 33 代验证转换工具，最少两套可混搭部件，检查头发/头饰前后层、手部镜像、背景、透明边缘和稳定 ID；之后再补 34。
3. **Frame 完整静态画面**：先一套 SP 1P，再补 2P / DP；与参考画面核对锚点、层级、UV 和遮罩。
4. **实时动作与特效**：统一时钟，覆盖不同帧率、循环、加色/乘色、遮罩和暂停/seek；记录缺失与不支持项，不静默跳过。
5. **独立交付**：移走 HDD 后仍能运行；断网打开静态服务，确认没有 DLL/本地路径请求；测长时间播放内存和切换延迟。浏览器只按需加载当前组合，不一次解码整套素材库。

本轮已完成盘点、八类样本解包、独立浏览器能力验证和路线研究。未完成完整 Qpro 动作还原、游戏 Frame 动画重放或游戏配置写回。
