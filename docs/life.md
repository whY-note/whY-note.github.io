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
- `life/reflection/index.html`: 感悟分类首页，按 `kicker` 自动列出文章
- `life/reflection/style.css`: 感悟分类首页样式

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

## Reflection 首页

Life Room 中“感悟”入口会跳转到 `/life/reflection/`。该页面从 `_life` Collection 自动读取文章，并按 `date` 倒序展示。

想让文章显示在 Reflection 首页，需要让文章 Front Matter 的 `kicker` 命中 `life/reflection/index.html` 中的 `allowed_kickers` 列表。当前支持：

```yaml
kicker: Life · 年终总结
```

```yaml
kicker: Life · Moment
```

```yaml
kicker: Life · Moments
```

```yaml
kicker: Life · reflection
```

以后如果新增分类，只需要把新的 `kicker` 字符串加入 `allowed_kickers`。


## World Map 旅行足迹

房间后墙地图与“内容 → 世界地图”均进入 `/life/tourism/`，也可直接访问该地址。
页面沿用本站星空／白色主题，包含城市与国家统计、交互地图、地点坐标及城市清单。
点击城市或地图标记会同步选中并定位；“显示全部”恢复全部足迹的总览。

### 添加到访城市

编辑 `_data/travel_places.yml`。目前已填写用户提供的 12 个到访地点，界面与地点名称使用英文。
地点可以是城市、地区或景区，因此统计标签使用 `Places`。山东和西藏使用地区代表点，
稻城亚丁使用景区代表点；这些坐标不代表具体游览路线。继续在列表末尾添加，例如（仅展示格式）：

```yaml
- name: Guangzhou
  name_zh: 广州
  country: China
  country_code: CN
  coordinates: [23.1291, 113.2644]

- name: Paris
  country: France
  country_code: FR
  coordinates: [48.8566, 2.3522]
```

- 每个地点填写一次；`name`、`country`、`country_code`、`coordinates` 均为必填项。
- `name`、`country` 使用英文，供列表和详情展示；中国地点另填 `name_zh`，详情区在英文地名上方显示中文名，地图浮层与标记标题显示为“中文地点名，中国”。其他国家的地点标注使用英文。底图自带地名由底图提供方决定。
- 可选 `zoom` 控制点击后的缩放级别，默认 `8`；较大的地区可用 `5` 或 `6`，景区可用 `10`。
- `country_code` 使用一致的 ISO 两位国家代码，国家数按该字段去重。
- `coordinates` 必须是数字，顺序为 **[纬度, 经度]**；纬度范围 −90 至 90，经度范围 −180 至 180。
- 城市按数据文件中的顺序展示，首次打开选中第一座城市，地图仍展示全部足迹。
- 保存并重新生成 Jekyll 后，统计、城市卡片和标记自动同步，无需修改页面脚本。

### 文件与依赖

- `life/tourism/index.html`：Jekyll 页面、共享导航和页脚、静态统计与城市列表。
- `life/tourism/style.css`、`life/tourism/script.js`：主题、响应式布局和地图联动。
- `life/tourism/cards.js`：地点卡片统一高度，中英文地名按可用宽度一起缩小并保持单行；窗口或字体变化时重新适配。
- `life/vendor/leaflet/`：本地托管的 Leaflet 1.9.4，含 BSD-2-Clause 许可证。

地图使用 OpenStreetMap 在线底图并保留署名，不申请定位，不进行在线城市地理编码，
无需 API 密钥、npm 或后端。底图不可用时，保存的标记与城市坐标仍可浏览；
地图库未加载时，城市清单仍可点击查看详情。禁用 JavaScript 时可阅读统计和城市清单。

运行 `jekyll serve` 后访问 `http://localhost:4000/life/tourism/` 预览。
房间入口检查继续使用下方 Life Room 的验证命令。

---
## Life Room

