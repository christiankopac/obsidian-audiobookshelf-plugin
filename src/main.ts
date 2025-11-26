import 'tslib';
import { 
	App, 
	Notice, 
	Plugin, 
	TFile, 
	normalizePath
} from 'obsidian';

import { 
	AudiobookshelfSettings, 
	DEFAULT_SETTINGS, 
	AudiobookshelfBook, 
	AudiobookshelfLibrary 
} from './types';
import { AudiobookshelfAPI } from './api';
import { TemplateHandler } from './template';
import { AudiobookshelfSettingTab } from './settings';

export default class AudiobookshelfPlugin extends Plugin {
	settings: AudiobookshelfSettings;
	private api: AudiobookshelfAPI;
	private templateHandler: TemplateHandler;

	async onload() {
		await this.loadSettings();

		// Initialize API and template handler
		this.api = new AudiobookshelfAPI(this.settings);
		this.templateHandler = new TemplateHandler(this.app, this.settings);

		// Add ribbon icon
		const ribbonIconEl = this.addRibbonIcon('book-open', 'Sync Audiobookshelf', (evt: MouseEvent) => {
			this.syncLibraries();
		});

		// Add commands
		this.addCommand({
			id: 'sync-audiobookshelf',
			name: 'Sync Audiobookshelf Libraries',
			callback: () => {
				this.syncLibraries();
			}
		});

		this.addCommand({
			id: 'sync-audiobookshelf-create-only',
			name: 'Sync Audiobookshelf (Create New Only)',
			callback: () => {
				this.syncLibraries('create-only');
			}
		});

		this.addCommand({
			id: 'sync-audiobookshelf-update-metadata',
			name: 'Sync Audiobookshelf (Update Metadata Only)',
			callback: () => {
				this.syncLibraries('update-metadata');
			}
		});

		this.addCommand({
			id: 'sync-audiobookshelf-full-overwrite',
			name: 'Sync Audiobookshelf (Full Overwrite - DANGER)',
			callback: () => {
				new Notice('⚠️ This will overwrite all existing notes! Use with caution.');
				this.syncLibraries('full-overwrite');
			}
		});

		// Add settings tab
		this.addSettingTab(new AudiobookshelfSettingTab(this.app, this));
	}

