import {
    Plugin,
    showMessage,
    confirm,
    Dialog,
    Menu,
    openTab,
    adaptHotkey,
    getFrontend,
    getBackend,
    Setting,
    fetchPost,
    Protyle,
    openWindow,
    IOperation,
    Constants,
    openMobileFileById,
    lockScreen,
    ICard,
    ICardData,
    Custom,
    exitSiYuan,
    getModelByDockType,
    getAllEditor,
    Files,
    platformUtils,
    openSetting,
    openAttributePanel,
    saveLayout,
    EventBus
} from "siyuan";
import "./index.scss";
import {IMenuItem} from "siyuan/types";

const STORAGE_NAME = "config-sync";
const TAB_TYPE = "custom_tab";
const DOCK_TYPE = "dock_tab";

interface SyncConfig {
    selectedKeys: string[];
    lastSyncTime: number;
    cloudData: Record<string, any>;
}

export default class ConfigSyncPlugin extends Plugin {

    private isMobile: boolean;
    private eventBusListeners: Array<{eventBus: EventBus, type: string, listener: (event: CustomEvent) => void}> = [];

    // 初始化配置数据结构
    private initData() {
        if (!this.data[STORAGE_NAME]) {
            this.data[STORAGE_NAME] = {
                selectedKeys: [],
                lastSyncTime: 0,
                cloudData: {}
            };
            this.saveData(STORAGE_NAME, this.data[STORAGE_NAME]);
        }
    }

    onload() {
        this.initData();
        console.log(this.i18n.helloPlugin);

        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        
        // 添加同步图标
        this.addIcons(`<symbol id="iconConfigSync" viewBox="0 0 32 32">
<path d="M27.802 5.197c-2.925-3.194-7.13-5.197-11.803-5.197-8.837 0-16 7.163-16 16h3c0-7.18 5.82-13 13-13 3.844 0 7.298 1.669 9.678 4.322l-4.678 4.678h11v-11l-4.198 4.197zM29 16c0 7.18-5.82 13-13 13-3.844 0-7.298-1.669-9.678-4.322l4.678-4.678h-11v11l4.197-4.197c2.925 3.194 7.13 5.197 11.803 5.197 8.837 0 16-7.163 16-16h-3z"></path>
</symbol>`);

        // 添加顶部菜单按钮
        this.addTopBar({
            icon: "iconConfigSync",
            title: this.i18n.configSync,
            position: "right",
            callback: () => {
                this.showSettingDialog();
            }
        });

        // 添加命令
        this.addCommand({
            langKey: "configSyncSettings",
            hotkey: "⇧⌘S",
            callback: () => {
                this.showSettingDialog();
            },
        });
        
        // 监听事件总线
        this.registerEventBusListeners();
        
        // 初始化设置面板
        this.initSettingPanel();
        // 初始化设置面板
        this.initSettingPanel();
    }

