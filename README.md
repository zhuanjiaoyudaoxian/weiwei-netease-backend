# Render 构建失败 ENOENT 修复版（v0.3.1）

本版删除 `github:Binaryify/NeteaseCloudMusicApi` 依赖，解决 npm 在 Git clone 临时目录中找不到 package.json 的构建问题。

**重要：此版只修复构建，不等于网易云功能已接通。** 当前后端为代理桥，仍需要你自己合法运行的、与 NeteaseCloudMusicApi 路由兼容的网易云 API 服务地址，设置到 Render 环境变量 `NETEASE_API_URL`。不要将 Cookie、密码或登录凭证上传到 GitHub。原有 `APP_ORIGIN=https://zhuanjiaoyudaoxian.github.io` 保留。

## 上传

将 `server.mjs`、`package.json`、`render.yaml` 上传到 GitHub 仓库根目录，覆盖同名文件。若仓库有旧的 `package-lock.json`，请删除旧锁文件，否则可能锁住已移除的 GitHub 依赖。Render 需要使用 `npm install --omit=dev` 构建、`npm start` 启动。注意：Render 已有服务的 Dashboard 设置可能优先于 render.yaml。

## 测试

打开 `/health`：`configured:false` 表示还没有设置 API 上游，服务可以正常启动但扫码和歌单仍不可用。此时不要开始登录测试。`configured:true` 也只表示填了地址，不能保证上游可用。

播放接口仍不提供受版权限制音频的绕过方式。服务进程内登录状态重启后会失效。