	onunload() {
		// Clean up
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async createBookNote(book: AudiobookshelfBook, libraryName: string, syncMode?: 'create-only' | 'update-metadata' | 'full-overwrite'): Promise<void> {
		const fileName = this.templateHandler.sanitizeFileName(book.media.metadata.title || book.id);
		
		// Store original library name for frontmatter
		book.originalLibraryName = libraryName;
		
		// Download cover if enabled
		let coverDownloaded = false;
		if (this.settings.downloadCovers) {
			try {
				const coverPath = await this.api.downloadCover(book, this.app);
				coverDownloaded = coverPath !== null;
			} catch (error) {
				coverDownloaded = false;
			}
		}
		
		// Store cover download status for frontmatter generation
		(book as any).coverDownloaded = coverDownloaded;
		
		// Create file directly in the output folder without library subfolders
		const filePath = normalizePath(`${this.settings.outputFolder}/${fileName}.md`);
		const mode = syncMode || this.settings.syncMode;
		
		// Check if file already exists
		const existingFile = this.app.vault.getAbstractFileByPath(filePath);
		
		if (existingFile && existingFile instanceof TFile) {
			// File exists - handle based on sync mode
			switch (mode) {
				case 'create-only':
					return;
				
				case 'update-metadata':
					await this.updateMetadataOnly(existingFile, book);
					return;
				
				case 'full-overwrite':
					// Continue to overwrite completely
					break;
			}
		}

		// Create new content using template or default format
		let content: string;
		
		if (this.settings.templateFile) {
			content = await this.templateHandler.createContentFromTemplate(book);
		} else {
			content = this.templateHandler.createDefaultContent(book);
		}

		// Create or overwrite the file
		if (existingFile && existingFile instanceof TFile) {
			await this.app.vault.modify(existingFile, content);
		} else {
			await this.app.vault.create(filePath, content);
		}
	}

	private async updateMetadataOnly(file: TFile, book: AudiobookshelfBook): Promise<void> {
		try {
			const content = await this.app.vault.read(file);
			const updatedContent = await this.updateFrontmatterOnly(content, book);
			await this.app.vault.modify(file, updatedContent);
			const hasProgress = book.userMediaProgress ? ' (including progress data)' : '';
		} catch (error) {
			new Notice(`Failed to update metadata for ${file.path}`);
		}
	}

	private async updateFrontmatterOnly(content: string, book: AudiobookshelfBook): Promise<string> {
		// Split content into frontmatter and body
		const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
		const match = content.match(frontmatterRegex);
		
		if (!match) {
			// No frontmatter exists, add it at the top
			const newFrontmatter = this.templateHandler.createFrontmatter(book);
			return `---\n${newFrontmatter}\n---\n\n${content}`;
		}
		
		const [, oldFrontmatter, bodyContent] = match;
		
		// Check if this note was created with a template
		if (this.settings.templateFile && oldFrontmatter.includes('{{')) {
			// This is a template-based note, use template variable replacement
			const updatedContent = this.templateHandler.replaceTemplateVariables(content, book);
			return updatedContent;
		} else {
			// This is a non-template note, use the old method
			
			// Create new frontmatter
			const newFrontmatter = this.templateHandler.createFrontmatter(book);
			
			// Preserve user-added fields that aren't part of our standard set
			const preserveFields = ['rating', 'status', 'notes', 'review'];
			const oldLines = oldFrontmatter.split('\n');
			const userFields: string[] = [];
			
			for (const line of oldLines) {
				const colonIndex = line.indexOf(':');
				if (colonIndex > 0) {
					const fieldName = line.substring(0, colonIndex).trim();
					if (preserveFields.indexOf(fieldName.toLowerCase()) !== -1 || 
						newFrontmatter.indexOf(`${fieldName}:`) === -1) {
						userFields.push(line);
					}
				}
			}
			
			// Combine new frontmatter with preserved user fields
			let combinedFrontmatter = newFrontmatter;
			if (userFields.length > 0) {
				combinedFrontmatter += '\n' + userFields.join('\n');
			}
			
			return `---\n${combinedFrontmatter}\n---\n${bodyContent}`;
		}
	}



	async syncLibraries(syncMode?: 'create-only' | 'update-metadata' | 'full-overwrite'): Promise<void> {
		const mode = syncMode || this.settings.syncMode;
		const modeNames = {
			'create-only': 'Create New Only',
			'update-metadata': 'Update Metadata Only',
			'full-overwrite': 'Full Overwrite'
		};
		
		new Notice(`Starting Audiobookshelf sync (${modeNames[mode]})...`);
		
		try {
			// Update API settings
			this.api = new AudiobookshelfAPI(this.settings);
			this.templateHandler = new TemplateHandler(this.app, this.settings);

			// Authenticate
			const authenticated = await this.api.authenticate();
			if (!authenticated) {
				return;
			}

			// Get user progress data first
			new Notice('Fetching user progress data...');
			const userProgressMap = await this.api.getUserProgress();

			// Get libraries
			const libraries = await this.api.getLibraries();
			new Notice(`Found ${libraries.length} libraries`);

			let totalBooks = 0;
			let processedBooks = 0;
			let skippedBooks = 0;

			// Process each library
			for (const library of libraries) {
				new Notice(`Syncing library: ${library.name} (${modeNames[mode]})`);
				
				const books = await this.api.getLibraryItems(library.id);
				
				// Enrich books with progress data from our collected data
				for (const book of books) {
					if (userProgressMap.has(book.id)) {
						// Always use the latest progress data, regardless of existing data
						const latestProgress = userProgressMap.get(book.id);
						if (!book.userMediaProgress) {
							book.userMediaProgress = latestProgress;
						} else {
							// Update existing progress with latest data
							book.userMediaProgress = { ...book.userMediaProgress, ...latestProgress };
						}
					}
				}
				
				totalBooks += books.length;
				
				for (const book of books) {
					try {
						const filePath = normalizePath(`${this.settings.outputFolder}/${this.templateHandler.sanitizeFileName(book.media.metadata.title || book.id)}.md`);
						const existingFile = this.app.vault.getAbstractFileByPath(filePath);
						
						if (existingFile && mode === 'create-only') {
							skippedBooks++;
						} else {
							await this.createBookNote(book, library.name, mode);
							processedBooks++;
						}
					} catch (error) {
						new Notice(`Failed to process book: ${book.media.metadata.title}`);
					}
				}
			}

			let message = `Sync complete! Found ${totalBooks} books, processed ${processedBooks}`;
			if (skippedBooks > 0) {
				message += `, skipped ${skippedBooks} existing`;
			}
			new Notice(message);
			
		} catch (error) {
			new Notice(`Sync failed: ${error.message}`);
		}
	}
}