    // 初始化设置面板
    private initSettingPanel() {
        const config = this.data[STORAGE_NAME] as SyncConfig;
        this.setting = new Setting({
            confirmCallback: () => {
                this.saveData(STORAGE_NAME, config);
                showMessage(this.i18n.save);
            }
        });

        // 添加同步配置选择区域
        const syncConfigContainer = document.createElement("div");
        syncConfigContainer.className = "config-sync-container";
        
        // 添加标题
        const titleElement = document.createElement("div");
        titleElement.className = "config-sync-title b3-label";
        titleElement.textContent = this.i18n.selectConfigToSync;
        syncConfigContainer.appendChild(titleElement);
        
        // 添加配置项列表
        const configListElement = document.createElement("div");
        configListElement.className = "config-sync-list";
        syncConfigContainer.appendChild(configListElement);
        
        // 获取全局配置的第一层键
        this.getGlobalConfigKeys().then(keys => {
            keys.forEach(key => {
                const itemElement = document.createElement("label");
                itemElement.className = "fn__flex b3-label config-sync-item";
                
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "b3-switch fn__flex-center";
                checkbox.checked = config.selectedKeys.includes(key);
                checkbox.addEventListener("change", () => {
                    if (checkbox.checked) {
                        if (!config.selectedKeys.includes(key)) {
                            config.selectedKeys.push(key);
                        }
                    } else {
                        const index = config.selectedKeys.indexOf(key);
                        if (index > -1) {
                            config.selectedKeys.splice(index, 1);
                        }
                    }
                });
                
                const textElement = document.createElement("span");
                textElement.className = "fn__space";
                textElement.textContent = key;
                
                itemElement.appendChild(checkbox);
                itemElement.appendChild(textElement);
                configListElement.appendChild(itemElement);
            });
        });
        
        // 添加同步按钮
        const syncButton = document.createElement("button");
        syncButton.className = "b3-button b3-button--outline fn__flex-center fn__size200";
        syncButton.textContent = this.i18n.syncNow;
        syncButton.addEventListener("click", () => {
            this.syncConfigs();
        });
        
        // 添加上次同步时间显示
        const lastSyncElement = document.createElement("div");
        lastSyncElement.className = "b3-label";
        if (config.lastSyncTime > 0) {
            const date = new Date(config.lastSyncTime);
            lastSyncElement.textContent = `${this.i18n.lastSyncTime}: ${date.toLocaleString()}`;
        } else {
            lastSyncElement.textContent = `${this.i18n.lastSyncTime}: -`;
        }
        
        // 添加到设置面板
        this.setting.addItem({
            title: this.i18n.configSync,
            description: this.i18n.selectConfigToSync,
            createActionElement: () => {
                const container = document.createElement("div");
                container.className = "fn__flex-column";
                container.appendChild(syncConfigContainer);
                container.appendChild(document.createElement("div")).className = "fn__space";
                container.appendChild(syncButton);
                container.appendChild(document.createElement("div")).className = "fn__space";
                container.appendChild(lastSyncElement);
                return container;
            }
        });

    }

    // 显示设置对话框
    private showSettingDialog() {
        const dialog = new Dialog({
            title: this.i18n.configSyncSettings,
            content: `<div class="b3-dialog__content">
                <div class="fn__flex-column">
                    <div class="config-sync-dialog-container" style="padding: 16px;"></div>
                </div>
            </div>`,
            width: this.isMobile ? "92vw" : "520px",
            height: this.isMobile ? "80vh" : "640px",
        });
        
        const settingElement = dialog.element.querySelector(".config-sync-dialog-container");
        if (settingElement) {
            this.setting.renderTo(settingElement);
        }
    }

    // 获取全局配置的第一层键
    private async getGlobalConfigKeys(): Promise<string[]> {
        try {
            // 使用fetchPost获取全局配置
            const response = await fetchPost("/api/system/getConf", {});
            if (response && response.code === 0 && response.data) {
                // 获取全局配置的第一层键
                return Object.keys(response.data);
            }
            return [];
        } catch (error) {
            console.error("Failed to get global config keys:", error);
            return [];
        }
    }

    // 获取全局配置
    private async getGlobalConfig(): Promise<Record<string, any>> {
        try {
            const response = await fetchPost("/api/system/getConf", {});
            if (response && response.code === 0 && response.data) {
                return response.data;
            }
            return {};
        } catch (error) {
            console.error("Failed to get global config:", error);
            return {};
        }
    }

