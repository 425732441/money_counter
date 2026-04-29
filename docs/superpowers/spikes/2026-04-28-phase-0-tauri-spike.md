# Phase 0 Tauri Spike 验证记录

日期：2026-04-28

## 目标

验证 Tauri 2 是否覆盖 Windows 常驻小工具的最小桌面能力：

- 系统托盘入口
- 主窗口显示/隐藏
- 本地设置保存
- 系统通知
- 开机自启开关
- 分享图复制到剪贴板
- 分享图保存到本地
- Windows 打包

## 当前实现

最小原型位于仓库根目录：

- `package.json`：Vite + Tauri CLI + Tauri JS 插件
- `src/`：Phase 0 验证面板
- `src-tauri/`：Tauri 2 Rust 壳、托盘、插件初始化、打包配置

## 环境记录

Rust 工具链可用：

- `rustc 1.95.0`
- `cargo 1.95.0`

前置探针曾显示 `link.exe` 不在普通 PowerShell PATH，但 Tauri release 构建已成功完成。若后续在新机器继续出现 linker 错误，安装或修复 Visual Studio C++ Build Tools：

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" --accept-package-agreements --accept-source-agreements
```

安装后打开新的 PowerShell，再验证：

```powershell
rustc --version
cargo --version
where.exe link
```

## 验证命令

```powershell
npm install
npm run build
cargo check --manifest-path src-tauri\Cargo.toml
npm run tauri dev
npm run tauri build
```

打包产物预期位于：

```text
src-tauri/target/release/bundle/nsis/
```

## 本轮实测结果

- `npm run build`：通过。
- `cargo check --manifest-path src-tauri\Cargo.toml`：通过。
- `npm run tauri build`：通过。
- Release exe：`src-tauri/target/release/money-counter-spike.exe`，约 10.63 MB。
- NSIS 安装包：`src-tauri/target/release/bundle/nsis/Money Counter Spike_0.0.1_x64-setup.exe`，约 2.24 MB。
- Release smoke test：进程可启动，主窗口标题为 `回血计数器 Spike`，窗口响应正常。
- 二次冷启动粗测：约 341 ms 出现主窗口标题。
- 运行后工作集粗测：约 23 MB。
- 10 秒空闲 CPU 增量粗测：0 秒。
- 重复打包时如果旧安装包被占用，可能出现 `拒绝访问 (os error 5)`；删除仓库内旧 `bundle/nsis/*.exe` 后可重新生成。

## 交互修正记录

- 托盘图标改为代码生成的高对比小图标，避免深色任务栏里看不见。
- 主窗口改为无边框、置顶、小尺寸实时状态条，接近网速监控类小工具。
- 设置移到单独 `settings` 窗口，不再直接占据主状态条。
- 通知改为 Rust 原生命令发送，避开 WebView `Notification` 权限路径的不稳定行为。
- 复制分享图改为先从 canvas 生成 PNG，再通过 `Image.fromBytes` 写入剪贴板。
- 状态条空白区域支持拖动窗口，按钮区域保持正常点击。
- 主状态条新增置顶开关，状态保存到本地；置顶时会周期性检查最小化状态并自动恢复。
- 主窗口显式保留任务栏入口，窗口标题继续显示实时金额/速率/进度，便于任务栏 hover 预览。
- 移除窗口状态恢复插件，启动时重新约束为小尺寸状态条，避免恢复到旧的大透明窗口。
- 状态条左侧卡通币图标缩小并放开内部裁切，避免圆形图案显示不完整。
- 修复高 DPI 下主窗口被物理像素尺寸压缩的问题；状态条内部列宽也压紧，右侧 6 个操作按钮保留固定可见空间。

## 手工验收清单

- [ ] 启动后系统托盘出现入口。
- [ ] 左键托盘图标可显示/隐藏窗口。
- [ ] 托盘右键菜单可显示、隐藏、退出。
- [ ] 点击“保存设置”后关闭重开仍可恢复设置。
- [ ] 点击“发送通知”可出现系统通知。
- [ ] 点击“开机自启”可切换状态，并能再次读取状态。
- [ ] 点击“复制分享图”后可粘贴 PNG 图片。
- [ ] 点击“保存分享图”后可得到本地 PNG 文件。
- [x] `npm run tauri build` 可生成 Windows 安装包。
