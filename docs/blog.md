# Blog

Blog 技术文章存放在 `_blog` Collection 中。

## 文章与附件要求

文章和对应附件统一放在 `_blog` 目录下，按相同名称成对存放：

```text
_blog/
├── yyyy-mm-dd-article-slug.md
└── yyyy-mm-dd-article-slug.assets/
    └── image.png
```

1. 文章文件名必须使用 `yyyy-mm-dd-title.md` 格式。日期前缀不会进入文章公开地址。例如 `_blog/2026-08-20-example.md` 的标题为 `Example` 时，输出地址为 `/blog/example/`。
2. Front Matter 的 `date` 字段应与文件名前缀中的日期保持一致。
3. 文章附件放在与文章同名的 `_blog/yyyy-mm-dd-title.assets/` 目录中，通过 `/blog/yyyy-mm-dd-article-slug.assets/image.png` 引用附件。
4. 附件使用 `/blog/yyyy-mm-dd-title.assets/...` 的站点绝对路径引用。
5. 草稿设置 `published: false`，需要时使用 `jekyll serve --unpublished` 预览。
6. 附件不要添加 YAML Front Matter，否则 Jekyll 可能把它识别成 Collection 文档。

## Front Matter 要求

文章的基本 Front Matter：

```yaml
---
title: Example
description: 文章摘要
kicker: Blog · 技术文档
date: 2026-08-20
---
```

`layout` 由 Blog Collection 的默认配置提供，无需在每篇文章中重复填写。

## GitHub 风格提示块

Blog 文章支持 GitHub 风格提示块，推荐让类型标记独占第一行：

```markdown
> [!NOTE]
>
> 提示内容，支持 **Markdown**、链接、列表和公式。
```

可用类型及颜色为：`NOTE`（蓝色）、`TIP`（绿色）、`IMPORTANT`（紫色）、`WARNING`（黄色）、`CAUTION`（红色）。紫色提示也兼容 `INFORMATION` 和 `IMFORMATION`，并统一显示为 `Important`。标记与正文同行的写法（如 `> [!WARNING]警告内容`）同样可以渲染。
