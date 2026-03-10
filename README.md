# whY-note.github.io
https://whY-note.github.io


## 滚动浮现

### 实现方法
为了使文字能够在鼠标滚动时，逐渐浮现出来，
需要将你的markdown文件中的内容用
`<div> </div>` 或 `<h1> </h1>` 或 `<p> </p>` 或 ... 来包起来
然后使用
`data-aos="fade-up"`实现浮现效果。

但是，这样会使原本的markdown内容（比如：链接，加粗等）无法正常渲染，只会显示原文本。

**怎么解决？**

方法就是加上`markdown="1"`

这会告诉 Jekyll：这个 HTML 里面 继续解析 Markdown

```html
<div data-aos="fade-up" markdown="1">
 Your content
</div>
```

### 更多相关效果

关于`data-aos`,可以选择：

- "fade-up"：向上浮现
- "fade-down"：向下浮现
- "fade-left"：向左浮现
- "fade-right"：向右浮现

## TODO

- [x] 导航栏做成渐变色（仿清华的紫色变蓝色）
- [x] sidebar加图标
- [x] 左边sidebar与右边content的滚动是独立的，分开的，一边动，另一边不会动
- [ ] 解决publications不出现的问题
- [x] github,scholar的图标
- [ ] 根据academicpages，完善所含有的内容
- [x] 添加滚动渐渐出现的效果
- [x] 解决imagebar不能移动的问题 -->现在imagebar里面的图像可以左移或者右移，只需要改参数`direction`
- [ ] 添加个人logo
- [ ] 添加开头视频
- [ ] navbar加搜索

## 完成情况
- [x] sidebar
- [x] imagebar
- [ ] navbar
- [x] About me
- [ ] publications
- [ ] projects
- [ ] Blog