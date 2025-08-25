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


        // 图标的制作参见帮助文档
        this.addIcons(`<symbol id="iconConfigSync" viewBox="0 0 32 32">
            <path d="M0 0 C10.56 0 21.12 0 32 0 C32 10.56 32 21.12 32 32 C21.44 32 10.88 32 0 32 C0 21.44 0 10.88 0 0 Z " fill="#FAFAFC" transform="translate(0,0)"/>
            <path d="M0 0 C2.56282742 0.72965366 2.56282742 0.72965366 5 1 C5.66 0.34 6.32 -0.32 7 -1 C9.625 -0.625 9.625 -0.625 12 0 C12 2.31 12 4.62 12 7 C15.465 8.485 15.465 8.485 19 10 C19.25 16.625 19.25 16.625 17 20 C16.87625 20.680625 16.7525 21.36125 16.625 22.0625 C16 24 16 24 13.9375 25.25 C13.298125 25.4975 12.65875 25.745 12 26 C12.66 24.68 13.32 23.36 14 22 C11.87436897 22.11376617 9.7494739 22.24135631 7.625 22.375 C5.84996094 22.47941406 5.84996094 22.47941406 4.0390625 22.5859375 C0.89437681 22.70217346 0.89437681 22.70217346 -1 25 C-3.625 24.625 -3.625 24.625 -6 24 C-6 21.33333333 -6 18.66666667 -6 16 C-7.65 15.67 -9.3 15.34 -11 15 C-11 13.02 -11 11.04 -11 9 C-9.35 8.34 -7.7 7.68 -6 7 C-6 4.69 -6 2.38 -6 0 C-3.44211818 -1.27894091 -2.70140697 -0.77183056 0 0 Z " fill="#F4F5F9" transform="translate(13,4)"/>
            <path d="M0 0 C2.56282742 0.72965366 2.56282742 0.72965366 5 1 C5.66 0.34 6.32 -0.32 7 -1 C9.625 -0.625 9.625 -0.625 12 0 C12 2.31 12 4.62 12 7 C13.65 7.66 15.3 8.32 17 9 C17 10.98 17 12.96 17 15 C16.67 15 16.34 15 16 15 C16 13.35 16 11.7 16 10 C15.21625 10.04125 14.4325 10.0825 13.625 10.125 C11 10 11 10 9 8 C9.375 4.375 9.375 4.375 10 1 C9.46375 1.495 8.9275 1.99 8.375 2.5 C5.31754465 4.43102443 3.561827 4.44522837 0 4 C-2.375 2.5 -2.375 2.5 -4 1 C-3.67 3.31 -3.34 5.62 -3 8 C-6.625 11 -6.625 11 -10 11 C-10 11.66 -10 12.32 -10 13 C-9.21625 13.12375 -8.4325 13.2475 -7.625 13.375 C-5 14 -5 14 -3 16 C-3.375 19.625 -3.375 19.625 -4 23 C-2.35 22.34 -0.7 21.68 1 21 C0.34 22.32 -0.32 23.64 -1 25 C-2.65 24.67 -4.3 24.34 -6 24 C-6 21.33333333 -6 18.66666667 -6 16 C-7.65 15.67 -9.3 15.34 -11 15 C-11 13.02 -11 11.04 -11 9 C-9.35 8.34 -7.7 7.68 -6 7 C-6 4.69 -6 2.38 -6 0 C-3.44211818 -1.27894091 -2.70140697 -0.77183056 0 0 Z " fill="#97A3CB" transform="translate(13,4)"/>
            <path d="M0 0 C4.95 0 9.9 0 15 0 C14 4 14 4 11.9375 5.25 C10.9784375 5.62125 10.9784375 5.62125 10 6 C10.66 4.68 11.32 3.36 12 2 C8.04 2 4.08 2 0 2 C0 1.34 0 0.68 0 0 Z " fill="#2D48B9" transform="translate(15,24)"/>
            <path d="M0 0 C0.66 0 1.32 0 2 0 C1.67 1.32 1.34 2.64 1 4 C4.63 4 8.26 4 12 4 C12 4.66 12 5.32 12 6 C7.05 6 2.1 6 -3 6 C-2 4 -1 2 0 0 Z " fill="#2D49B9" transform="translate(18,16)"/>
            <path d="M0 0 C1.4540625 0.0309375 1.4540625 0.0309375 2.9375 0.0625 C3.2675 1.0525 3.5975 2.0425 3.9375 3.0625 C2.2875 2.7325 0.6375 2.4025 -1.0625 2.0625 C-1.0625 3.3825 -1.0625 4.7025 -1.0625 6.0625 C-1.0625 6.7225 -1.0625 7.3825 -1.0625 8.0625 C-2.0525 7.7325 -3.0425 7.4025 -4.0625 7.0625 C-4.10504356 5.06295254 -4.10330783 3.06208364 -4.0625 1.0625 C-3.0625 0.0625 -3.0625 0.0625 0 0 Z " fill="#99A4CB" transform="translate(16.0625,11.9375)"/>
        </symbol>`);

        // 添加顶部菜单按钮
        this.addTopBar({
            icon: "iconConfigSync",
            title: this.i18n.configSyncSettings,
            position: "right",
            callback: () => {
                this.openSetting();
            }
        });


        console.log(this.i18n.helloPlugin);
    }

    // 自定义设置
    async openSetting() {
        const selectedKeys = (await this.getLocalStorageAsync()).selectedKeys;
        // 生成复选框列表HTML
        const checkboxList = this.selectOptions.map(option => {
            const isChecked = selectedKeys.includes(option) ? 'checked' : '';
            return `
                <label class="fn__flex" style="align-items: center; margin-bottom: 8px;">
                    <input type="checkbox" 
                           class="b3-switch fn__flex-shrink" 
                           value="${option}" 
                           ${isChecked}>
                    <span class="fn__space"></span>
                    <span style="margin-top: 0;">${option}</span>
                </label>
            `;
        }).join('');

        const dialog = new Dialog({
            title: this.i18n.configSyncSettings,
            content: `<div class="b3-dialog__content">
                <div class="fn__flex-column" style="max-height: 350px; overflow-y: auto;">
                    ${checkboxList}
                </div>
            </div>
            <div class="b3-dialog__action">
                <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button><div class="fn__space"></div>
                <button class="b3-button b3-button--text">${this.i18n.save}</button>
            </div>`,
            width: this.isMobile ? "92vw" : "520px",
        });
        const checkboxElements = dialog.element.querySelectorAll('input[type="checkbox"]');
        const btnsElement = dialog.element.querySelectorAll(".b3-button");

        btnsElement[0].addEventListener("click", () => {
            dialog.destroy();
        });
        btnsElement[1].addEventListener("click", async () => {
            // 获取选中的复选框值
            const selectedOptions: string[] = [];
            checkboxElements.forEach((checkbox: HTMLInputElement) => {
                if (checkbox.checked) {
                    selectedOptions.push(checkbox.value);
                }
            });
            // 打印所有选中项到控制台
            console.log("选中的配置项:", selectedOptions);
            // 更新selectDefault
            const localConfig = await this.getLocalStorageAsync();
            localConfig.selectedKeys = selectedOptions;
            localConfig.time = Date.now();
            await this.setLocalStorageAsync(localConfig);
            this.saveData(STORAGE_NAME, localConfig);
            dialog.destroy();
        });
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



    onunload() {
        console.log(this.i18n.byePlugin);
    }

    uninstall() {
        console.log("uninstall");
    }
}
