[中文](https://github.com/bilenth/syplugin-config-sync/blob/main/README_zh_CN.md)

# SiYuan Plugin - Config Sync

- Sync configurations like hotkeys, theme, layout, etc.
- This plugin only supports desktop, not mobile.
- Your configurations will not be leaked. The plugin utilizes the mechanism of SiYuan sync to upload configurations to `/data/storage`, and compares localStorage to determine whether the configurations are new or old.
- The plugin is just developed, so there may be some bugs. It is recommended to back up the `/conf/conf.json` file in the workspace before installation.

## Select Configurations to Sync

![图片描述](https://github.com/bilenth/syplugin-config-sync/blob/main/preview.png?raw=true)