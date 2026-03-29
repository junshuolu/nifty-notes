# Project Review

## 当前项目状态

`Nifty Notes` 目前是一个已经可部署、可演示、可基础试用的双谱表钢琴作曲器前端原型。

当前已经具备：

- 双谱表点选录入（高音 + 低音谱号）
- 和弦输入与和弦编辑
- 拍号切换：`4/4`、`3/4`、`2/4`、`6/8`、`7/8`、`9/8`
- 自定义拍号（分子 / 分母 / 分组）
- 附点
- 临时记号（升号 ♯、降号 ♭、还原号 ♮）
- 奏法记号、装饰音、力度记号、歌词
- 调号切换
- 小节级 tempo mark
- 默认空白谱面保持四分休止符骨架，只有实际写入的那一拍会继续细分
- 两击式插入 + 水滴图标预览
- 内置致爱丽丝示范曲谱（用户进入即可播放）
- Demo / Clear 按钮
- useMemo 性能缓存
- 回放（含临时记号半音处理）
- Tie 与 Slur
- 谱面内标题、副标题与署名编辑
- 静态部署

线上演示地址：

```text
http://8.210.93.101:3001
```

客户原网站：

```text
https://www.niftynotes.com.au/
```

## 技术架构

- **框架**: React + Vite (TypeScript)
- **乐谱渲染**: VexFlow v5（SVG 方式）
- **音频播放**: Tone.js（钢琴采样 + 即时预览音）
- **数据模型**: `MeasureData[]`，每个 measure 包含独立的 `trebleItems` 和 `bassItems`
- **布局**: 每个 beat / group 按实际节奏密度动态扩宽，高音低音谱表各自独立排布
- **状态管理**: React useState，通过集中更新 measures 驱动渲染
- **性能**: `buildSystems` 等通过 `useMemo` 缓存，防止无限重渲染
- **拍号模型**: 通过 `parseTimeSignature(...)` 统一解析分子、分母、分组和 subdivision 总量

## 关键文件

| 文件 | 职责 |
|------|------|
| `src/App.tsx` | 主界面、交互逻辑、toolbar tabs、score-front 热点、VexFlow 渲染、播放控制 |
| `src/App.css` | 页面样式、左侧固定栏、右侧滚动区、toolbar、popover、谱面交互样式 |
| `src/composer/constants.ts` | 类型定义、常量、音域、拍号、调号、默认配置 |
| `src/composer/score.ts` | 音高映射、时值换算、吸附、播放片段、拍号分组、布局系统 |
| `src/composer/CursorPreview.tsx` | 鼠标悬停音符预览 |
| `src/composer/furElise.ts` | 致爱丽丝示范曲谱数据（25小节） |

## 这一轮解决的问题

### 1. 休止符视觉位置

问题：
- 休止符在每个 bar 里看起来偏右，读谱不自然

处理：
- 对休止符做了单独的横向偏移，让它在固定网格上略微向左

### 2. 点击后声音延迟

问题：
- 第一次点击音符时，钢琴采样加载导致预览音明显延迟

处理：
- 点击插入时先给一个即时预览音
- 同时在后台继续加载钢琴采样
- 之后正式播放仍然使用钢琴音色

### 3. 点到的音和落下的音不一致

问题：
- 客户反馈：点 `B4` 容易落成 `A4`
- 鼠标悬停和实际插入不够直观

处理：
- 修正高音谱表和低音谱表的顶部基准线映射
- 现在谱面点击、预览标签、实际落点三者保持一致

### 4. Tempo / Metronome

处理：
- 把右上角 Tempo 改成可点击的设置面板
- 支持直接调 BPM
- 支持 Metronome On / Off

### 5. 播放轨迹不明显

处理：
- 新增贯穿高音和低音谱表的竖向播放线

### 6. 占位休止符不应该整小节预铺满

处理：
- 占位休止符重新收回到默认四分骨架
- 只有真正写入内容的那一拍才会继续细分替换
- 每个 bar 的渲染互相隔离

### 7. 末尾十六分音符和 Half 预览对位

处理：
- 按每个 beat 的真实节奏密度扩宽
- 高音低音谱表各自独立排布
- 悬停预览和真实符号统一边界估算

### 8. 当前 beat 的占位休止符渐进细分

处理：
- `8th` 空拍位先显示两个八分休止符
- `16th` 空拍位先显示 `16th + 16th + 8th`
- 高音低音的 placeholder focus 分开处理

### 9. 插入指示器改为悬停高亮加水滴图标

