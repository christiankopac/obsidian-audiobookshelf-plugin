import 'tslib';
import { TFile, App, Notice, normalizePath } from 'obsidian';
import { AudiobookshelfBook, AudiobookshelfSettings } from './types';

export class TemplateHandler {
	private app: App;
	private settings: AudiobookshelfSettings;

	constructor(app: App, settings: AudiobookshelfSettings) {
		this.app = app;
		this.settings = settings;
	}

	async createContentFromTemplate(book: AudiobookshelfBook): Promise<string> {
		try {
			// Template file resolution logic
			
			// Try multiple path resolution strategies
			let templateFile = this.app.vault.getAbstractFileByPath(this.settings.templateFile);
			
			// If not found, try with vault name prefix
			if (!templateFile) {
				const vaultName = this.app.vault.getName();
				const vaultPrefixedPath = `${vaultName}/${this.settings.templateFile}`;
				templateFile = this.app.vault.getAbstractFileByPath(vaultPrefixedPath);
			}
			
			// If still not found, try just the filename
			if (!templateFile) {
				const filename = this.settings.templateFile.split('/').pop();
				templateFile = this.app.vault.getAbstractFileByPath(filename || '');
			}
			
			// If still not found, try searching for the file
			if (!templateFile) {
				const allFiles = this.app.vault.getFiles();
				const templateFiles = allFiles.filter((file: TFile) => 
					file.name === 'resource-audiobook-template.md' || 
					file.path.includes('resource-audiobook-template.md')
				);
				
				if (templateFiles.length > 0) {
					templateFile = templateFiles[0];
				}
			}
			
			if (!templateFile || !(templateFile instanceof TFile)) {
				new Notice(`Template file not found: ${this.settings.templateFile}`);
				return this.createDefaultContent(book);
			}
			
			let templateContent = await this.app.vault.read(templateFile);
			
			// Replace template variables
			templateContent = this.replaceTemplateVariables(templateContent, book);
			
			return templateContent;
		} catch (error) {
			new Notice(`Error reading template: ${error.message}`);
			return this.createDefaultContent(book);
		}
	}