    // 同步配置
    private async syncConfigs() {
        const config = this.data[STORAGE_NAME] as SyncConfig;
        if (!config.selectedKeys || config.selectedKeys.length === 0) {
            showMessage(this.i18n.selectConfigToSync);
            return;
        }

        try {
            // 获取当前全局配置
            const globalConfig = await this.getGlobalConfig();
            
            // 获取云端配置
            const cloudConfig = await this.getCloudConfig();
            
            // 如果没有云端配置，则上传当前配置
            if (!cloudConfig || Object.keys(cloudConfig).length === 0) {
                await this.uploadConfig(globalConfig, config.selectedKeys);
                showMessage(this.i18n.syncSuccess);
                return;
            }
            
            // 比较本地和云端配置的更新时间
            if (config.lastSyncTime < cloudConfig.lastSyncTime) {
                // 云端配置较新，询问用户是否使用云端配置
                this.confirmSyncDialog(this.i18n.cloudNewer, async () => {
                    // 使用云端配置更新本地
                    await this.updateLocalConfig(cloudConfig.data, config.selectedKeys);
                    config.cloudData = cloudConfig.data;
                    config.lastSyncTime = Date.now();
                    this.saveData(STORAGE_NAME, config);
                    showMessage(this.i18n.syncSuccess);
                });
            } else {
                // 本地配置较新，上传到云端
                await this.uploadConfig(globalConfig, config.selectedKeys);
                showMessage(this.i18n.syncSuccess);
            }
        } catch (error) {
            console.error("Sync failed:", error);
            showMessage(this.i18n.syncFailed);
        }
    }

    // 获取云端配置
    private async getCloudConfig(): Promise<{data: Record<string, any>, lastSyncTime: number}> {
        try {
            // 使用云端存储API获取配置
            const response = await fetchPost("/api/storage/getCloudStorage", {
                key: "syplugin-config-sync"
            });
            
            if (response && response.code === 0 && response.data) {
                return JSON.parse(response.data);
            }
            return { data: {}, lastSyncTime: 0 };
        } catch (error) {
            console.error("Failed to get cloud config:", error);
            return { data: {}, lastSyncTime: 0 };
        }
    }

    // 上传配置到云端
    private async uploadConfig(globalConfig: Record<string, any>, selectedKeys: string[]) {
        try {
            // 提取选中的配置项
            const configToUpload: Record<string, any> = {};
            selectedKeys.forEach(key => {
                if (globalConfig[key] !== undefined) {
                    configToUpload[key] = globalConfig[key];
                }
            });
            
            // 准备上传数据
            const uploadData = {
                data: configToUpload,
                lastSyncTime: Date.now()
            };
            
            // 上传到云端存储
            const response = await fetchPost("/api/storage/setCloudStorage", {
                key: "syplugin-config-sync",
                value: JSON.stringify(uploadData)
            });
            
            if (response && response.code === 0) {
                // 更新本地存储的云端数据和同步时间
                const config = this.data[STORAGE_NAME] as SyncConfig;
                config.cloudData = configToUpload;
                config.lastSyncTime = uploadData.lastSyncTime;
                this.saveData(STORAGE_NAME, config);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Failed to upload config:", error);
            return false;
        }
    }

    // 更新本地配置
    private async updateLocalConfig(cloudData: Record<string, any>, selectedKeys: string[]) {
        try {
            // 获取当前全局配置
            const globalConfig = await this.getGlobalConfig();
            
            // 合并云端配置到本地
            const updatedConfig: Record<string, any> = { ...globalConfig };
            selectedKeys.forEach(key => {
                if (cloudData[key] !== undefined) {
                    updatedConfig[key] = cloudData[key];
                }
            });
            
            // 更新本地配置
            const response = await fetchPost("/api/system/setConf", {
                conf: updatedConfig
            });
            
            return response && response.code === 0;
        } catch (error) {
            console.error("Failed to update local config:", error);
            return false;
        }
    }

    // 确认同步对话框
    private confirmSyncDialog(message: string, callback: () => void) {
        confirm(message, message, () => {
            callback();
        }, () => {
            // 用户取消，不执行任何操作
        });
    }

    // 注册事件总线监听器
    private registerEventBusListeners() {
        // 监听配置变更事件
        const configChangedListener = (event: CustomEvent) => {
            // 当配置变更时，检查是否需要同步
            this.checkAndSyncConfig();
        };
        
        // 获取事件总线
        const eventBus = window.siyuan?.eventBus;
        if (eventBus) {
            // 监听配置变更事件
            eventBus.on("config-changed", configChangedListener);
            
            // 保存监听器引用，以便在卸载插件时移除
            this.eventBusListeners.push({
                eventBus,
                type: "config-changed",
                listener: configChangedListener
            });
        }
    }

    // 检查并同步配置
    private async checkAndSyncConfig() {
        const config = this.data[STORAGE_NAME] as SyncConfig;
        if (!config.selectedKeys || config.selectedKeys.length === 0) {
            return;
        }
        
        try {
            // 获取云端配置
            const cloudConfig = await this.getCloudConfig();
            
            // 如果云端配置较新，提示用户
            if (cloudConfig && cloudConfig.lastSyncTime > config.lastSyncTime) {
                showMessage(this.i18n.cloudNewer);
            }
        } catch (error) {
            console.error("Failed to check config:", error);
        }
    }
    // 卸载插件
    onunload() {
        // 移除事件监听器
        this.eventBusListeners.forEach(({ eventBus, type, listener }) => {
            eventBus.off(type, listener);
        });
        this.eventBusListeners = [];
        console.log(this.i18n.byePlugin);
    }
    }