问题：
- 之前的圆圈加 Insert here 标签浮层视觉上不直观
- 两步操作流程不符合直觉

处理：
- 改为鼠标悬停即高亮：滑过休止符时该休止符自动变蓝
- 在高亮休止符下方显示蓝色水滴图标
- 第一次点击启动预插入，第二次点击真正插入音符
- 可以在任意位置自由插入

### 10. useMemo 性能缓存

处理：
- 对 `buildSystems`、`getMeasureSubdivisions`、`getBeatsPerMeasure` 使用 `useMemo` 缓存
- 消除了无意义的重渲染循环和页面卡死

### 11. 临时记号（Accidentals）

处理：
- 新增升号 ♯、降号 ♭、还原号 ♮ 三个 toggle 按钮
- `NoteItem` 新增 `accidentals` 字段存储每个音高的临时记号
- VexFlow 渲染时通过 `Accidental` modifier 显示符号
- Tone.js 播放时按半音正确处理
- `createVisualNote` / `insertAtPosition` / `toTonePitch` / `getPitchLabel` 全链路支持

### 12. 致爱丽丝示范曲谱

处理：
- 新增 `furElise.ts`，包含贝多芬致爱丽丝 A 主题 + B 段过渡共 25 小节
- 原曲 3/8 拍用 3/4 拍等效编码（音值倍增），72 BPM
- 高音部包含旋律（含 D♯、G♯ 临时记号），低音部包含和弦伴奏
- 用户进入网站即默认加载，可直接 Play 试听
- 新增 Demo 按钮（重新加载）和 Clear 按钮（清空所有音符）

### 13. 左侧说明栏与右侧作曲区分离

问题：
- 底部状态栏信息量增长后，不适合继续放在谱面下方

处理：
- 左侧改成固定说明与状态栏
- 右侧改成独立滚动的作曲区域
- 左侧会根据当前 tab、当前符号和当前选中音符切换说明

### 14. toolbar 改为 tab 化结构

处理：
- 顶部工具区改为 `Notes / Articulations / Ornaments / Dynamics / Measures / Text`
- 各类记号不再混在一个区域里
- `Articulations`、`Ornaments`、`Dynamics`、`Text` 都有独立入口和说明卡片

### 15. 谱面内部标题区

处理：
- 在谱面上方新增可直接编辑的标题区
- 支持标题、副标题、Composer、Lyricist、Arranger
- 不再需要额外弹窗编辑这些元信息

### 16. 和弦编辑逻辑修正

问题：
- 为了防止误插入，早期修正一度把和弦入口挡掉了

处理：
- 第一次点击已有音符：进入选中态
- 在已选中的同拍位再点其它音高：加入和弦
- `Shift + Click` 和弦中的某个音：移除该音

### 17. 调号、拍号与 score-front 热点

处理：
- 在谱面前导区新增 `Key Signature` 和 `Time Signature` 热点
- 点击后直接弹出对应 picker
- 弹框定位改为按热点坐标对齐，不再明显偏移

### 18. 自定义拍号与 grouped meter

处理：
- `Time Signature` 不再只是 `4/4 / 3/4 / 2/4` 三个固定按钮
- 支持输入 Numerator、Denominator 和 Grouping
- 默认支持 `6/8`、`7/8`、`9/8`
- `6/8` 按 `3+3`
- `9/8` 按 `3+3+3`
- `7/8` 按 `2+2+3`
- grouped meter 会影响 placeholder rest、beam grouping、measure capacity 和播放时间线

### 19. 切换拍号不再简单清空一切

处理：
- 改拍号后会尽量保留还能放进新小节长度里的内容
- 只移除超出新容量的音符和休止符
- 后续 placeholder rest 会按新拍号重算

### 20. VexFlow odd meter 渲染稳定性

问题：
- 切换到 `7/8` 等不规则拍号时，会出现 `IncompleteVoice`

处理：
- 对当前 app 自己管理 grid 的 voice 改用 `Voice.Mode.SOFT`
- 避免 odd meter 切换时整页渲染崩溃

## 这一轮顺手统一的地方

- `Duration` 改为 `Note Value`
- `Meter` 改为 `Time Signature`

## 目前仍然存在的限制

- 暂时没有保存、导出和账号系统
- 调号不会自动重写已有音符的临时记号
- `Slur` 目前限制在同一 staff、同一系统内
- `7/8` 等不规则拍号已支持自定义分组，但还没有做成快捷预设按钮
- 第一次完整播放如果钢琴采样尚未准备好，仍然可能先经历一次加载