Life Room 是铺满整个浏览器视口的 Three.js 三维入口页。默认从室内正面观看后墙，
墙壁、天花板和地板延伸到屏幕边缘。布局以房间草图为准：左侧窗户与书桌，中间竖幅照片、
低柜与唱片机，右侧高柜、地图及书法。高低柜相连为 L 形，方凳位于书桌前。
书桌靠后墙并与低柜留出间隙，桌腿和柜脚分开；柜体横板嵌在立板之间，前沿平齐，高低柜交接处共用立板。

### 文件与编辑分工

- `life/index.html`、`life/style.css`：全屏场景、角落浮层、“内容”菜单和加载状态。
- `life/script.js`：统一链接配置、菜单关闭行为、占位提示及加载失败回退。
- `life/room.js`：GLB 加载、灯光、受限环视、手机横向查看、缩放、拾取与悬停高亮。
- `life/room-daylight.js`、`life/room-lighting.js`：顺德日出日落计算、定时校准、窗景及台灯昼夜照明。
- `life/room-scenery.js`：网页加载后细化窗外树木，生成弯曲渐细的枝干、独立叶片，并将太阳设为不受曝光冲淡的金黄色。
- `life/room-view.js`：正面取景及相机裁切的共用计算，无需浏览器即可检查。
- `life/room-feedback.js`：物品悬停与点击的缩放反馈，保持桌面接触和地图贴墙。
- `life/models/room.blend`：可直接在 Blender 中编辑的源文件，纹理已打包。
- `life/models/room.glb`：网页模型，附带 `RoomShell.view` 取景参数；访客无需安装 Blender。
- `life/models/room-preview.webp`：与默认正面透视构图一致的静态预览。
- `assets/images/life_room/Leslie_poster.png`：相框照片源图，生成器按项目相对路径读取；Blender 中使用相对路径并打包，GLB 内嵌照片纹理。照片按原比例完整展示，相框上边缘和左右边缘固定，下边缘随照片比例调整，并保留木框和白色衬纸的边距。
- `life/models/curtain-ao.png`：窗帘褶缝的局部遮蔽烘焙图，也已打包进 GLB，运行时无需单独请求。
- `tools/life-room/build_room.py`：重新制作初始房间并导出上述三个资产。
- `tools/life-room/build_teacup.py`：白瓷金边茶杯及配套杯碟；`height_scale` 调整杯身和把手高度，保留杯碟尺寸。
- `tools/life-room/build_lamp.py`：黑色金属折臂台灯，包括双杆支架、弹簧、关节、开放式灯罩和电线。
- `tools/life-room/build_record_player.py`：木纹唱片机、前格栅、银边转盘、唱臂和茶色透明防尘盖。
- `life/models/turntable-wood.png`：唱片机的程序化木纹，也已打包进 Blender 源文件和 GLB。
- `tools/life-room/check_room.mjs`：模型结构、草图布局、取景与拾取、回退行为检查。
- `life/vendor/three/`：本地托管的 Three.js 0.170.0 与 addons，附 MIT 许可证。

网页不需要 npm、打包器、外部 CDN 或后端，继续通过现有 GitHub Pages / Jekyll 托管。

### 顺德昼夜与台灯

房间固定跟随广东顺德的昼夜，代表坐标为北纬 `22.80°`、东经 `113.29°`，
使用 `Asia/Shanghai`（UTC+8）日期。所有访客看到相同时间的昼夜状态，浏览器不申请定位权限。
本地托管的 SunCalc 1.9.0（`life/vendor/suncalc/`，含 BSD-2-Clause 许可证）根据每天的日期计算
日出和日落，不请求天气服务；日出时进入白天，日落时进入夜晚，时间基准为访客设备时钟。