    onLayoutReady() {
        const topBarElement = this.addTopBar({
            icon: "iconFace",
            title: this.i18n.addTopBarIcon,
            position: "right",
            callback: () => {
                if (this.isMobile) {
                    this.addMenu();
                } else {
                    let rect = topBarElement.getBoundingClientRect();
                    // 如果被隐藏，则使用更多按钮
                    if (rect.width === 0) {
                        rect = document.querySelector("#barMore").getBoundingClientRect();
                    }
                    if (rect.width === 0) {
                        rect = document.querySelector("#barPlugins").getBoundingClientRect();
                    }
                    this.addMenu(rect);
                }
            }
        });
        const statusIconTemp = document.createElement("template");
        statusIconTemp.innerHTML = `<div class="toolbar__item ariaLabel" aria-label="Remove plugin-sample Data">
    <svg>
        <use xlink:href="#iconTrashcan"></use>
    </svg>
</div>`;
        statusIconTemp.content.firstElementChild.addEventListener("click", () => {
            confirm("⚠️", this.i18n.confirmRemove.replace("${name}", this.name), () => {
                this.removeData(STORAGE_NAME).then(() => {
                    this.data[STORAGE_NAME] = {readonlyText: "Readonly"};
                    showMessage(`[${this.name}]: ${this.i18n.removedData}`);
                });
            });
        });
        this.addStatusBar({
            element: statusIconTemp.content.firstElementChild as HTMLElement,
        });
        this.loadData(STORAGE_NAME);
        console.log(`frontend: ${getFrontend()}; backend: ${getBackend()}`);
    }

    onunload() {
        console.log(this.i18n.byePlugin);
    }

    uninstall() {
        console.log("uninstall");
    }

    async updateCards(options: ICardData) {
        options.cards.sort((a: ICard, b: ICard) => {
            if (a.blockID < b.blockID) {
                return -1;
            }
            if (a.blockID > b.blockID) {
                return 1;
            }
            return 0;
        });
        return options;
    }

    /* 自定义设置
    openSetting() {
        const dialog = new Dialog({
            title: this.name,
            content: `<div class="b3-dialog__content"><textarea class="b3-text-field fn__block" placeholder="readonly text in the menu"></textarea></div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button><div class="fn__space"></div>
    <button class="b3-button b3-button--text">${this.i18n.save}</button>
</div>`,
            width: this.isMobile ? "92vw" : "520px",
        });
        const inputElement = dialog.element.querySelector("textarea");
        inputElement.value = this.data[STORAGE_NAME].readonlyText;
        const btnsElement = dialog.element.querySelectorAll(".b3-button");
        dialog.bindInput(inputElement, () => {
            (btnsElement[1] as HTMLButtonElement).click();
        });
        inputElement.focus();
        btnsElement[0].addEventListener("click", () => {
            dialog.destroy();
        });
        btnsElement[1].addEventListener("click", () => {
            this.saveData(STORAGE_NAME, {readonlyText: inputElement.value});
            dialog.destroy();
        });
    }
    */

