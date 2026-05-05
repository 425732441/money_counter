# 回血计数器

一个 Windows 优先、离线优先的桌面回血小工具。它把上班时间换算成每秒到账、今日已赚、打工进度、摸鱼收益和下班前状态，用一个低打扰的小窗陪用户度过工作日。

当前项目仍处于 Spike / MVP 原型阶段，重点验证 Tauri 桌面能力、离线计算、本地设置、系统托盘、通知、分享卡片和 H5 种子页。

## 功能概览

- 实时回血：显示今日已赚、每秒到账、今日进度和预计收入。
- 收入模式：支持月薪、日薪、时薪换算。
- 工作制：支持标准班制、弹性工时、双休、单休和全周工作日。
- 状态系统：自动、开工、摸鱼、午休、暂停、收工。
- 隐私显示：真实金额、模糊金额、进度百分比、咖啡杯暗号。
- 首次引导：三步配置收入、工作时间和隐私偏好。
- 桌面常驻：Tauri 无边框小窗、置顶、拖拽、贴边自动隐藏。
- 系统托盘：托盘菜单、动态进度图标、隐藏/显示主面板。
- 本地提醒：开工、午休、快下班和低频休息提醒。
- 本地统计：用户主动开启后记录近 30 天汇总。
- 分享卡片：今日打工战报、摸鱼回血账单、下班生存卡，可复制或保存 PNG。
- H5 种子页：提供在线估算器和项目介绍，页面输入不发起网络上传。

## 技术栈

- Tauri 2
- Vite
- 原生 JavaScript / HTML / CSS
- Rust 桌面集成
- Node.js 内置测试框架

## 环境要求

- Node.js 和 npm
- Rust 工具链
- Tauri 2 开发环境
- Windows 环境用于完整验证托盘、通知、开机自启和 NSIS 打包

## 安装依赖

```powershell
npm install
```

## 本地开发

只启动前端开发服务器：

```powershell
npm run dev
```

默认地址：

```text
http://127.0.0.1:1420
```

启动 Tauri 桌面应用：

```powershell
npm run tauri -- dev
```

查看 H5 种子页：

```text
http://127.0.0.1:1420/h5/
```

## 测试

运行 JavaScript 测试：

```powershell
npm test
```

测试覆盖计算核心、提醒逻辑、通知状态、窗口行为、拖拽判断、样式约束、主页面结构和 H5 页面文案。

## 构建

构建前端资源：

```powershell
npm run build
```

构建 Tauri 安装包：

```powershell
npm run tauri -- build
```

当前 Tauri 配置的打包目标是 Windows NSIS。

生成带版本号的发布产物：

```powershell
npm run package:release
```

输出目录会区分安装版和绿色版：

```text
release/installer/MoneyCounter-0.0.1-setup.exe
release/portable/MoneyCounter-0.0.1-portable.exe
```

## 目录结构

```text
.
├── index.html                 # 桌面端页面
├── public/h5/index.html        # H5 种子页
├── src/
│   ├── main.js                 # 桌面端 UI、状态、存储和 Tauri 调用
│   ├── work-core.js            # 工资/工时计算核心
│   ├── reminder-core.js        # 提醒调度核心
│   ├── notification-core.js    # 通知状态文案
│   ├── local-stats-core.js     # 本地统计汇总
│   ├── window-behavior.js      # 小窗尺寸和贴边隐藏规则
│   ├── drag.js                 # 拖拽命中判断
│   └── styles.css              # 桌面端样式
├── src-tauri/                  # Tauri / Rust 桌面集成
├── tests/                      # Node.js 测试
└── docs/superpowers/           # 设计文档和实施计划
```

## 隐私说明

项目默认离线优先。收入、工作时间、隐私模式、提醒设置和本地统计通过 Tauri Store 保存在本机；本地统计默认关闭，需要用户主动开启。桌面端不需要账号，不上传薪资，不读取键盘输入、浏览记录或活跃窗口。

## 当前状态

这是一个面向内测和能力验证的原型项目，还不是正式发布版本。正式分发前仍需补充分发策略、代码签名、安装包验证、更多 Windows 兼容性测试和公开隐私说明。
