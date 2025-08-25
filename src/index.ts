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
} from "siyuan";
import { readDir, getFile, putFile } from "./api";
import "./index.scss";
import { IMenuItem } from "siyuan/types";

const STORAGE_NAME = "config-sync";
const TAB_TYPE = "custom_tab";
const DOCK_TYPE = "dock_tab";

export interface IResponse {
    readonly code: number;
    readonly data: Record<string, any>;
    readonly msg: string;
}

type SyncConfig = {
    selectedKeys: string[];
    data: Record<string, any>;
    time: number;
}

export default class ConfigSyncPlugin extends Plugin {

    private custom: () => Custom;
    private isMobile: boolean;
    private selectOptions = ['logLevel', 'appearance', 'langs', 'lang', 'fileTree', 'tag', 'editor', 'export', 'graph', 'uiLayout', 'userData', 'account', 'readonly', 'localIPs', 'accessAuthCode', 'system', 'keymap', 'sync', 'search', 'flashcard', 'ai', 'bazaar', 'stat', 'api', 'repo', 'publish', 'openHelp', 'showChangelog', 'cloudRegion', 'snippet', 'dataIndexState']
    private selectDefault = ['logLevel', 'appearance', 'fileTree', 'tag', 'editor', 'graph', 'uiLayout', 'account', 'keymap', 'search', 'flashcard', 'ai', 'bazaar', 'stat', 'openHelp', 'showChangelog', 'cloudRegion', 'snippet', 'dataIndexState'];

    updateProtyleToolbar(toolbar: Array<string | IMenuItem>) {
        toolbar.push("|");
        toolbar.push({
            name: "insert-smail-emoji",
            icon: "iconEmoji",
            hotkey: "⇧⌘I",
            tipPosition: "n",
            tip: this.i18n.insertEmoji,
            click(protyle: Protyle) {
                protyle.insert("😊");
            }
        });
        return toolbar;
    }

    async onload() {
        console.log(this.i18n.helloPlugin);

        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        if (this.isMobile) {
            console.warn("移动端暂不支持配置同步");
            return;
        }

        // 初始化设置面板
        this.initSettingPanel();

        this.eventBus.on("sync-end", async () => {
            const localConfig: SyncConfig = await this.getLocalStorageAsync();
            const couldConfig: SyncConfig = await this.loadData(STORAGE_NAME);
            console.log(localConfig, couldConfig);

            // if (JSON.stringify(localConfig.selectedKeys) == JSON.stringify(couldConfig.selectedKeys) &&
            //     JSON.stringify(localConfig.data) == JSON.stringify(couldConfig.data)) {
            if (JSON.stringify(localConfig) == JSON.stringify(couldConfig)) {
                console.log("配置无变化");
                return;
            }

            if (couldConfig?.time > localConfig?.time) {
                console.log("配置下载");
                await this.setLocalStorageAsync(couldConfig);
                await this.setConfFileAsync(couldConfig.data, couldConfig.time);
            } else {
                console.log("配置上传");
                localConfig.time = Date.now();
                await this.setLocalStorageAsync(localConfig);
                await this.saveData(STORAGE_NAME, localConfig);
            }
        });


        //         // 图标的制作参见帮助文档
        //         this.addIcons(`<symbol id="iconConfigSync" viewBox="0 0 32 32">
        // <path d="M27.802 5.197c-2.925-3.194-7.13-5.197-11.803-5.197-8.837 0-16 7.163-16 16h3c0-7.18 5.82-13 13-13 3.844 0 7.298 1.669 9.678 4.322l-4.678 4.678h11v-11l-4.198 4.197zM29 16c0 7.18-5.82 13-13 13-3.844 0-7.298-1.669-9.678-4.322l4.678-4.678h-11v11l4.197-4.197c2.925 3.194 7.13 5.197 11.803 5.197 8.837 0 16-7.163 16-16h-3z"></path>
        // </symbol>`);

        //         // 添加顶部菜单按钮
        //         this.addTopBar({
        //             icon: "iconConfigSync",
        //             title: this.i18n.configSync,
        //             position: "right",
        //             callback: () => {
        //                 this.initSettingPanel();
        //             }
        //         });


        console.log(this.i18n.helloPlugin);
    }

    // 初始化配置数据结构
    // private async initDataAsync() {
    //     if (!this.data[STORAGE_NAME] || this.data[STORAGE_NAME] == "undefined") {
    //         const conf = await this.getConfFileAsync();
    //         this.data[STORAGE_NAME] = {
    //             selectedKeys: ['logLevel', 'appearance', 'fileTree', 'tag', 'editor', 'graph', 'uiLayout', 'account', 'keymap', 'search', 'flashcard', 'ai', 'bazaar', 'stat', 'openHelp', 'showChangelog', 'cloudRegion', 'snippet', 'dataIndexState'],
    //             data: conf.data,
    //             time: conf.time,
    //         } as SyncConfig;
    //         this.saveData(STORAGE_NAME, this.data[STORAGE_NAME]);
    //     }
    // }

    private async getLocalStorageAsync(): Promise<SyncConfig> {
        let storage: SyncConfig = this.data[STORAGE_NAME];
        if (!storage) {
            storage = await fetch("/api/storage/getLocalStorage", {
                method: "POST",
            })
                .then(res => res.json() as Promise<IResponse>)
                .then(res => res.data[STORAGE_NAME]);
        }
        const keys = storage?.selectedKeys ?? this.selectDefault;
        const data = await this.getConfFileAsync(keys);
        return {
            selectedKeys: keys,
            data: data,
            time: storage?.time ?? 0,
        };
    }

    private async setLocalStorageAsync(config: SyncConfig) {
        return await fetch("/api/storage/setLocalStorageVal", {
            method: "POST",
            body: JSON.stringify({ app: STORAGE_NAME, key: STORAGE_NAME, val: config }),
        })
    }

    private async getConfFileAsync(keys: string[]): Promise<Record<string, any>> {
        try {
            const data = await getFile("/conf/conf.json");
            // const time = await readDir("/conf").then((res) => res.find(e => e.isDir === false && e.name === "conf.json")?.updated ?? 0);
            let result: Record<string, any> = {};
            keys.forEach(key => {
                result[key] = data[key];
            })
            return result;
        } catch (error) {
            console.error("Failed to get conf.json file:", error);
            return null;
        }
    }

    private async setConfFileAsync(data: Record<string, any>, time: number) {
        try {
            const source = await getFile("/conf/conf.json");
            const jsonString = JSON.stringify({ ...source, ...data }, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            await putFile("/conf/conf.json", false, blob);
            return true;
        } catch (error) {
            console.error("保存失败");
            console.error("Failed to set conf.json file:", error);
            return false;
        }
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

        // 使用selectOptions创建复选框列表
        this.selectOptions.forEach(key => {
            const itemElement = document.createElement("label");
            itemElement.className = "fn__flex b3-label config-sync-item";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "b3-switch fn__flex-center";
            checkbox.checked = config?.selectedKeys?.includes(key) || false;
            checkbox.addEventListener("change", () => {
                if (!config.selectedKeys) {
                    config.selectedKeys = this.selectDefault;
                }

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

        // 添加到设置面板
        this.setting.addItem({
            title: this.i18n.configSync,
            description: this.i18n.selectConfigToSync,
            createActionElement: () => {
                return syncConfigContainer;
            }
        });
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
                        refDefs: [{ refID: this.getEditor().protyle.block.rootID }],
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
                        doc: { id: this.getEditor().protyle.block.rootID }
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
