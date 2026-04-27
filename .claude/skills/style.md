---
name: style
description: 代码风格与格式约定
version: 0.1.0
---

# Code Style Skill

## 目标

- 让改动后的代码在可读性、一致性、可维护性上保持统一。
- 在不改变业务逻辑的前提下，优先做到“最小必要改动”。

## 适用范围

- 语言：`TypeScript/JavaScript`（可扩展到 `Node.js`、`React`、`CSS` 等）。
- 场景：新增代码、重构、小修复、评审建议。

## 核心原则（可调整）

- 一致性优先：跟随仓库现有风格与约定。
- 小步改动：只改与需求相关的区域，避免无意义格式化全文件。
- 可读性：命名清晰、结构清晰、少写“聪明代码”。
- 可测试：新增/修改逻辑尽量可被单测覆盖（若项目已有测试框架）。
- 分层清晰：通用工具方法放到 `packages/kernel-shared/`，避免散落在 `app/` 内。

## 具体规范

### 通用

- 缩进：`2` 空格（如项目已有 `prettier/eslint` 以其为准）。
- 行宽：`100`（以现有格式化工具为准）。
- 末尾逗号：对象/数组/多行参数使用尾逗号。
- 空行：逻辑分组之间保留 `1` 个空行，避免连续多空行。
- 导入顺序：第三方 -> 内部模块 -> 相对路径；同组按字母序。
- 你可以在执行完部分指令或者编写代码之后，在本项目的根路径使用 `pnpm run format` 格式化代码。
- export 出去的函数使用 `function` 声明，模块内部的函数则使用箭头函数 `=>`。
- 包和 app 内部引入其他模块时，可以读取 `tsconfig.json` 文件里面的 `compilerOptions.paths` 属性，使用 `#` 引入。
- 不要显示的声明函数的返回值类型，而是尽量用自动推导，避免重复声明。
- 善用 `object`, `map` 来枚举一些数据，而不是写很多 if else 语句。
- 打印的日志（`console.log`）如果太长，你应该学会分局，并用 `+` 来拼接。

### 命名

- 变量/函数：`camelCase`，表达“是什么/做什么”。
- 类型/接口/组件：`PascalCase`。
- 常量：`SCREAMING_SNAKE_CASE`（仅用于真正常量）。
- 布尔值：`is/has/can/should` 前缀，例如 `isReady`、`hasError`。

### TypeScript

- 优先使用 `type` 定义组合类型；对可扩展对象结构使用 `interface`（按团队习惯调整）。
- 避免 `any`；必要时使用 `unknown` 并在使用处做类型收窄。
- 函数入参/返回值：公共函数/复杂逻辑必须显式标注类型。
- 可选链与空值合并：`a?.b`、`x ?? defaultValue`。
- 数组类型的语法为： `Array<A>`。

### React（如适用）

- 组件尽量保持“纯”：props 驱动渲染，副作用放在 `useEffect`。
- 事件处理函数：`handleXxx` 命名；回调 props：`onXxx`。
- 状态命名：`[value, setValue]` 对应一致。
- 列表渲染：`key` 使用稳定唯一值，避免用 `index`（除非列表静态且不重排）。
- 提前返回（early return）减少嵌套：加载态/空态/错误态。

### Tailwind CSS（如适用）

- 优先使用 Tailwind 工具类表达样式，避免为局部样式额外引入零散的自定义 CSS。
- class 组织：按“布局/间距 -> 排版 -> 颜色/边框/阴影 -> 状态”分组，保持可读。
- 复用：重复出现的 class 抽成组件或封装为可复用的 UI primitives，避免长串 class 复制粘贴。

### 错误处理

- 错误信息应可行动：包含上下文（例如参数、资源 id），但避免泄露敏感信息。
- 用户可见提示与开发日志分离（按项目现状处理）。

### 注释

- 解释“为什么”，而不是“做了什么”。
- 对复杂算法/边界条件添加注释与示例。
- TODO 要包含原因与期望处理方式，例如：`// TODO(user): 解释原因，链接 issue`。

## 交付要求（对产出内容的约束）

- 输出代码时：只贴关键片段，避免整文件粘贴。
- 修改代码时：遵循“最小 diff”，不做无关重排/重命名。
- 给建议时：优先给可执行的具体改法（必要时附 1-2 行示例）。

## 示例（可删除/替换）

### 示例 1：布尔变量命名

推荐：

```ts
const isEnabled = featureFlags.includes('new-ui');
```

不推荐：

```ts
const enabled = featureFlags.includes('new-ui');
```

### 示例 2：早返回减少嵌套

```tsx
if (loading) return <Spinner />;
if (error) return <ErrorState message={error.message} />;
return <Content data={data} />;
```
