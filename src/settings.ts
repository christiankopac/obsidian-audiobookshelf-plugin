import 'tslib';
import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import { AudiobookshelfSettings, TextComponent, ButtonComponent, DropdownComponent, ToggleComponent } from './types';

export class AudiobookshelfSettingTab extends PluginSettingTab {
	plugin: any; // We'll type this properly in the main file

	constructor(app: App, plugin: any) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Server Connection Section
		containerEl.createEl('h2', { text: 'Server connection' });

		new Setting(containerEl)
			.setName('Server URL')
			.setDesc('Your Audiobookshelf server URL')
			.addText((text: TextComponent) => text
				.setPlaceholder('https://audiobookshelf.example.com')
				.setValue(this.plugin.settings.serverUrl)
				.onChange(async (value: string) => {
					this.plugin.settings.serverUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Username')
			.setDesc('Your Audiobookshelf username')
			.addText((text: TextComponent) => text
				.setPlaceholder('username')
				.setValue(this.plugin.settings.username)
				.onChange(async (value: string) => {
					this.plugin.settings.username = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Password')
			.setDesc('Your Audiobookshelf password')
			.addText((text: TextComponent) => {
				text.setPlaceholder('password')
					.setValue(this.plugin.settings.password)
					.onChange(async (value: string) => {
						this.plugin.settings.password = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
			});

		new Setting(containerEl)
			.setName('Test Connection')
			.setDesc('Test your Audiobookshelf connection')
			.addButton((button: ButtonComponent) => button
				.setButtonText('Test')
				.onClick(async () => {
					const success = await (this.plugin as any).authenticate();
					if (success) {
						new Notice('Connection successful!');
					}
				}));

		// Output Section
		containerEl.createEl('h2', { text: 'Output' });

		new Setting(containerEl)
			.setName('Output Folder')
			.setDesc('Folder where book notes will be created')
			.addText((text: TextComponent) => text
				.setPlaceholder('Books')
				.setValue(this.plugin.settings.outputFolder)
				.onChange(async (value: string) => {
					this.plugin.settings.outputFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Template File')
			.setDesc('Optional: Path to a template file to use for book notes')
			.addText((text: TextComponent) => text
				.setPlaceholder('Templates/Book Template.md')
				.setValue(this.plugin.settings.templateFile)
				.onChange(async (value: string) => {
					this.plugin.settings.templateFile = value;
					await this.plugin.saveSettings();
				}));

		// Sync Section
		containerEl.createEl('h2', { text: 'Sync' });

		new Setting(containerEl)
			.setName('Sort By')
			.setDesc('How to sort books when fetching from Audiobookshelf')
			.addDropdown((dropdown: DropdownComponent) => dropdown
				.addOption('addedAt', 'Date Added')
				.addOption('media.metadata.title', 'Title')
				.addOption('media.metadata.authorName', 'Author')
				.addOption('media.duration', 'Duration')
				.setValue(this.plugin.settings.sortBy)
				.onChange(async (value: string) => {
					this.plugin.settings.sortBy = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Sort Order')
			.setDesc('Sort in descending order (newest/highest first)')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.sortDesc)
				.onChange(async (value: boolean) => {
					this.plugin.settings.sortDesc = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Date Format')
			.setDesc('Format for dates in frontmatter')
			.addDropdown((dropdown: DropdownComponent) => dropdown
				.addOption('YYYY-MM-DD', 'YYYY-MM-DD (2024-01-15)')
				.addOption('DD/MM/YYYY', 'DD/MM/YYYY (15/01/2024)')
				.addOption('MM/DD/YYYY', 'MM/DD/YYYY (01/15/2024)')
				.addOption('ISO', 'ISO (2024-01-15T10:30:00.000Z)')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value: string) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}));

		// Note Content Section
		containerEl.createEl('h2', { text: 'Note content' });

		new Setting(containerEl)
			.setName('Include Description')
			.setDesc('Include book description from Audiobookshelf in notes')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.includeDescription)
				.onChange(async (value: boolean) => {
					this.plugin.settings.includeDescription = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Create Notes Section')
			.setDesc('Add an empty "Notes" section to each book note')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.createNotesSection)
				.onChange(async (value: boolean) => {
					this.plugin.settings.createNotesSection = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Create Quotes Section')
			.setDesc('Add an empty "Quotes" section to each book note')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.createQuotesSection)
				.onChange(async (value: boolean) => {
					this.plugin.settings.createQuotesSection = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default Sync Mode')
			.setDesc('How to handle existing files when syncing')
			.addDropdown((dropdown: DropdownComponent) => dropdown
				.addOption('create-only', 'Create New Only (Safe - Never overwrites)')
				.addOption('update-metadata', 'Update Metadata Only (Preserves content)')
				.addOption('full-overwrite', 'Full Overwrite (DANGER - Overwrites everything)')
				.setValue(this.plugin.settings.syncMode)
				.onChange(async (value: string) => {
					this.plugin.settings.syncMode = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Auto Sync')
			.setDesc('Automatically sync when Obsidian starts (not recommended)')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.autoSync)
				.onChange(async (value: boolean) => {
					this.plugin.settings.autoSync = value;
					await this.plugin.saveSettings();
				}));

		// Tag & Filename Formatting Section
		containerEl.createEl('h2', { text: 'Tag & filename formatting' });

		// Tag formatting options (conditionally displayed)
		const tagFormatSetting = new Setting(containerEl)
			.setName('Tag Format')
			.setDesc('How to format multi-word tags')
			.addDropdown((dropdown: DropdownComponent) => dropdown
				.addOption('dash', 'Dash (science-and-religion)')
				.addOption('underscore', 'Underscore (science_and_religion)')
				.addOption('camelcase', 'CamelCase (scienceAndReligion)')
				.setValue(this.plugin.settings.tagFormat)
				.onChange(async (value: string) => {
					this.plugin.settings.tagFormat = value;
					await this.plugin.saveSettings();
				}));

		const useParentTagSetting = new Setting(containerEl)
			.setName('Use Parent Tag')
			.setDesc('Nest all tags under a parent tag (e.g., books/science)')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.useParentTag)
				.onChange(async (value: boolean) => {
					this.plugin.settings.useParentTag = value;
					await this.plugin.saveSettings();
				}));

		const parentTagNameSetting = new Setting(containerEl)
			.setName('Parent Tag Name')
			.setDesc('Name of the parent tag (only if parent tag is enabled)')
			.addText((text: TextComponent) => text
				.setPlaceholder('books')
				.setValue(this.plugin.settings.parentTagName)
				.onChange(async (value: string) => {
					this.plugin.settings.parentTagName = value;
					await this.plugin.saveSettings();
				}));

		const useDefaultTagSetting = new Setting(containerEl)
			.setName('Use Default Tag/Category')
			.setDesc('Add a default tag or category for books without any tags')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.useDefaultTag)
				.onChange(async (value: boolean) => {
					this.plugin.settings.useDefaultTag = value;
					await this.plugin.saveSettings();
				}));

		const defaultTagNameSetting = new Setting(containerEl)
			.setName('Default Tag/Category Name')
			.setDesc('Name of the default tag or category for untagged books')
			.addText((text: TextComponent) => text
				.setPlaceholder('unsorted')
				.setValue(this.plugin.settings.defaultTagName)
				.onChange(async (value: string) => {
					this.plugin.settings.defaultTagName = value;
					await this.plugin.saveSettings();
				}));

		// Filename formatting subsection
		containerEl.createEl('h3', { text: 'Filename options' });

		new Setting(containerEl)
			.setName('Filename Format')
			.setDesc('How to format book titles for filenames')
			.addDropdown((dropdown: DropdownComponent) => dropdown
				.addOption('dash', 'Dash (the-order-of-time)')
				.addOption('underscore', 'Underscore (the_order_of_time)')
				.addOption('camelcase', 'CamelCase (theOrderOfTime)')
				.addOption('original', 'Original (preserve spaces)')
				.setValue(this.plugin.settings.filenameFormat)
				.onChange(async (value: string) => {
					this.plugin.settings.filenameFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Lowercase Filenames')
			.setDesc('Convert filenames to lowercase (except CamelCase)')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.filenameLowercase)
				.onChange(async (value: boolean) => {
					this.plugin.settings.filenameLowercase = value;
					await this.plugin.saveSettings();
				}));

		// Library options subsection
		containerEl.createEl('h3', { text: 'Library options' });

		containerEl.createEl('p', { 
			text: 'Library names are automatically included in the frontmatter of each book note for easy organization and filtering.',
			cls: 'setting-item-description'
		});

		// Function to update tag settings visibility
		const updateTagSettingsVisibility = (useTagsAsCategory: boolean) => {
			const tagSpecificSettings = [tagFormatSetting, useParentTagSetting, parentTagNameSetting];
			tagSpecificSettings.forEach(setting => {
				setting.settingEl.style.display = useTagsAsCategory ? 'none' : 'block';
			});
		};

		// Add the category toggle at the top of Library Options
		const useTagsAsCategorySetting = new Setting(containerEl)
			.setName('Use Tags as Category')
			.setDesc('Store book tags as "category" field instead of Obsidian tags (recommended)')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.useTagsAsCategory)
				.onChange(async (value: boolean) => {
					this.plugin.settings.useTagsAsCategory = value;
					await this.plugin.saveSettings();
					updateTagSettingsVisibility(value);
				}));

		// Set initial visibility
		updateTagSettingsVisibility(this.plugin.settings.useTagsAsCategory);

		// Cover Options Section
		containerEl.createEl('h2', { text: 'Cover options' });

		new Setting(containerEl)
			.setName('Download Covers')
			.setDesc('Download book cover images to your vault (recommended for offline access)')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.downloadCovers)
				.onChange(async (value: boolean) => {
					this.plugin.settings.downloadCovers = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Covers Folder')
			.setDesc('Folder where cover images will be stored (relative to vault root)')
			.addText((text: TextComponent) => text
				.setPlaceholder('attachments/covers')
				.setValue(this.plugin.settings.coversFolder)
				.onChange(async (value: string) => {
					this.plugin.settings.coversFolder = value;
					await this.plugin.saveSettings();
				}));
	}
}
