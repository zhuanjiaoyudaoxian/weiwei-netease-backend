# 喂喂机网易云后端 v0.3 (试运行)

本版本把社区 NeteaseCloudMusicApi 安装到**同一 Render 服务**并在本机 `127.0.0.1:3101` 启动，避免再部署第二个服务或配置 `NETEASE_API_URL`。现有前端 `/api/netease/*` 接口不变。仅供用户自己的账号连接使用；不是网易云官方授权产品。**尚未在线实测，可能受社区 API 停更、平台登录风控影响。**

## 上传
把 `server.mjs`、`package.json`、`render.yaml` 上传覆盖到原 GitHub 仓库根目录（不要上传 ZIP 本身）。Render 自动部署。原有 Render 环境变量 `APP_ORIGIN=https://zhuanjiaoyudaoxian.github.io` 保留，旧 `NETEASE_API_URL` 如有设置应删除，否则会覆盖内置 API。访问 `/health` 应显示 `ok:true`；但这只证明桥接进程在运行，不代表登录成功。接着在喂喂机网易云入口输入 `https://weiwei-netease-backend.onrender.com`，进行扫码登录测试。

## 已知限制
- Render 免费服务休眠/重启后内存中的登录状态会丢失，需重新扫码。
- iOS Safari 对跨站 Cookie 的限制可能导致扫码成功但网页无法识别登录；需要后续调整为同源代理或其他合规会话方案。
- 歌曲播放端点仍明确返回未授权，**不提供 VIP 破解或绕过 DRM**。
- 第三方社区 API 可能安装失败、启动路径变动或网易云端接口变化。检查 Render 部署日志以定位。
- 不要把 MUSIC_U、Cookie、密码或二维码内容提交到公开仓库。
