# ことばの島：游玩、分享与打包

## 选择

首选 [在线版](https://taouyh.github.io/kotoba-no-shima/)。GitHub Pages 托管静态资源，不需要服务器或玩家账号，电脑、安卓和 iPhone 的现代浏览器都可以打开。Chrome / Edge 的菜单可安装为 PWA；首次完整加载并缓存后，页面和题库支持离线使用。国内访问 GitHub Pages 的速度取决于网络，后续可将同一份 `dist/` 部署到其他静态托管平台。

| 形式 | 技术 | 用途与代价 |
| --- | --- | --- |
| 网址 / PWA | React + TypeScript + Vite | 分享最方便，更新无需重新下载安装包 |
| Windows x64 安装版 | Tauri 2 + Rust + 系统 WebView2 | 安装包不内置 Chromium 或 Node；只在缺少 WebView2 时下载运行环境 |
| Android APK | Capacitor 8 + 系统 Android WebView | 安装时内置页面题库，使用安卓系统 TTS 朗读 |

Windows 的安装显示名、快捷方式名、窗口标题，以及安卓应用列表和桌面名称均为「ことばの島」。学习界面使用中文。Windows 安装向导可选择日语、中文或英语。

体积以 Release 附件为准；运行内存随页面、WebView 版本、语音引擎和设备变化，不能从安装包大小推断。Windows 已开启 Rust 发布优化、LTO、符号剥离和 LZMA 安装压缩；应用关闭即退出，无托盘常驻。安卓 release 开启代码和资源压缩。

Windows 针对文字与静态 SVG 界面关闭 GPU 加速和 GPU 合成，降低显卡进程的内存开销。2026-10-24 本机对比中，地图页面静置 15 秒后，进程树的专用工作集由约 300 MB 降至约 116 MB；通过临时调试连接测量，其他设备和实际学习场景会变化。该策略以软件绘制换取较低内存，后续如加入复杂动画需重新评估。

## 数据与声音

- 玩家记录保存在各自设备的 IndexedDB。新安装从零开始，不打包作者的浏览器数据库、个人进度或备份。
- 网站、PWA、Windows 和安卓使用独立的存储空间；通过设置页的 JSON 备份手动迁移。更新安装包时保持应用 ID 与签名不变，避免丢失旧数据。
- Windows 导出使用系统保存对话框；安卓导出使用系统分享菜单，可保存到支持接收文件的应用。导入使用系统文件选择器。
- 网页版与 Windows 使用设备日语合成声音，安卓使用原生系统 TTS。没有日语语音包时仍可练习看字认读；合成音不作为声调判定标准。
- 安装版题库无需联网。初次安装 WebView2、下载语音包和打开外部资料可能需要网络。

## 本地构建

基础依赖：Node.js 24、npm。

```sh
npm ci
npm test
npm run build
```

网页产物位于 `dist/`，使用相对路径。默认主分支由 `.github/workflows/pages.yml` 自动发布到 Pages。

Windows 还需要 Rust 和 Microsoft C++ Build Tools（桌面 C++ 工作负载）：

```sh
npm run desktop:dev
npm run desktop:build
```

安装包输出到 `src-tauri/target/release/bundle/nsis/`。配置只打 NSIS 安装程序，面向 Windows 10/11 x64；使用共享 WebView2 Evergreen，缺失时下载引导程序。当前没有 Windows 商业签名证书，系统可能提示未知发布者。

安卓需要 JDK 21、Android SDK 36 和相应构建工具：

```sh
npm run android:sync
npm run android:open
```

Android Studio 中可安装调试版；正式 APK 必须设置下面四个构建环境变量后，在 `android/` 执行 `./gradlew assembleRelease`：

- `ANDROID_KEYSTORE_PATH`：签名密钥库路径。
- `ANDROID_KEYSTORE_PASSWORD`：密钥库密码。
- `ANDROID_KEY_ALIAS`：密钥别名。
- `ANDROID_KEY_PASSWORD`：密钥密码。

原生构建由 `npm run build:native` 生成，不注册 PWA Service Worker，避免旧网页缓存干扰安装版更新。两种原生壳都加载内置网页，不以在线网址充当安装内容。

## 自动生成安装包

仓库 Actions Secrets 需要 `ANDROID_KEYSTORE_BASE64`、`ANDROID_KEYSTORE_PASSWORD`、`ANDROID_KEY_ALIAS`、`ANDROID_KEY_PASSWORD`。密钥库和密码不得提交到 Git；后续安卓更新必须继续使用同一密钥。首次配置后应单独妥善备份本机签名资料。

推送 `v*` 标签会运行 `.github/workflows/installers.yml`，构建两个安装包、计算 SHA-256，再发布为预览 Release。单独手动运行工作流只生成 Actions 构建附件。Windows 构建也会保留可执行文件与 Cargo.lock，供复现及验证使用。

构建成功不等于所有真实设备均已验收；安卓首次发布仍应检查实际手机上的声音、备份、离线使用和升级保留进度。

## 官方技术资料

- [GitHub Pages 与自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Tauri Windows 打包与 WebView2 分发选项](https://v2.tauri.app/distribute/windows-installer/)
- [Capacitor Android 支持范围](https://capacitorjs.com/docs/android)
- [安卓系统文字转语音插件](https://github.com/capacitor-community/text-to-speech)