    private eventBusPaste(event: any) {
        // 如果需异步处理请调用 preventDefault， 否则会进行默认处理
        event.preventDefault();
        // 如果使用了 preventDefault，必须调用 resolve，否则程序会卡死
        event.detail.resolve({
            textPlain: event.detail.textPlain.trim(),
        });
    }

    private eventBusLog({detail}: any) {
        console.log(detail);
    }

    private blockIconEvent({detail}: any) {
        detail.menu.addItem({
            id: "pluginSample_removeSpace",
            iconHTML: "",
            label: this.i18n.removeSpace,
            click: () => {
                const doOperations: IOperation[] = [];
                detail.blockElements.forEach((item: HTMLElement) => {
                    const editElement = item.querySelector('[contenteditable="true"]');
                    if (editElement) {
                        editElement.textContent = editElement.textContent.replace(/ /g, "");
                        doOperations.push({
                            id: item.dataset.nodeId,
                            data: item.outerHTML,
                            action: "update"
                        });
                    }
                });
                detail.protyle.getInstance().transaction(doOperations);
            }
        });
    }

    private showDialog() {
        const dialog = new Dialog({
            title: `SiYuan ${Constants.SIYUAN_VERSION}`,
            content: `<div class="b3-dialog__content">
    <div>appId:</div>
    <div class="fn__hr"></div>
    <div class="plugin-sample__time">${this.app.appId}</div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div>API demo:</div>
    <div class="fn__hr"></div>
    <div class="plugin-sample__time">System current time: <span id="time"></span></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div>Protyle demo:</div>
    <div class="fn__hr"></div>
    <div id="protyle" style="height: 360px;"></div>
</div>`,
            width: this.isMobile ? "92vw" : "560px",
            height: "540px",
        });
        new Protyle(this.app, dialog.element.querySelector("#protyle"), {
            blockId: this.getEditor().protyle.block.rootID,
        });
        fetchPost("/api/system/currentTime", {}, (response) => {
            dialog.element.querySelector("#time").innerHTML = new Date(response.data).toString();
        });
    }