	replaceTemplateVariables(template: string, book: AudiobookshelfBook): string {
		const metadata = book.media.metadata;
		
		// Format date according to user preference
		const addedDate = new Date(book.addedAt);
		let formattedDate: string;
		switch (this.settings.dateFormat) {
			case 'YYYY-MM-DD':
				formattedDate = addedDate.toISOString().split('T')[0];
				break;
			case 'DD/MM/YYYY':
				formattedDate = addedDate.toLocaleDateString('en-GB');
				break;
			case 'MM/DD/YYYY':
				formattedDate = addedDate.toLocaleDateString('en-US');
				break;
			case 'ISO':
			default:
				formattedDate = addedDate.toISOString();
				break;
		}

		// Format genres and tags/categories as YAML arrays
		const formatArrayForYaml = (arr: string[] | undefined, isTag: boolean = false): string => {
			let items: string[] = [];
			
			if (arr && arr.length > 0) {
				if (isTag && this.settings.useTagsAsCategory) {
					// Format as category (keep original text, just quote for YAML)
					items = arr
						.filter(item => item && item.trim() !== '')
						.map(item => this.formatYamlString(this.stripHtmlTags(item)));
				} else {
					// Format as tags or genres
					items = arr
						.map(item => this.sanitizeYamlArrayItem(this.stripHtmlTags(item), isTag))
						.filter(item => item !== ''); // Remove empty items
				}
			}
			
			// Handle default for tags/categories
			if (isTag && items.length === 0 && this.settings.useDefaultTag && this.settings.defaultTagName) {
				if (this.settings.useTagsAsCategory) {
					items.push(this.formatYamlString(this.settings.defaultTagName));
				} else {
					const defaultTag = this.sanitizeYamlArrayItem(this.settings.defaultTagName, true);
					if (defaultTag) {
						items.push(defaultTag);
					}
				}
			}
			
			// For genres, if no items, return a default genre
			if (!isTag && items.length === 0) {
				items.push('"Uncategorized"');
			}
			
			return items.length > 0 ? '\n' + items.map(item => `  - ${item}`).join('\n') : '';
		};

		// Helper functions for progress data
		const getReadingStatus = (): string => {
			if (!book.userMediaProgress) return 'Not Started';
			
			// Calculate status based on actual progress data
			const progress = book.userMediaProgress.progress || 0;
			const progressPercent = progress * 100;
			
			if (book.userMediaProgress.isFinished) return 'Finished';
			if (progressPercent >= 98) return 'Finished';
			if (progressPercent >= 1) return 'In Progress';
			if (book.userMediaProgress.startedAt) return 'Started';
			return 'Not Started';
		};

		const getProgressPercentage = (): string => {
			if (!book.userMediaProgress) return '0';
			// Progress is already a percentage (0.0-100.0) from the API
			const progressPercent = book.userMediaProgress.progress || 0;
			return (progressPercent * 100).toFixed(1) + '%';
		};

		const formatProgressTime = (seconds: number): string => {
			const hours = Math.floor(seconds / 3600);
			const minutes = Math.floor((seconds % 3600) / 60);
			return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
		};

		const getLastListenedDate = (): string => {
			if (!book.userMediaProgress?.lastUpdate) return '';
			const lastUpdate = new Date(book.userMediaProgress.lastUpdate);
			switch (this.settings.dateFormat) {
				case 'YYYY-MM-DD':
					return lastUpdate.toISOString().split('T')[0];
				case 'DD/MM/YYYY':
					return lastUpdate.toLocaleDateString('en-GB');
				case 'MM/DD/YYYY':
					return lastUpdate.toLocaleDateString('en-US');
				case 'ISO':
				default:
					return lastUpdate.toISOString();
			}
		};

		const formatTimestamp = (timestamp: number | undefined): string => {
			if (!timestamp) return '';
			const date = new Date(timestamp);
			switch (this.settings.dateFormat) {
				case 'YYYY-MM-DD':
					return date.toISOString().split('T')[0];
				case 'DD/MM/YYYY':
					return date.toLocaleDateString('en-GB');
				case 'MM/DD/YYYY':
					return date.toLocaleDateString('en-US');
				case 'ISO':
				default:
					return date.toISOString();
			}
		};

		const replacements: { [key: string]: string } = {
			'{{title}}': this.sanitizeYamlString(this.stripHtmlTags(metadata.title || 'Unknown')),
			'{{author}}': this.sanitizeYamlString(this.stripHtmlTags(metadata.authorName || 'Unknown')),
			'{{narrator}}': this.sanitizeYamlString(this.stripHtmlTags(metadata.narratorName || '')),
			'{{description}}': this.sanitizeYamlString(this.stripHtmlTags(metadata.description || '')),
			'{{publisher}}': this.sanitizeYamlString(this.stripHtmlTags(metadata.publisher || '')),
			'{{publishedYear}}': metadata.publishedYear || '',
			'{{language}}': this.sanitizeYamlString(this.stripHtmlTags(metadata.language || '')),
			'{{duration}}': book.media.duration ? Math.round(book.media.duration / 3600).toString() : '0',
			'{{size}}': book.size?.toString() || '0',
			'{{addedAt}}': formattedDate,
			'{{audiobookshelfId}}': book.id,
			'{{library}}': this.sanitizeYamlString(book.originalLibraryName || 'Unknown Library'),
			'{{genres}}': formatArrayForYaml(metadata.genres, false),
			'{{tags}}': formatArrayForYaml(book.media.tags, true),
			'{{category}}': formatArrayForYaml(book.media.tags, true), // Alias for tags when used as category
			// Cover image
			'{{coverImg}}': this.getCoverImageUrl(book),
			// Progress/Status fields
			'{{readingStatus}}': getReadingStatus(),
			'{{progressPercentage}}': getProgressPercentage(),
			'{{currentTime}}': book.userMediaProgress ? formatProgressTime(book.userMediaProgress.currentTime) : '0m',
			'{{timeRemaining}}': book.userMediaProgress && book.userMediaProgress.duration ? 
				formatProgressTime(book.userMediaProgress.duration - book.userMediaProgress.currentTime) : 
				book.media.duration ? formatProgressTime(book.media.duration) : '0m',
			'{{isFinished}}': book.userMediaProgress?.isFinished ? 'true' : 'false',
			'{{lastListened}}': getLastListenedDate(),
			// Use correct timestamp fields from API
			'{{startedAt}}': formatTimestamp(book.userMediaProgress?.startedAt),
			'{{finishedAt}}': formatTimestamp(book.userMediaProgress?.finishedAt),
			// Raw API fields
			'{{lastUpdate}}': book.userMediaProgress?.lastUpdate ? 
				new Date(book.userMediaProgress.lastUpdate).toISOString() : ''
		};

		let result = template;
		for (const [placeholder, value] of Object.keys(replacements).map(key => [key, replacements[key]] as [string, string])) {
			result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
		}

		return result;
	}

