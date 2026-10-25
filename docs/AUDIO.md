# 内置日语音频

v0.4.0 将固定题库的参考音频随安装包提供。Windows、安卓以及网页版默认选择「内置日语音频」，不再要求玩家安装系统日语语音包。设备合成声音仍可选；设备声音失败时，已内置的词条会回退到对应音频。

看字回忆答对后默认自动播放一次正确读音；不会在作答前泄露声音，也不会在答错时自动播放。仍可点击「听参考读音」重听。下一题、退出或开始新的播放会停止上一段。设置中的「答对后自动读音」可以关闭，偏好随进度备份保存。

## 来源与署名

**VOICEVOX:四国めたん**（Normal，style ID 2）。本项目不使用角色插画。

- 制作工具：VOICEVOX Core 0.17.1、官方模型 0.17.0 的 `0.vvm`、VOICEVOX ONNX Runtime 1.17.3、Open JTalk 词典 1.11。
- 音频仅在开发时生成；最终应用只播放压缩 MP3，不运行语音模型，不需要 API 密钥或付费语音服务。
- [音源使用规约](https://zunko.jp/con_ongen_kiyaku.html)允许有署名的应用使用；再分发与复用音频时必须保留署名并遵守音源规约。
- [VOICEVOX 音声模型规约](https://github.com/VOICEVOX/voicevox_vvm)与 [VOICEVOX 说明](https://voicevox.hiroshiba.jp/term/)。游戏内设置页及 `public/audio/NOTICE.txt` 均保留署名。

这是合成参考音，没有宣称经过日语教师逐条审音，不能用于裁定词重音。原高低音课程仍使用明确标注的示意纯音。

## 保存与离线

当前 1,433 个播放入口（214 个假名、1,218 个带读音词条及试听入口）共用 1,082 个 MP3，合计 6,063,840 字节。相同读音去重；未把中文题目标题或没有朗读按钮的语法／概念题混入日语音频。

安装版内置全部当前可朗读条目的音频，安装后无需联网。网页版按需请求音频，并缓存完整响应；已听音频可通过 Service Worker 的 RangeRequests 支持离线重听。未听过的网页版音频仍需首次联网加载。不会在打开网站时一次请求上千个音频文件。

压缩格式为 24 kHz 单声道 MP3、48 kbps；同音内容共用文件，播放器一次只播放一段，不会在启动时解码整套音频。生成文件使用包含模型摘要、声音 ID、语速等参数的散列命名，避免更新缓存混淆。

## 制作与维护

普通使用和自动打包只需要已经提交的 `public/audio/` 与 `src/data/audio-manifest.json`，不需要安装 Python 或 VOICEVOX。

开发者补充课程后，应使用独立 Python 3.12 环境、VOICEVOX Core 官方 wheel 0.17.1 与 `lameenc==1.9.0`，将官方模型、CPU runtime 和词典放到 `work/audio-build/voicevox/`（忽略目录）。官方 downloader 可按 `--models-pattern 0.vvm --models-version 0.17.0 --onnxruntime-version 1.17.3 --only onnxruntime models dict --tries 2` 选择必要组件。先阅读并同意相应使用条款。

```sh
node scripts/prepare-audio.mjs
# 使用独立环境中的 Python 执行：
python scripts/generate-audio.py
npm test
npm run build
```

生成过程可断点继续：缓存记录保存在 `work/audio-build/clip-meta.json`；只有全部音频生成成功后才更新清单。`docs/audio-index.json` 记录实际合成文本、假名分析、时长、体积与 SHA-256。测试验证全部可朗读学习项的覆盖、文本映射以及文件完整性；不要通过空清单或空音频绕过检查。
