# Nifty Notes

`Nifty Notes` 是一个面向儿童音乐学习场景的双谱表钢琴作曲器原型。它强调“直接点五线谱就能写”，适合快速演示音符录入、节拍切换、和弦编辑、播放和课堂试用。

## 当前功能

- 双谱表录入：高音谱号 + 低音谱号
- 音域：自然音 `C2-G5`
- 音符与休止符录入
- `Dot` 附点功能
- 和弦输入：同一拍位重复点击可加音或减音
- 拍号切换：`4/4`、`3/4`、`2/4`
- Tempo 调整
- Metronome 开关
- 播放轨迹竖线
- Tone.js 回放
- 纯前端静态部署

## 本地启动

进入 `frontend/composer` 后执行：

```bash
npm install
npm run dev
```

默认本地地址通常是：

```text
http://localhost:5173
```

## 如何使用

### 1. 选择 Note Value

工具栏里可以先选择基础时值：

- Whole
- Half
- Quarter
- Eighth
- Sixteenth

如果要插入附点版本，再点一次 `Dot`。

### 2. 选择操作模式

- `Insert Note`：插入音符
- `Insert Rest`：插入休止符
- `Tie`：给现有音符或和弦添加 / 取消 tie
- `Erase`：删除当前位置的整个音符、和弦或休止符

### 3. 在谱面中点击

- `Insert Note` 模式下，直接点击高音或低音谱表即可插入音符
- 在同一拍位重复点击，可把音加入同一个和弦，或从和弦里移除
- `Insert Rest` 模式下，点击任意拍位会插入当前 Note Value 的休止符

### 4. 切换 Time Signature

可直接切换：

- `4/4`
- `3/4`
- `2/4`

注意：

- 切换拍号会保留 bar 数量
- 但会清空当前谱面内容

### 5. 调整 Tempo 和 Metronome

点击右上角的 `Tempo xx BPM` 可打开设置面板：

- 拖动滑块或直接输入 BPM
- 打开或关闭 metronome

### 6. 播放与 Bar 管理

- 点击 `Play` 播放当前谱面
- 播放时会显示一条贯穿双谱表的竖向播放线
- 点击 `Stop` 可停止播放
- `+ Bar` 增加小节
- `- Bar` 删除最后一个小节

## 构建

```bash
npm run build
```

构建输出目录：

```text
dist/
```

如需本地预览构建结果：

```bash
npm run preview
```

## 静态部署

当前项目可以直接作为静态站点部署。当前线上做法是：

1. 本地构建：

```bash
npm run build
```

2. 上传 `dist/` 到服务器

3. 使用 `pm2` 托管静态目录，例如：

```bash
pm2 serve /root/nifty-notes/dist 3001 --name nifty-notes --spa
```

## 关键文件

- `src/App.tsx`：主界面、交互逻辑、VexFlow 渲染、播放控制
- `src/App.css`：页面样式
- `src/composer/constants.ts`：常量、类型、音域、拍号、默认配置
- `src/composer/score.ts`：音高映射、时值换算、吸附与播放片段生成
- `src/composer/CursorPreview.tsx`：鼠标悬停预览
- `project_review.md`：当前阶段的项目回顾

## 已知限制

- 当前只支持自然音，不支持升降记号
- 切换拍号不会自动重排原有音符，而是直接清空谱面
- 没有保存、导出、账号系统或后端存储