    private addMenu(rect?: DOMRect) {
        const menu = new Menu("topBarSample", () => {
            console.log(this.i18n.byeMenu);
        });
        menu.addItem({
            icon: "iconSettings",
            label: "Open Setting",
            click: () => {
                openSetting(this.app);
            }
        });
        menu.addItem({
            icon: "iconDrag",
            label: "Open Attribute Panel",
            click: () => {
                openAttributePanel({
                    nodeElement: this.getEditor().protyle.wysiwyg.element.firstElementChild as HTMLElement,
                    protyle: this.getEditor().protyle,
                    focusName: "custom",
                });
            }
        });
        menu.addItem({
            icon: "iconInfo",
            label: "Dialog(open doc first)",
            accelerator: this.commands[0].customHotkey,
            click: () => {
                this.showDialog();
            }
        });
        menu.addItem({
            icon: "iconFocus",
            label: "Select Opened Doc(open doc first)",
            click: () => {
                (getModelByDockType("file") as Files).selectItem(this.getEditor().protyle.notebookId, this.getEditor().protyle.path);
            }
        });
        if (!this.isMobile) {
            menu.addItem({
                icon: "iconFace",
                label: "Open Custom Tab",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        custom: {
                            icon: "iconFace",
                            title: "Custom Tab",
                            data: {
                                text: platformUtils.isHuawei() ? "Hello, Huawei!" : "This is my custom tab",
                            },
                            id: this.name + TAB_TYPE
                        },
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconImage",
                label: "Open Asset Tab(First open the Chinese help document)",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        asset: {
                            path: "assets/paragraph-20210512165953-ag1nib4.svg"
                        }
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconFile",
                label: "Open Doc Tab(open doc first)",
                click: async () => {
                    const tab = await openTab({
                        app: this.app,
                        doc: {
                            id: this.getEditor().protyle.block.rootID,
                        }
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconSearch",
                label: "Open Search Tab",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        search: {
                            k: "SiYuan"
                        }
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconRiffCard",
                label: "Open Card Tab",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        card: {
                            type: "all"
                        }
                    });
                    console.log(tab);
                }
            });
            menu.addItem({
                icon: "iconLayout",
                label: "Open Float Layer(open doc first)",
                click: () => {
                    this.addFloatLayer({
                        refDefs: [{refID: this.getEditor().protyle.block.rootID}],
                        x: window.innerWidth - 768 - 120,
                        y: 32,
                        isBacklink: false
                    });
                }
            });
            menu.addItem({
                icon: "iconOpenWindow",
                label: "Open Doc Window(open doc first)",
                click: () => {
                    openWindow({
                        doc: {id: this.getEditor().protyle.block.rootID}
                    });
                }
            });
        } else {
            menu.addItem({
                icon: "iconFile",
                label: "Open Doc(open doc first)",
                click: () => {
                    openMobileFileById(this.app, this.getEditor().protyle.block.rootID);
                }
            });
        }
        menu.addItem({
            icon: "iconLock",
            label: "Lockscreen",
            click: () => {
                lockScreen(this.app);
            }
        });
        menu.addItem({
            icon: "iconQuit",
            label: "Exit Application",
            click: () => {
                exitSiYuan();
            }
        });
        menu.addItem({
            icon: "iconDownload",
            label: "Save Layout",
            click: () => {
                saveLayout(() => {
                    showMessage("Layout saved");
                });
            }
        });
        menu.addItem({
            icon: "iconScrollHoriz",
            label: "Event Bus",
            type: "submenu",
            submenu: [{
                icon: "iconSelect",
                label: "On ws-main",
                click: () => {
                    this.eventBus.on("ws-main", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off ws-main",
                click: () => {
                    this.eventBus.off("ws-main", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On click-blockicon",
                click: () => {
                    this.eventBus.on("click-blockicon", this.blockIconEventBindThis);
                }
            }, {
                icon: "iconClose",
                label: "Off click-blockicon",
                click: () => {
                    this.eventBus.off("click-blockicon", this.blockIconEventBindThis);
                }
            }, {
                icon: "iconSelect",
                label: "On click-pdf",
                click: () => {
                    this.eventBus.on("click-pdf", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off click-pdf",
                click: () => {
                    this.eventBus.off("click-pdf", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On click-editorcontent",
                click: () => {
                    this.eventBus.on("click-editorcontent", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off click-editorcontent",
                click: () => {
                    this.eventBus.off("click-editorcontent", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On click-editortitleicon",
                click: () => {
                    this.eventBus.on("click-editortitleicon", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off click-editortitleicon",
                click: () => {
                    this.eventBus.off("click-editortitleicon", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On click-flashcard-action",
                click: () => {
                    this.eventBus.on("click-flashcard-action", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off click-flashcard-action",
                click: () => {
                    this.eventBus.off("click-flashcard-action", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-noneditableblock",
                click: () => {
                    this.eventBus.on("open-noneditableblock", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-noneditableblock",
                click: () => {
                    this.eventBus.off("open-noneditableblock", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On loaded-protyle-static",
                click: () => {
                    this.eventBus.on("loaded-protyle-static", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off loaded-protyle-static",
                click: () => {
                    this.eventBus.off("loaded-protyle-static", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On loaded-protyle-dynamic",
                click: () => {
                    this.eventBus.on("loaded-protyle-dynamic", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off loaded-protyle-dynamic",
                click: () => {
                    this.eventBus.off("loaded-protyle-dynamic", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On switch-protyle",
                click: () => {
                    this.eventBus.on("switch-protyle", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off switch-protyle",
                click: () => {
                    this.eventBus.off("switch-protyle", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On destroy-protyle",
                click: () => {
                    this.eventBus.on("destroy-protyle", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off destroy-protyle",
                click: () => {
                    this.eventBus.off("destroy-protyle", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-doctree",
                click: () => {
                    this.eventBus.on("open-menu-doctree", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-doctree",
                click: () => {
                    this.eventBus.off("open-menu-doctree", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-blockref",
                click: () => {
                    this.eventBus.on("open-menu-blockref", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-blockref",
                click: () => {
                    this.eventBus.off("open-menu-blockref", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-fileannotationref",
                click: () => {
                    this.eventBus.on("open-menu-fileannotationref", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-fileannotationref",
                click: () => {
                    this.eventBus.off("open-menu-fileannotationref", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-tag",
                click: () => {
                    this.eventBus.on("open-menu-tag", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-tag",
                click: () => {
                    this.eventBus.off("open-menu-tag", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-link",
                click: () => {
                    this.eventBus.on("open-menu-link", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-link",
                click: () => {
                    this.eventBus.off("open-menu-link", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-image",
                click: () => {
                    this.eventBus.on("open-menu-image", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-image",
                click: () => {
                    this.eventBus.off("open-menu-image", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-av",
                click: () => {
                    this.eventBus.on("open-menu-av", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-av",
                click: () => {
                    this.eventBus.off("open-menu-av", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-content",
                click: () => {
                    this.eventBus.on("open-menu-content", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-content",
                click: () => {
                    this.eventBus.off("open-menu-content", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-breadcrumbmore",
                click: () => {
                    this.eventBus.on("open-menu-breadcrumbmore", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-breadcrumbmore",
                click: () => {
                    this.eventBus.off("open-menu-breadcrumbmore", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-menu-inbox",
                click: () => {
                    this.eventBus.on("open-menu-inbox", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-menu-inbox",
                click: () => {
                    this.eventBus.off("open-menu-inbox", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On input-search",
                click: () => {
                    this.eventBus.on("input-search", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off input-search",
                click: () => {
                    this.eventBus.off("input-search", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On paste",
                click: () => {
                    this.eventBus.on("paste", this.eventBusPaste);
                }
            }, {
                icon: "iconClose",
                label: "Off paste",
                click: () => {
                    this.eventBus.off("paste", this.eventBusPaste);
                }
            }, {
                icon: "iconSelect",
                label: "On open-siyuan-url-plugin",
                click: () => {
                    this.eventBus.on("open-siyuan-url-plugin", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-siyuan-url-plugin",
                click: () => {
                    this.eventBus.off("open-siyuan-url-plugin", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On open-siyuan-url-block",
                click: () => {
                    this.eventBus.on("open-siyuan-url-block", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off open-siyuan-url-block",
                click: () => {
                    this.eventBus.off("open-siyuan-url-block", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On opened-notebook",
                click: () => {
                    this.eventBus.on("opened-notebook", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off opened-notebook",
                click: () => {
                    this.eventBus.off("opened-notebook", this.eventBusLog);
                }
            }, {
                icon: "iconSelect",
                label: "On closed-notebook",
                click: () => {
                    this.eventBus.on("closed-notebook", this.eventBusLog);
                }
            }, {
                icon: "iconClose",
                label: "Off closed-notebook",
                click: () => {
                    this.eventBus.off("closed-notebook", this.eventBusLog);
                }
            }]
        });
        menu.addSeparator();
        menu.addItem({
            icon: "iconSparkles",
            label: this.data[STORAGE_NAME].readonlyText || "Readonly",
            type: "readonly",
        });
        if (this.isMobile) {
            menu.fullscreen();
        } else {
            menu.open({
                x: rect.right,
                y: rect.bottom,
                isLeft: true,
            });
        }
    }

    private getEditor() {
        const editors = getAllEditor();
        if (editors.length === 0) {
            showMessage("please open doc first");
            return;
        }
        return editors[0];
    }
}
