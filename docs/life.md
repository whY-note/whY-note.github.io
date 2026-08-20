# Life

> [!IMPORTANT]
>
> Life 主要用于存放关于旅游随笔、生活感悟等文章。

## 项目结构

Life 的源码分布如下：

- `_life`: Life Markdown 文章 Collection
- `_layouts/life_article.html`: Life 文章布局入口
- `_layouts/article.html`: Life 与未来 Blog 共用的文章基础布局
- `assets/css/article.css`: 文章排版和主题适配
- `assets/js/article.js`: 目录与阅读进度交互
- `_life/yyyy-mm-dd-title.assets/`: 与 Life 文章同名的附件目录
- `life/index.html`: Life Room 入口页

## 文章与附件要求

文章和对应附件统一放在 `_life` 目录下，按相同名称成对存放：

```text
_life/
├── yyyy-mm-dd-title.md
└── yyyy-mm-dd-title.assets/
    └── image.png
```

1. 文件名必须使用 `yyyy-mm-dd-title.md` 格式。日期前缀仅用于源文件管理，**对应网址不包含日期**，例如 `_life/2026-08-19-kl-divergence.md` 输出到 `/life/kl-divergence/`。
2. Front Matter 的 `date` 字段应与文件名前缀中的日期保持一致。
3. 图片放在与文章同名的 `_life/yyyy-mm-dd-title.assets/` 文件夹内，通过 `/life/yyyy-mm-dd-title.assets/image.png` 引用附件。
4. 目录自动显示二至四级标题；五级和六级标题仍可使用，但不会进入目录。
5. 草稿设置 `published: false`，需要时使用 `jekyll serve --unpublished` 预览。
6. 附件不要添加 YAML Front Matter，否则 Jekyll 可能把它识别成 Collection 文档。

## Front Matter 要求

文章使用以下 Front Matter 接入 Life 文章模板：

```yaml
---
title: 文章标题
description: 文章摘要
kicker: Life · 随笔
date: 2026-08-19
math: true
---
```

其中 `title` 为必填项；只有文章需要数学公式时才设置 `math: true`。`layout` 由 Life Collection 默认指定，不需要在每篇文章中重复填写。正文直接写在 Front Matter 后，模板会自动注入正文并根据二至四级标题生成目录。

## GitHub 风格提示块

Life 文章支持 GitHub 风格提示块，推荐让类型标记独占第一行：

```markdown
> [!NOTE]
>
> 提示内容，支持 **Markdown**、链接、列表和公式。
```

可用类型及颜色为：`NOTE`（蓝色）、`TIP`（绿色）、`IMPORTANT`（紫色）、`WARNING`（黄色）、`CAUTION`（红色）。紫色提示也兼容 `INFORMATION` 和 `IMFORMATION`，并统一显示为 `Important`。标记与正文同行的写法（如 `> [!WARNING]警告内容`）同样可以渲染。


## 开发计划

- [x] 制作文章的模版
- [ ] 制作life的总览，展示所有在life目录下的文章（按时间顺序）
- [ ] 引入“房间”，通过其中的超链接跳转到不同内容

---
(以下为AI开发Room的文档)
## Life Room

This folder contains a standalone interactive room page inspired by the fixed-coordinate room implementation in `lnxu/docs/moodboard.html`.

## Preview

From the repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/life/`.

## Configure links

Edit `ROOM_LINKS` at the top of `script.js`:

```js
const ROOM_LINKS = {
  worldMap: "#",
  notes: "#",
  travelAlbum: "#",
  reflection: "#",
  music: "#"
};
```

Replace each `#` with the corresponding internal or external URL.
