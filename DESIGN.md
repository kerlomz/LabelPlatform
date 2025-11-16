# 标注平台设计文档

## 设计理念

基于对 CVAT、Labelme、Label Studio 等专业标注工具的深度调研，我们的设计遵循以下核心原则：

### 1. 用户体验优先

**减少认知负担**
- 清晰的视觉层级
- 直观的图标和标签
- 一致的交互模式
- 智能的默认行为

**提升操作效率**
- 丰富的快捷键支持
- 单击完成常用操作
- 批量操作功能
- 智能吸附和对齐

**人体工程学**
- 深色/浅色主题
- 可定制的界面布局
- 进度跟踪和提示
- 流畅的动画反馈

### 2. 架构设计

**分层架构**
```
┌─────────────────────────────────────┐
│         UI Components               │  呈现层
├─────────────────────────────────────┤
│    Tool Abstraction Layer           │  工具抽象层
├─────────────────────────────────────┤
│  Canvas Manager | Hotkey Manager    │  核心管理层
├─────────────────────────────────────┤
│    State Management (Zustand)       │  状态管理层
├─────────────────────────────────────┤
│         API Client                  │  数据访问层
└─────────────────────────────────────┘
```

**核心模块**

1. **CanvasManager** - Canvas交互管理
   - 缩放/平移控制
   - 坐标转换
   - 碰撞检测
   - 磁吸对齐

2. **HotkeyManager** - 快捷键管理
   - 统一的快捷键注册
   - 冲突检测
   - 动态绑定/解绑
   - 分类管理

3. **Tool System** - 工具系统
   - 统一的工具接口
   - 工具生命周期管理
   - 工具状态机
   - 可扩展设计

4. **History Manager** - 历史管理
   - 操作记录
   - 撤销/重做
   - 批量操作支持

### 3. 交互设计

**Canvas 交互**
- 滚轮缩放（以鼠标位置为中心）
- 中键/空格+拖动平移
- 双击居中显示
- 右键上下文菜单

**标注交互**
- 点击选中
- 拖动移动
- 手柄调整大小
- 实时预览反馈

**快捷键系统**
```
工具切换:
  V - 选择工具
  B - 矩形框
  P - 多边形
  空格 - 平移模式

操作:
  Delete - 删除选中
  Ctrl+Z - 撤销
  Ctrl+Y - 重做
  Ctrl+C - 复制
  Ctrl+V - 粘贴
  Ctrl+D - 复制
  Ctrl+S - 保存

视图:
  +/= - 放大
  - - 缩小
  0 - 适应窗口
  1 - 100%缩放

标签:
  1-9 - 快速选择标签
```

### 4. UI 设计规范

**布局**
```
┌──────────────────────────────────────────────┐
│  Toolbar (工具栏)                             │
├────┬─────────────────────────────────┬───────┤
│ T  │                                 │       │
│ o  │      Canvas Area               │ Side  │
│ o  │      (画布区域)                 │ bar   │
│ l  │                                 │       │
│ s  │                                 │       │
├────┴─────────────────────────────────┴───────┤
│  Status Bar (状态栏)                          │
└──────────────────────────────────────────────┘
```

**颜色系统**
- 主色调: #1890ff (蓝色)
- 成功: #52c41a (绿色)
- 警告: #faad14 (橙色)
- 错误: #ff4d4f (红色)
- 中性: #595959 (灰色)

**字体**
- 主要字体: -apple-system, BlinkMacSystemFont, 'Segoe UI'
- 代码字体: 'Monaco', 'Consolas', monospace

### 5. 性能优化

**渲染优化**
- 虚拟化长列表
- Canvas 分层渲染
- 事件节流/防抖
- 懒加载图片

**内存优化**
- 对象池复用
- 及时清理无用对象
- 图片缓存策略

**交互优化**
- 60fps 流畅动画
- 即时响应反馈
- 异步加载
- Web Worker 后台处理

### 6. 扩展性设计

**插件化工具**
```typescript
interface Tool {
  type: ToolType
  onActivate(): void
  onDeactivate(): void
  onMouseDown(e: MouseEvent): void
  onMouseMove(e: MouseEvent): void
  onMouseUp(e: MouseEvent): void
  render(): React.ReactNode
}
```

**配置驱动**
```typescript
interface ProjectConfig {
  annotationType: string
  labels: LabelConfig[]
  tools: ToolConfig[]
  shortcuts: HotkeyConfig[]
  appearance: AppearanceConfig
}
```

**数据格式**
```json
{
  "type": "bbox",
  "id": "uuid",
  "label": "car",
  "geometry": {
    "x": 100,
    "y": 100,
    "width": 200,
    "height": 150
  },
  "attributes": {},
  "metadata": {
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

## 实现计划

### Phase 1: 核心架构 ✅
- [x] 设计工具抽象层
- [x] 实现 CanvasManager
- [x] 实现 HotkeyManager
- [x] 定义数据模型

### Phase 2: 基础工具 (进行中)
- [x] 选择工具
- [x] 矩形框工具
- [x] 多边形工具
- [ ] 点标注工具
- [ ] 线段工具
- [ ] 笔刷工具

### Phase 3: UI 完善
- [x] 工具栏组件
- [x] 侧边栏组件
- [x] 状态栏组件
- [ ] 上下文菜单
- [ ] 属性面板

### Phase 4: 高级功能
- [ ] 自动标注辅助
- [ ] 标注质量检查
- [ ] 批量操作
- [ ] 导入/导出

### Phase 5: 优化
- [ ] 性能优化
- [ ] 用户测试
- [ ] Bug 修复
- [ ] 文档完善

## 参考资料

- [CVAT - Computer Vision Annotation Tool](https://github.com/opencv/cvat)
- [Labelme](https://github.com/wkentaro/labelme)
- [Label Studio](https://github.com/heartexlabs/label-studio)
- [VGG Image Annotator](https://www.robots.ox.ac.uk/~vgg/software/via/)
- [Figma - Design Interaction](https://www.figma.com/)
- [Material Design Guidelines](https://material.io/design)
