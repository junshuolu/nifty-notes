# Nifty Notes

`Nifty Notes` 是一个基于 `React + Vite + VexFlow + Tone.js` 的前端钢琴大谱表编辑器。
它强调“直接点谱面就能写谱”的交互方式，适合快速验证双谱表录入、节拍切换、和弦编辑和播放。

## 当前版本功能

- 双谱表录入：高音谱号 + 低音谱号
- 音域范围：`C2` 到 `G5` 的 26 个自然音
- 音符与休止符录入
- `Dot` 附点功能：先选时值，再点 `Dot`
- 和弦录入：同一拍位重复点击可加音或减音
- 拍号切换：`4/4`、`3/4`、`2/4`
- 八分音符自动连梁
- 相同单音或相同和弦之间的 tie
- Tone.js 钢琴音源播放
- 纯前端静态部署，无需后端

## 技术栈

- `React 19`
- `TypeScript`
- `Vite`
- `VexFlow`
- `Tone.js`

## 环境要求

- `Node.js 20+` 推荐
- `npm 10+` 推荐

## 本地启动

进入 `frontend/composer` 目录后执行：

```bash
npm install
npm run dev
```

启动后，Vite 会输出本地访问地址，通常是：

```bash
http://localhost:5173
```

## 如何使用

### 1. 选择时值

顶部工具栏里先选一个基础时值：

- Whole
- Half
- Quarter
- Eighth
- Sixteenth

如果要插入附点音符或附点休止符，再点一次 `Dot`。

### 2. 选择操作模式

工具栏里的模式含义如下：

- `Insert Note`：插入音符
- `Insert Rest`：插入休止符
- `Tie`：给已有音符或和弦添加 / 取消 tie
- `Erase`：删除当前位置的整个音符、和弦或休止符

### 3. 在谱表中点击

- `Insert Note` 模式下，直接点击高音谱表或低音谱表即可插入音符
- 在同一拍位再次点击，可把音加进同一个和弦，或把该音从和弦里移除
- `Insert Rest` 模式下，点击任意拍位会插入当前时值的休止符

### 4. 切换拍号

可直接切换：

- `4/4`
- `3/4`
- `2/4`

注意：

- 切换拍号会保留 bar 数量
- 但会清空当前谱面内容

### 5. 播放与 bar 管理

- 点击 `Play` 播放当前谱面
- 再点一次可停止
- `+ Bar` 增加小节
- `- Bar` 删除最后一个小节

## 初始空白界面说明

在还没有插入任何音符之前，谱面会以更简洁的默认状态显示：

- 不显示大标题区
- 直接显示可编辑的大谱表
- 用默认 rest 作为空白拍位参考

这样更接近真正开始写谱前的初始界面。

## 构建

```bash
npm run build
```

构建输出目录：

```bash
dist/
```

如果只想本地预览构建结果，可继续执行：

```bash
npm run preview
```

## 部署到服务器

本项目目前是纯前端静态站点，可以直接部署到任意能托管静态文件的服务器。

### 步骤

1. 本地执行构建：

```bash
npm run build
```

2. 将 `dist/` 下的全部文件上传到服务器站点目录
3. 确保服务器把 `index.html` 作为入口文件提供访问

### 适用场景

- Nginx 静态站点
- Apache 静态站点
- 宝塔静态网站
- CDN / 对象存储静态托管

### 注意事项

- 当前默认按根路径部署处理
- 如果服务器要求部署到子路径，例如 `/nifty-notes/`，需要再调整 `vite.config.ts` 里的 `base`

## 常用命令

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## 关键文件

- `src/App.tsx`：主界面、交互逻辑、谱面渲染调度
- `src/App.css`：页面样式
- `src/composer/constants.ts`：常量、类型、初始数据
- `src/composer/score.ts`：音符规则、拍号逻辑、播放数据、VexFlow 辅助逻辑
- `src/composer/CursorPreview.tsx`：鼠标悬停预览

## 已知限制

- 当前只支持自然音，不支持升降记号
- 拍号切换不会自动重排原有音符，而是直接清空谱面
- 没有保存、导出、账号系统或后端存储

## 版本记录

本版本相对上一个版本的变化见：

- `CHANGELOG.md`