	createDefaultContent(book: AudiobookshelfBook): string {
		// Create frontmatter
		const frontmatter = this.createFrontmatter(book);
		
		// Create content
		let content = `---\n${frontmatter}\n---\n\n`;
		
		// Add title
		content += `# ${this.stripHtmlTags(book.media.metadata.title)}\n\n`;
		
		// Add author
		if (book.media.metadata.authorName) {
			content += `**Author:** ${this.stripHtmlTags(book.media.metadata.authorName)}\n\n`;
		}
		
		// Add narrator
		if (book.media.metadata.narratorName) {
			content += `**Narrator:** ${this.stripHtmlTags(book.media.metadata.narratorName)}\n\n`;
		}
		
		// Add description (if enabled)
		if (this.settings.includeDescription && book.media.metadata.description) {
			content += `## Description\n\n${this.stripHtmlTags(book.media.metadata.description)}\n\n`;
		}
		
		// Add sections based on settings
		if (this.settings.createNotesSection) {
			content += `## Notes\n\n\n\n`;
		}
		
		if (this.settings.createQuotesSection) {
			content += `## Quotes\n\n`;
		}

		return content;
	}

	private sanitizeYamlString(str: string): string {
		if (!str) return '';
		
		// Replace problematic characters and escape quotes
		return str
			.replace(/\\/g, '\\\\')  // Escape backslashes first
			.replace(/"/g, '\\"')    // Escape double quotes
			.replace(/\n/g, ' ')     // Replace newlines with spaces
			.replace(/\r/g, '')      // Remove carriage returns
			.replace(/\t/g, ' ')     // Replace tabs with spaces
			.replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
			.trim();
	}

	private stripHtmlTags(str: string): string {
		if (!str) return '';
		
		// Remove HTML tags while preserving text content
		return str
			.replace(/<[^>]*>/g, '')  // Remove all HTML tags
			.replace(/&nbsp;/g, ' ')  // Replace &nbsp; with regular space
			.replace(/&amp;/g, '&')   // Replace &amp; with &
			.replace(/&lt;/g, '<')    // Replace &lt; with <
			.replace(/&gt;/g, '>')    // Replace &gt; with >
			.replace(/&quot;/g, '"')  // Replace &quot; with "
			.replace(/&#39;/g, "'")   // Replace &#39; with '
			.replace(/\s+/g, ' ')     // Normalize multiple spaces to single space
			.trim();
	}

	private sanitizeObsidianTag(str: string): string {
		if (!str) return '';
		
		// Clean the string first
		let cleaned = str
			.replace(/[^\w\s]/g, '')        // Remove special chars, keep letters, numbers, spaces
			.trim()
			.replace(/\s+/g, ' ');          // Normalize spaces
		
		if (!cleaned) return '';
		
		// Apply formatting based on user preference
		let formatted: string;
		switch (this.settings.tagFormat) {
			case 'underscore':
				formatted = cleaned
					.replace(/\s+/g, '_')
					.toLowerCase();
				break;
			case 'camelcase':
				formatted = cleaned
					.split(' ')
					.map((word, index) => 
						index === 0 ? word.toLowerCase() : 
						word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
					)
					.join('');
				break;
			case 'dash':
			default:
				formatted = cleaned
					.replace(/\s+/g, '-')
					.toLowerCase();
				break;
		}
		
		// Add parent tag if enabled
		if (this.settings.useParentTag && this.settings.parentTagName) {
			const parentTag = this.settings.parentTagName
				.replace(/[^\w]/g, '')      // Remove special chars from parent tag
				.toLowerCase();
			
			if (parentTag) {
				return `${parentTag}/${formatted}`;
			}
		}
		
		return formatted;
	}

	private sanitizeYamlArrayItem(str: string, isTag: boolean = false): string {
		if (!str) return '';
		
		if (isTag) {
			// For Obsidian tags, use special tag sanitization
			const tagSanitized = this.sanitizeObsidianTag(str);
			return tagSanitized ? `"${tagSanitized}"` : '';
		} else {
			// For other arrays (genres), use regular sanitization
			const sanitized = this.sanitizeYamlString(str);
			return `"${sanitized}"`;
		}
	}

	private formatYamlString(str: string): string {
		if (!str) return '""';
		
		const sanitized = this.sanitizeYamlString(str);
		
		// Always quote strings to be safe
		return `"${sanitized}"`;
	}

	createFrontmatter(book: AudiobookshelfBook): string {
		const metadata = book.media.metadata;
		const frontmatter: string[] = [];
		
		frontmatter.push(`title: ${this.formatYamlString(this.stripHtmlTags(metadata.title || 'Unknown'))}`);
		frontmatter.push(`author: ${this.formatYamlString(this.stripHtmlTags(metadata.authorName || 'Unknown'))}`);
		
		if (metadata.narratorName) {
			frontmatter.push(`narrator: ${this.formatYamlString(this.stripHtmlTags(metadata.narratorName))}`);
		}
		
		if (metadata.genres && metadata.genres.length > 0) {
			frontmatter.push(`genres:`);
			metadata.genres.forEach(genre => {
				frontmatter.push(`  - ${this.sanitizeYamlArrayItem(this.stripHtmlTags(genre))}`);
			});
		}
		
		if (metadata.publishedYear) {
			frontmatter.push(`published: ${metadata.publishedYear}`);
		}
		
		if (metadata.publisher) {
			frontmatter.push(`publisher: ${this.formatYamlString(this.stripHtmlTags(metadata.publisher))}`);
		}
		
		if (book.media.duration) {
			frontmatter.push(`duration: ${Math.round(book.media.duration / 3600)} hours`);
		}
		
		// Handle book tags/categories
		const bookTags = book.media.tags && book.media.tags.length > 0 ? book.media.tags : [];
		
		if (this.settings.useTagsAsCategory) {
			// Store as category field instead of tags
			if (bookTags.length > 0) {
				// Keep original category names, just quote them for YAML safety
				const categories = bookTags.filter(tag => tag && tag.trim() !== '');
				
				if (categories.length > 0) {
					if (categories.length === 1) {
						frontmatter.push(`category: ${this.formatYamlString(this.stripHtmlTags(categories[0]))}`);
					} else {
						frontmatter.push(`category:`);
						categories.forEach(category => {
							frontmatter.push(`  - ${this.formatYamlString(this.stripHtmlTags(category))}`);
						});
					}
				}
			} else if (this.settings.useDefaultTag && this.settings.defaultTagName) {
				// Add default category if no tags
				frontmatter.push(`category: ${this.formatYamlString(this.stripHtmlTags(this.settings.defaultTagName))}`);
			}
		} else {
			// Use as Obsidian tags (original behavior)
			const sanitizedTags = bookTags
				.map(tag => this.sanitizeYamlArrayItem(this.stripHtmlTags(tag), true))
				.filter(tag => tag !== '');
			
			// If no valid tags and default tag is enabled, add default tag
			if (sanitizedTags.length === 0 && this.settings.useDefaultTag && this.settings.defaultTagName) {
				const defaultTag = this.sanitizeYamlArrayItem(this.stripHtmlTags(this.settings.defaultTagName), true);
				if (defaultTag) {
					sanitizedTags.push(defaultTag);
				}
			}
			
			// Add tags to frontmatter if we have any
			if (sanitizedTags.length > 0) {
				frontmatter.push(`tags:`);
				sanitizedTags.forEach(tag => {
					frontmatter.push(`  - ${tag}`);
				});
			}
		}
		
		frontmatter.push(`audiobookshelf_id: ${this.formatYamlString(book.id)}`);
		
		// Format date according to user preference
		const addedDate = new Date(book.addedAt);
		let formattedDate: string;
		switch (this.settings.dateFormat) {
			case 'YYYY-MM-DD':
				formattedDate = addedDate.toISOString().split('T')[0];
				break;
			case 'DD/MM/YYYY':
				formattedDate = addedDate.toLocaleDateString('en-GB');
				break;
			case 'MM/DD/YYYY':
				formattedDate = addedDate.toLocaleDateString('en-US');
				break;
			case 'ISO':
			default:
				formattedDate = addedDate.toISOString();
				break;
		}
		
		frontmatter.push(`added_at: ${this.formatYamlString(formattedDate)}`);
		
		// Add progress/status information
		if (book.userMediaProgress) {
			// Calculate reading status based on actual progress data
			const progress = book.userMediaProgress.progress || 0; // Already a percentage (0.0-100.0)
			let readingStatus = 'Not Started';
			
			if (book.userMediaProgress.isFinished) readingStatus = 'Finished';
			else if (progress >= 98) readingStatus = 'Finished';
			else if (progress > 0.01) readingStatus = 'In Progress';
			else if (book.userMediaProgress.startedAt) readingStatus = 'Started';
			
			frontmatter.push(`reading_status: ${this.formatYamlString(readingStatus)}`);
			frontmatter.push(`progress: ${this.formatYamlString(progress.toFixed(1) + '%')}`);
			
			// Use lastUpdate from API response for last listened
			if (book.userMediaProgress.lastUpdate) {
				const lastUpdate = new Date(book.userMediaProgress.lastUpdate);
				const lastUpdateFormatted = this.settings.dateFormat === 'YYYY-MM-DD' ?
					lastUpdate.toISOString().split('T')[0] :
					this.settings.dateFormat === 'DD/MM/YYYY' ?
					lastUpdate.toLocaleDateString('en-GB') :
					this.settings.dateFormat === 'MM/DD/YYYY' ?
					lastUpdate.toLocaleDateString('en-US') :
					lastUpdate.toISOString();
				frontmatter.push(`last_listened: ${this.formatYamlString(lastUpdateFormatted)}`);
			}
			
			// Use startedAt and finishedAt from API response
			if (book.userMediaProgress.startedAt) {
				const startedDate = new Date(book.userMediaProgress.startedAt);
				const startedFormatted = this.settings.dateFormat === 'YYYY-MM-DD' ?
					startedDate.toISOString().split('T')[0] :
					this.settings.dateFormat === 'DD/MM/YYYY' ?
					startedDate.toLocaleDateString('en-GB') :
					this.settings.dateFormat === 'MM/DD/YYYY' ?
					startedDate.toLocaleDateString('en-US') :
					startedDate.toISOString();
				frontmatter.push(`started_at: ${this.formatYamlString(startedFormatted)}`);
			}
			
			if (book.userMediaProgress.isFinished && book.userMediaProgress.finishedAt) {
				const finishedDate = new Date(book.userMediaProgress.finishedAt);
				const finishedFormatted = this.settings.dateFormat === 'YYYY-MM-DD' ?
					finishedDate.toISOString().split('T')[0] :
					this.settings.dateFormat === 'DD/MM/YYYY' ?
					finishedDate.toLocaleDateString('en-GB') :
					this.settings.dateFormat === 'MM/DD/YYYY' ?
					finishedDate.toLocaleDateString('en-US') :
					finishedDate.toISOString();
				frontmatter.push(`finished_at: ${this.formatYamlString(finishedFormatted)}`);
			}
		} else {
			frontmatter.push(`reading_status: ${this.formatYamlString('Not Started')}`);
			frontmatter.push(`progress: ${this.formatYamlString('0%')}`);
		}
		
		// Always include library name in frontmatter
		if (book.originalLibraryName) {
			frontmatter.push(`library: ${this.formatYamlString(book.originalLibraryName)}`);
		}
		
		// Add cover image if available or if downloading is enabled
		if (this.settings.downloadCovers && (book as any).coverDownloaded) {
			// Since we can't save binary data locally in Obsidian, use remote URL
			// but mark it as "downloaded" for consistency
			const coverUrl = `${this.settings.serverUrl}/audiobookshelf/api/items/${book.id}/cover?ts=${Date.now()}`;
			frontmatter.push(`coverImg: ${this.formatYamlString(coverUrl)}`);
		} else if (book.media.coverPath) {
			// Use full URL for remote covers when not downloading
			const coverUrl = `${this.settings.serverUrl}${book.media.coverPath}`;
			frontmatter.push(`coverImg: ${this.formatYamlString(coverUrl)}`);
		}
		
		frontmatter.push(`source: "Audiobookshelf"`);
		
		return frontmatter.join('\n');
	}

	private getCoverImageUrl(book: AudiobookshelfBook): string {
		if (this.settings.downloadCovers && (book as any).coverDownloaded) {
			// Since we can't save binary data locally in Obsidian, use remote URL
			// but mark it as "downloaded" for consistency
			return `${this.settings.serverUrl}/audiobookshelf/api/items/${book.id}/cover?ts=${Date.now()}`;
		} else if (book.media.coverPath) {
			// Use full URL for remote covers when not downloading
			return `${this.settings.serverUrl}${book.media.coverPath}`;
		}
		return '';
	}

	sanitizeFileName(fileName: string): string {
		if (!fileName) return 'untitled';
		
		// First, remove filesystem-unsafe characters
		let sanitized = fileName
			.replace(/[<>:"/\\|?*\x00-\x1F\x7F]/g, '') // Remove filesystem unsafe chars
			.replace(/\.$/, '')                         // Remove trailing dots
			.trim();
		
		if (!sanitized) return 'untitled';
		
		// Apply formatting based on user preference
		switch (this.settings.filenameFormat) {
			case 'dash':
				sanitized = sanitized
					.replace(/[&+]/g, ' and ')          // Convert & and + to "and"
					.replace(/[^\w\s.-]/g, '')          // Keep only word chars, spaces, dots, dashes
					.replace(/\s+/g, '-')               // Replace spaces with dashes
					.replace(/-+/g, '-')                // Collapse multiple dashes
					.replace(/^-+|-+$/g, '');           // Remove leading/trailing dashes
				break;
				
			case 'underscore':
				sanitized = sanitized
					.replace(/[&+]/g, ' and ')          // Convert & and + to "and"
					.replace(/[^\w\s._]/g, '')          // Keep only word chars, spaces, dots, underscores
					.replace(/\s+/g, '_')               // Replace spaces with underscores
					.replace(/_+/g, '_')                // Collapse multiple underscores
					.replace(/^_+|_+$/g, '');           // Remove leading/trailing underscores
				break;
				
			case 'camelcase':
				sanitized = sanitized
					.replace(/[&+]/g, ' and ')          // Convert & and + to "and"
					.replace(/[^\w\s.]/g, '')           // Keep only word chars, spaces, dots
					.split(/\s+/)                       // Split by spaces
					.map((word, index) => 
						index === 0 ? word.toLowerCase() : 
						word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
					)
					.join('');
				break;
				
			case 'original':
			default:
				// Just remove unsafe characters, keep original formatting
				sanitized = sanitized.replace(/[^\w\s.-]/g, '');
				break;
		}
		
		// Apply lowercase if enabled
		if (this.settings.filenameLowercase && this.settings.filenameFormat !== 'camelcase') {
			sanitized = sanitized.toLowerCase();
		}
		
		// Ensure we have something and limit length
		if (!sanitized) sanitized = 'untitled';
		
		// Limit length but try to break at word boundaries
		if (sanitized.length > 100) {
			const truncated = sanitized.substring(0, 100);
			const lastSpace = truncated.lastIndexOf(' ');
			const lastDash = truncated.lastIndexOf('-');
			const lastUnderscore = truncated.lastIndexOf('_');
			
			const breakPoint = Math.max(lastSpace, lastDash, lastUnderscore);
			if (breakPoint > 50) { // Only break if we have a reasonable length
				sanitized = truncated.substring(0, breakPoint);
			} else {
				sanitized = truncated;
			}
		}
		
		return sanitized;
	}
}