白天保留原有窗景及房间照明，台灯光源和灯泡自发光归零。夜间窗外变为深蓝色，显示固定的
装饰性月亮和少量星星，树木形成暗色树影；房间利用现有环境光与补光模拟柔和的暖色漫反射，
让墙面、柜体等家具保持清晰，不添加额外灯具；台灯以暖黄色聚光照亮
日记及附近桌面，并产生实时阴影。月亮、星星和灯光在网页运行时生成，不改写现有 Blender/GLB 模型。
灯罩内侧的白色反光面在夜间同步呈现柔和暖黄光，模拟灯泡在罩内的反射照明；黑色外壳保持不发光，
灯罩内侧随昼夜渐变一起开关，白天自发光归零。

首次加载直接应用当前状态；日出、日落边界用约两秒渐变，减少动态效果偏好下立即切换。
定时器在下次边界切换，每分钟校准一次；页面进入后台或往返缓存时暂停定时器，返回时立即
重新计算，真正退出页面时清理。静止状态不持续绘制。加载中或 WebGL 失败时，保留原静态
预览并在夜间压暗；完整月亮星空与台灯光照只在三维视图中显示。

临时预览可打开 `/life/?scene=night`（夜晚）或 `/life/?scene=day`（白天）；
去掉 `scene` 参数即恢复按顺德日出日落自动切换，不保存偏好或改变系统时钟。

网页中的树木由 `room-scenery.js` 替换模型自带的粗树枝和椭圆叶团：细枝从主枝分叉，
叶片沿枝梢生长，具有不同方向、大小、颜色和轻微折面。树枝与叶片各合并为一个网格，
固定随机种子保持构图稳定，夜间随现有照明转暗。太阳使用金黄色 `#FFC12F` 和圆形轮廓，
不受室内灯光和色调映射漂白。此调整在网页运行时应用，Blender 源文件和加载用静态预览保留原始窗景。

### 预览

在仓库根目录执行：

```bash
jekyll serve
```

打开 `http://localhost:4000/life/`。也可使用 `python3 -m http.server 8000` 预览三维入口；
完整文章及感悟列表需要通过 Jekyll 生成。请通过 HTTP 访问，模型加载不支持直接双击 HTML。

### 配置入口

编辑 `life/script.js` 中的 `ROOM_LINKS`：

```js
const ROOM_LINKS = {
  worldMap: "/life/tourism/",
  notes: "#",
  travelAlbum: "#",
  reflection: "/life/reflection/",
  music: "#"
};
```

将 `#` 替换为对应的站内路径或外部 URL。预留入口显示“还在整理中”；音乐未配置音频，
不会假装播放。房间不显示悬浮文字标签，可点击实体物品，也可通过右上角“内容”菜单访问。
菜单和返回主页按钮不占用场景布局空间，键盘用户可正常使用这些链接；`Escape` 关闭菜单。

### 操作和手机布局

桌面拖动只进行小幅环视：水平 ±6°、垂直 ±3°，滚轮或底部按钮缩放，恢复视角回到正面。
聚焦画布后，方向键环视、`+` / `-` 缩放、`Home` 复位。

当视口宽高比小于 1.2 时，使用 3:2 的虚拟全景画幅。实际 canvas 仍只占用屏幕尺寸，
通过相机 `setViewOffset` 横向裁切，避免把家具缩成小图。单指左右拖动查看，双指缩放；
左右按钮及键盘左右方向键也能平移视野。初始及复位时显示左侧窗户和书桌，滑动限制在房间两端。
横屏恢复全景与小幅环视；同一模式中尺寸变化会保留横向查看进度和缩放。

物品拾取只响应最近表面，不能穿过家具；移动超过 6 像素或使用多指操作后不会触发跳转。
可点击物品在悬停时平滑放大约 4.5%，移开恢复；点击时短暂放大约 6.5% 后打开内容。
唱片机的透明盖默认合上，悬停只放大；点击会打开到 70°，并保持约 6.5% 的放大。
再次点击唱片机会合上盖子，退出持续放大；“内容”菜单中的音乐链接仍按原配置打开。
缩放时同步更新阴影，动画结束后停止持续绘制；减少动态效果偏好会改为立即切换大小。
静止时不持续渲染，减少动态效果偏好会关闭惯性。模型加载超过 25 秒、模块失败、WebGL
不可用或上下文丢失时保留预览，并展开“内容”菜单提供备用入口。

