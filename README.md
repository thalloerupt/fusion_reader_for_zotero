# Fusion Reader for Zotero
[English](./README.en.md) 

一个面向 Zotero 7 及更新版本的轻量插件，帮助你更方便地通过Fusion Reader来获取文献翻译功能。

## 使用

1. 安装最新版 Fusion Reader。
2. 安装Zotero。
3. 点击当前页面右侧Release-版本号-Assets；选择.xpi文件下载
2. 在 Zotero 中打开“工具 → 插件”，点击齿轮菜单中的“Install Plugin From File…”。
3. 选择 `fusion-reader-for-zotero.xpi`。
4. 在文献列表中选择文献或 PDF 附件，点击工具栏的 Fusion Reader 按钮；也可使用右键菜单。

## 构建安装包
建议您直接下载Release中的构建版本，如需自编译

请在本目录运行：

```bash
./build.sh
```

## 发布 GitHub Release

发布前先修改 `manifest.json` 中的版本号并提交，然后推送同版本标签。例如版本号为 `1.1.0`：

```bash
git push origin main
git tag v1.1.0
git push origin v1.1.0
```

标签推送后，GitHub Actions 会自动检查版本号、构建并验证 XPI，然后创建 Release，上传 `fusion-reader-for-zotero.xpi` 和 `SHA256SUMS`。标签必须与 `manifest.json` 中的版本一致，否则发布会停止。
