import { App, TFile } from 'obsidian';

// Type declarations for global objects
// process is now available from @types/node

// Re-export Obsidian types for convenience
export type { TextComponent, ButtonComponent, DropdownComponent, ToggleComponent } from 'obsidian';

export interface AudiobookshelfSettings {
	serverUrl: string;
	username: string;
	password: string;
	outputFolder: string;
	templateFile: string;
	autoSync: boolean;
	sortBy: string;
	sortDesc: boolean;
	includeDescription: boolean;
	createNotesSection: boolean;
	createQuotesSection: boolean;
	dateFormat: string;
	syncMode: 'create-only' | 'update-metadata' | 'full-overwrite';
	preserveSections: string[];
	// Tag formatting options
	tagFormat: 'dash' | 'underscore' | 'camelcase';
	useParentTag: boolean;
	parentTagName: string;
	useDefaultTag: boolean;
	defaultTagName: string;
	// Filename formatting options
	filenameFormat: 'dash' | 'underscore' | 'camelcase' | 'original';
	filenameLowercase: boolean;
	// Category options
	useTagsAsCategory: boolean;
	// Cover options
	downloadCovers: boolean;
	coversFolder: string;
}

export const DEFAULT_SETTINGS: AudiobookshelfSettings = {
	serverUrl: '',
	username: '',
	password: '',
	outputFolder: 'Books',
	templateFile: '',
	autoSync: false,
	sortBy: 'addedAt',
	sortDesc: true,
	includeDescription: true,
	createNotesSection: true,
	createQuotesSection: true,
	dateFormat: 'YYYY-MM-DD',
	syncMode: 'create-only',
	preserveSections: ['Notes', 'My Notes', 'Quotes', 'Review', 'Key Takeaways'],
	// Tag formatting defaults
	tagFormat: 'dash',
	useParentTag: true,
	parentTagName: 'books',
	useDefaultTag: true,
	defaultTagName: 'unsorted',
	// Filename formatting defaults
	filenameFormat: 'dash',
	filenameLowercase: true,
	// Category defaults
	useTagsAsCategory: true,
	// Cover defaults
	downloadCovers: false,
	coversFolder: 'attachments/covers'
};

export interface AudiobookshelfBook {
	id: string;
	originalLibraryName?: string; // Store original library name for frontmatter
	media: {
		coverPath?: string; // Add cover path property
		metadata: {
			title: string;
			authorName: string;
			narratorName?: string;
			genres?: string[];
			tags?: string[];
			publishedYear?: string;
			publisher?: string;
			description?: string;
			language?: string;
		};
		duration?: number;
		tags?: string[];
	};
	addedAt: number;
	size: number;
	// User progress data
	userMediaProgress?: {
		// Standard progress fields from API
		id: string;
		libraryItemId: string;
		episodeId?: string;
		duration: number;
		progress: number; // Decimal progress (0.0 to 1.0)
		currentTime: number; // Current time in seconds
		isFinished: boolean;
		hideFromContinueListening: boolean;
		
		// Timing fields
		lastUpdate: number; // Unix timestamp
		startedAt: number; // Unix timestamp
		finishedAt?: number; // Unix timestamp or null
		
		// Computed fields (not in API response)
		progressPercent?: number; // Calculated percentage (0-100)
		readingStatus?: string; // Computed status
		lastListened?: string; // Formatted date string
		timeListening?: number; // Total listening time
		
		// Raw session data for debugging
		_rawSession?: any;
	};
}

export interface AudiobookshelfLibrary {
	id: string;
	name: string;
}

export type SyncMode = 'create-only' | 'update-metadata' | 'full-overwrite';