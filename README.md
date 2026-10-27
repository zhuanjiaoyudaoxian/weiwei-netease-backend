# 喂喂机网易云连接服务 · 部署实验包

本包**不是已接通网易云的成品**。它提供与喂喂机现有 `index.html` 中 `/api/netease/*` 调用对应的服务端适配器，不会修改网页布局。

## 部署到 Render

1. 将本文件夹单独上传到你控制的私有 GitHub 仓库。
2. Render → New → Blueprint → 选择该仓库，读取 `render.yaml`。
3. 配置 `APP_ORIGIN` 为喂喂机页面来源，例如 `https://你的用户名.github.io`，只写协议和域名。
4. `NETEASE_API_URL` 需要填写**自己控制的、NeteaseCloudMusicApi 兼容的服务**。此适配器不会自行提供网易云接口；如果没有这个上游，扫码登录不能工作。不要填写陌生人的公共 API，避免凭证泄露。
5. 部署后访问 `https://你的服务.onrender.com/health`，`configured:true` 只代表填了上游地址，**不代表网易云登录成功**。

## 重要限制

- 非官方接口可能失效；需要遵守网易云及上游项目条款。
- `MUSIC_U` 或扫码登录会话属于敏感凭证，不应写进公开仓库、前端 HTML 或聊天记录。
- 服务仅保存在内存中的会话，Render 重启会丢失；iOS Safari 跨站 Cookie 可能导致无法恢复登录。
- 音频播放接口目前会返回 403，**普通及会员歌曲都没有接通**；不会绕过版权、DRM 或付费限制。
- 这份包只供实验，不要未经安全加固就作为公开多用户服务。

## 本地语法验证

`node --check server.mjs`，然后设置环境变量并 `npm start`。
