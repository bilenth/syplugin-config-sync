[English](https://github.com/bilenth/syplugin-config-sync/blob/main/README.md)

# 思源笔记插件 - 配置同步

- 可以同步快捷键、外观布局等配置
- 插件仅支持桌面端，不支持移动端
- 您的配置不会泄露，插件利用思源同步会同步data目录的机制，把配置上传到`/data/storage`中，通过比对localStorage判断新旧
- 插件刚开发，怕有测试不到位的，建议安装前先备份工作空间下的`/conf/conf.json`文件

## 选择要同步的配置

![图片描述](https://github.com/bilenth/syplugin-config-sync/blob/main/preview.png?raw=true)
