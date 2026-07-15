// Atropos 通过包导出子路径 `atropos/css` 暴露样式，TS 无法为该裸 specifier 推断类型，
// 这里声明为副作用导入模块。
declare module 'atropos/css'