### 在 Blender 中修改

使用 Blender 4.5 LTS 或兼容版本打开 `life/models/room.blend`。可调整家具、位置、尺寸与
材质，修改后保存 `.blend`；**不要重跑生成脚本覆盖手动设计**。

以下父级名称和层级是网页的交互约定，不能将它们与整个房间合并：

| Blender 父级 | ROOM_LINKS 键 | 物品 |
| --- | --- | --- |
| `Journal` | `reflection` | 书桌日记 |
| `Notes` | `notes` | 高柜上层书本 |
| `TravelAlbum` | `travelAlbum` | 高柜中层相册 |
| `WorldMap` | `worldMap` | 高柜上方的后墙地图 |
| `RecordPlayer` | `music` | 低柜上的唱片机 |

选择模型及其父级，通过 **File → Export → glTF 2.0** 覆盖 `life/models/room.glb`：
GLB、Selected Objects、Apply Modifiers、Custom Properties、+Y Up；保留材质纹理，
不导出相机、灯光或动画。`RoomShell` 的 `view` 自定义属性决定房间取景；改变房间比例时，
同步更新它和 `life/room-view.js` 中的默认参数。网页会重新设置正面透视相机及灯光。

材质使用 Principled BSDF；程序纹理需先烘焙。书法字转为网格，源文件不依赖外部中文字体。
窗帘使用平滑的密集褶皱网格、独立的亚麻材质与柔和织物高光；重建脚本会烘焙局部褶缝遮蔽，
通过 glTF 的 occlusion 贴图带入实时场景。两片窗帘各有 6 组套住横杆的黄铜挂环和连接布料顶部的弯钩。
腰部使用包覆褶皱的亚麻布质束带，颜色为略深于窗帘的浅杏色（`#D9BC9C`），带有柔和下垂和布料厚度。
窗帘仍接收实时光照、投影与交互视角变化。
模型调整后重新渲染正面预览，避免加载前后的布局不一致。

只有需要重新生成初始设计时，才从仓库根目录运行（会覆盖三个模型资产）：

```bash
blender --background --factory-startup --python tools/life-room/build_room.py
```

生成器在 macOS 上使用系统宋体制作书法；其他系统可将 `font_path` 改为本地中文字体路径。
家具尺寸、配色、摆放和取景集中在脚本中；固定随机种子使重建结果稳定。
左墙、后墙、右墙和天花板共用 `Room plaster` 暖灰米色材质（底色 `#C9C0AD`），正常接收光照和阴影。
不同朝向形成自然明暗差异；在 Blender 中修改该材质的 Base Color 即可统一调整这四个面的底色。

### 验证

以下检查使用 Node.js 20.6 或更新版本；网页运行不依赖 Node.js：

```bash
node --check life/script.js
node --check --input-type=module < life/room.js
node --check --input-type=module < life/room-view.js
node --check --input-type=module < life/room-daylight.js
node --check --input-type=module < life/room-lighting.js
node --check --input-type=module < life/room-scenery.js
node --import ./tools/life-room/three-loader.mjs tools/life-room/check_daylight.mjs
node --import ./tools/life-room/three-loader.mjs tools/life-room/check_room.mjs
```

检查包括：GLB 结构与贴图打包、各物品的相对布局、L 形柜体连接、桌面/手机尺寸下的取景、
手机横向边界与复位、五个物品在各视口的拾取，以及模块失败后菜单入口可用。
昼夜检查还覆盖季节变化、日出日落边界、北京时间跨日、不同访客时区、后台恢复、时钟校准、
定时器清理、月亮星星的窗内范围、灯光照向日记、白天恢复和减少动态效果。
发布前还需核对浏览器实际渲染、触屏手势、占位提示和感悟跳转。建议模型保持在 5 MB 内。
