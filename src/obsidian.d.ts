// Type declarations for Obsidian API
declare module 'obsidian' {
	export class App {
		vault: Vault;
		workspace: Workspace;
	}

	export class Vault {
		getAbstractFileByPath(path: string): TFile | TFolder | null;
		getFiles(): TFile[];
		read(file: TFile): Promise<string>;
		modify(file: TFile, data: string): Promise<void>;
		create(path: string, data: string): Promise<TFile>;
		createFolder(path: string): Promise<void>;
		getName(): string;
		adapter: DataAdapter;
	}

	export class DataAdapter {
		basePath?: string;
	}

	export class Workspace {
		// Add workspace methods as needed
	}

	export class TFile {
		path: string;
		name: string;
		extension: string;
	}

	export class TFolder {
		path: string;
		name: string;
	}

	export class Plugin {
		app: App;
		addRibbonIcon(icon: string, title: string, callback: (evt: MouseEvent) => void): HTMLElement;
		addCommand(command: Command): void;
		addSettingTab(settingTab: PluginSettingTab): void;
		loadData(): Promise<any>;
		saveData(data: any): Promise<void>;
	}

	export class PluginSettingTab {
		containerEl: HTMLElement & {
			empty(): void;
			createEl(tag: string, options?: { text?: string; cls?: string }): HTMLElement;
		};
		display(): void;
		constructor(app: App, plugin: Plugin);
	}

	export class Setting {
		constructor(containerEl: HTMLElement);
		setName(name: string): Setting;
		setDesc(desc: string): Setting;
		addText(callback: (text: TextComponent) => void): Setting;
		addButton(callback: (button: ButtonComponent) => void): Setting;
		addDropdown(callback: (dropdown: DropdownComponent) => void): Setting;
		addToggle(callback: (toggle: ToggleComponent) => void): Setting;
		settingEl: HTMLElement;
	}

	export interface TextComponent {
		setPlaceholder(placeholder: string): TextComponent;
		setValue(value: string): TextComponent;
		onChange(callback: (value: string) => void | Promise<void>): TextComponent;
		inputEl: HTMLInputElement;
	}

	export interface ButtonComponent {
		setButtonText(text: string): ButtonComponent;
		onClick(callback: () => void | Promise<void>): ButtonComponent;
	}

	export interface DropdownComponent {
		addOption(value: string, text: string): DropdownComponent;
		setValue(value: string): DropdownComponent;
		onChange(callback: (value: string) => void | Promise<void>): DropdownComponent;
	}

	export interface ToggleComponent {
		setValue(value: boolean): ToggleComponent;
		onChange(callback: (value: boolean) => void | Promise<void>): ToggleComponent;
	}

	export interface Command {
		id: string;
		name: string;
		callback: () => void;
	}

	export class Notice {
		constructor(message: string, timeout?: number);
	}

	export class Editor {
		// Add editor methods as needed
	}

	export class MarkdownView {
		// Add markdown view methods as needed
	}

	export class Modal {
		// Add modal methods as needed
	}

	export function requestUrl(options: {
		url: string;
		method?: string;
		headers?: Record<string, string>;
		body?: string;
	}): Promise<{
		status: number;
		json: any;
	}>;

	export function normalizePath(path: string): string;
}
