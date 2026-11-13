# 全量 Qpro 提取与组合预览

本次本地导出：2026-10-27。来源为用户现有 LDJ-33 / LDJ-34，仅只读游戏资源；网页成品不访问 HDD 或游戏 DLL。

## 已完成

- 33/34 全部 `qp_*.ifs` 按 SHA-256 去重，提取 **2,375 个资源包**，保留纹理、AFP/BSI、GE2D、纹理表和清单。位置：项目根 `qpro-data/raw/<sha256>/`。
- 提取 **11,141 张原始纹理**；清单另记录 **13,657 个 AFP 目录成员**，其中包括清单文件，不能等同于独立动画数。
- 从两代 `bm2dx.dll` 的静态 PE 表解析真实部件 ID，未按文件名排序伪造 ID。34 的可选目录包含全部 33 条目并增补 55 个条目。
- 生成 **2,380 个部件条目**与 **3,768 张去重网页图层**，图层统一 520×704 透明画布，清单没有缺失图层。网页资源约 84.7 MiB。

| 类别 | 条目数 |
|---|---:|
| head | 460 |
| hair | 419 |
| hand | 532 |
| body | 562 |
| face | 321 |
| qproback | 86 |

`qpro-data/manifest.json` 保留完整来源与原始成员；`qpro-data/tables.json` 为 ID 表快照；`qpro-data/audit.json` 为审计汇总。网页使用 `qpro-data/web/catalog.json` 和 layers，构建时复制到 `frontend/dist/qpro`。

背景 ID 0 在两代 ID 表中均引用不存在的 `qp_default_bg.ifs`。它作为“无背景”虚拟项处理，不用别的素材冒充；源清单的两条 missing 提示即指该默认项，没有原始 IFS 解包失败。

## 界面与功能

Qpro 模块已替换旧的单张纹理检查：

- head、hair、hand、body、face、qproback 六组 ID 输入与部件选择。
- 即时静态组合；前/后头饰、前/后发、左右手分层，支持透明背景。
- Randomize：六类随机搭配。
- Suit (Based on body)：按资源 family 精确匹配配套部件；找不到则保留当前选择并提示，不根据名字猜测错误配件。
- 保存搭配：保存至当前浏览器，下次打开恢复；不写回游戏或远端账户。
- 导出透明 PNG 和搭配 JSON。

默认采用用户参考图中的 ID：head=373、hair=306、hand=45、body=416、face=210、back=13。这六项与两代游戏 ID 表均一致。部件名称目前显示实际资源名，未虚构日文商品名称。

## 转换方式和实际限制

原始纹理直接相叠不能正确定位所有肢体。离线转换使用 [573Renderer v1.2.0](https://github.com/Radioo/573Renderer/releases/tag/v1.2.0) 的 Qpro 合成路径和用户持有的 33 引擎，得到统一坐标的 Neutral 图层。

为了只提取静态图层、避免无谓编码整段动画，`make_static_renderer.py` 借助对应 PDB 定位下载工具的函数，在**单独副本**中固定为一帧，并将同 ABI 的 still 编码入口改接现有 PNG 编码入口。补丁清单位于 `runtime/qpro-static/static-export-patches.json`，保留原始/输出 SHA-256 和修改字节。原工具和游戏 DLL 没有修改；中间输出的 .avif 后缀实际是 PNG，pack 脚本验证后改为正确 .png。

34 新增资源采用更新的 mesh/动画格式，现有 33 转换引擎无法直接完整解析。已保留这些部件的原始动画数据，并在独立 staging 目录制作 texture-only 包，利用原生 atlas fallback 生成静态兼容层；**不声称还原了其变形、动画或特效**。选中这类部件时页面标记“静态兼容”。

33 图层也是静态 Neutral 快照，不是全动作播放器。某些动态装饰在快照时刻可能处于隐藏或未展开状态。原始资源已完整提取，可继续用于后续动画实现。网页不包含离线工具、游戏引擎 DLL、PDB 或 staging 链接。

## 复现脚本

1. `extract_qpro.py`：静态读取两代 ID 表并全量解包；export-complete.json 支持复用已完成的包。
2. 下载上述指定版本转换工具和匹配 PDB，仅用于离线转换；`make_static_renderer.py` 生成单独的静态 PNG 工具副本。
3. 使用 33 游戏目录、520×704 render size，`--extract-qpro <out> --qpro-parts body,head,hair,face,hand,back` 输出到 `qpro-data/static33/qpro_assets`。
4. `prepare_qpro34_static.py`：准备独立的 34 静态兼容输入，不修改原始资源；使用 `render34-selection.txt` 的补充标签导出到 `qpro-data/static34-compat`。
5. `pack_qpro.py`：依据内容和部件 ID 复用 33 图层，补齐 34 静态层，强制核查画布和文件完整性。默认不容许缺层，`--allow-incomplete` 仅供开发诊断。
6. `frontend` 中执行 `npm run build`，静态成品携带 qpro 目录，无需前述工具与 HDD。

## 已做验证

- 全部 3,768 张网页 PNG 的格式、RGBA、520×704 尺寸与文件完整性。
- 用户参考搭配的实际组合图；六类 ID 与源表对应。
- 浏览器中六类选择、随机、配套、保存/刷新恢复、PNG 下载。
- 同时选择六类末尾的 34 项目，静态兼容组合正常显示。
- 小屏无横向溢出；所有资源从本地静态服务加载，没有远端请求。

原始素材与转换产物由 .gitignore 排除，提取与打包代码可以版本管理。没有上传到外部网站。
