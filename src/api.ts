import 'tslib';
import { requestUrl, Notice } from 'obsidian';
import { AudiobookshelfBook, AudiobookshelfLibrary, AudiobookshelfSettings } from './types';

export class AudiobookshelfAPI {
	private authToken: string | null = null;
	private settings: AudiobookshelfSettings;

	constructor(settings: AudiobookshelfSettings) {
		this.settings = settings;
	}

	async authenticate(): Promise<boolean> {
		if (!this.settings.serverUrl || !this.settings.username || !this.settings.password) {
			new Notice('Please configure Audiobookshelf settings first');
			return false;
		}

		try {
			const response = await requestUrl({
				url: `${this.settings.serverUrl}/login`,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: this.settings.username,
					password: this.settings.password
				})
			});

			if (response.status === 200) {
				this.authToken = response.json.user.token;
				return true;
			} else {
				new Notice('Authentication failed');
				return false;
			}
		} catch (error) {
			new Notice(`Authentication error: ${error.message}`);
			return false;
		}
	}

	async getLibraries(): Promise<AudiobookshelfLibrary[]> {
		if (!this.authToken) {
			throw new Error('Not authenticated');
		}

		try {
			const response = await requestUrl({
				url: `${this.settings.serverUrl}/api/libraries`,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.authToken}`
				}
			});

			return response.json.libraries || [];
		} catch (error) {
			throw new Error(`Failed to fetch libraries: ${error.message}`);
		}
	}

	async getLibraryItems(libraryId: string): Promise<AudiobookshelfBook[]> {
		if (!this.authToken) {
			throw new Error('Not authenticated');
		}

		try {
			const sortParam = this.settings.sortBy || 'addedAt';
			const descParam = this.settings.sortDesc ? '1' : '0';
			
			const response = await requestUrl({
				url: `${this.settings.serverUrl}/api/libraries/${libraryId}/items?sort=${sortParam}&desc=${descParam}&include=progress,rssfeed`,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.authToken}`
				}
			});

			const items = response.json.results || [];
			
			// Try to enrich items with progress data if not included
			const enrichedItems = [];
			for (const item of items) {
				// If userMediaProgress is missing, try to fetch it separately
				if (!item.userMediaProgress) {
					try {
						const progressResponse = await requestUrl({
							url: `${this.settings.serverUrl}/api/me/progress/${item.id}`,
							method: 'GET',
							headers: {
								'Authorization': `Bearer ${this.authToken}`
							}
						});
						
						if (progressResponse.status === 200 && progressResponse.json) {
							item.userMediaProgress = progressResponse.json;
						}
					} catch (progressError) {
						// Progress fetch failed, item will have no progress data
					}
				}
				enrichedItems.push(item);
			}

			return enrichedItems;
		} catch (error) {
			throw new Error(`Failed to fetch library items: ${error.message}`);
		}
	}

	async getUserProgress(): Promise<Map<string, any>> {
		const progressMap = new Map();
		
		try {
			// Get user's listening sessions to extract progress data
			const sessionsResponse = await requestUrl({
				url: `${this.settings.serverUrl}/api/me/listening-sessions?itemsPerPage=1000`,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.authToken}`
				}
			});
			
			if (sessionsResponse.json?.sessions) {
				// Group sessions by library item ID and get the latest progress
				const sessions = sessionsResponse.json.sessions;
				
				for (const session of sessions) {
					const itemId = session.libraryItemId;
					if (itemId) {
						// Check if this is the most recent session for this item
						if (!progressMap.has(itemId) || session.updatedAt > progressMap.get(itemId).lastUpdate) {
							const progressPercent = session.duration > 0 ? (session.currentTime / session.duration) * 100 : 0;
							const isFinished = progressPercent >= 98; // 98% considered finished
							
							const progressData = {
								// Standard progress fields
								progress: session.currentTime / session.duration,
								progressPercent: progressPercent,
								currentTime: session.currentTime,
								duration: session.duration,
								isFinished: isFinished,
								
								// Timing fields
								lastUpdate: session.updatedAt,
								startedAt: session.startedAt,
								lastListened: new Date(session.updatedAt).toISOString(),
								
								// Status determination
								readingStatus: this.determineReadingStatus(progressPercent, session),
								
								// Session metadata
								libraryItemId: itemId,
								timeListening: session.timeListening,
								
								// Raw session data for debugging
								_rawSession: session
							};
							
							progressMap.set(itemId, progressData);
						}
					}
				}
			}
			
			// Also try to get media progress directly as backup
			try {
				const progressResponse = await requestUrl({
					url: `${this.settings.serverUrl}/api/me/progress`,
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${this.authToken}`
					}
				});
				
				if (progressResponse.json) {
					const mediaProgress = Array.isArray(progressResponse.json) ? progressResponse.json : [progressResponse.json];
					for (const progress of mediaProgress) {
						if (progress.libraryItemId && !progressMap.has(progress.libraryItemId)) {
							// Only use if we don't already have session data
							progressMap.set(progress.libraryItemId, {
								...progress,
								readingStatus: this.determineReadingStatus(progress.progress * 100, progress),
								progressPercent: progress.progress * 100,
								lastListened: progress.lastUpdate ? new Date(progress.lastUpdate).toISOString() : null
							});
						}
					}
				}
			} catch (error) {
				// Could not fetch direct progress data
			}
			
		} catch (error) {
			// Could not fetch user progress
		}
		
		return progressMap;
	}
	
	private determineReadingStatus(progressPercent: number, sessionOrProgress: any): string {
		if (progressPercent >= 98) {
			return 'Finished';
		} else if (progressPercent >= 1) {
			return 'In Progress';
		} else if (sessionOrProgress?.startedAt || sessionOrProgress?.timeListening > 0) {
			return 'Started';
		} else {
			return 'Not Started';
		}
	}

	async downloadCover(book: AudiobookshelfBook, app: any): Promise<string | null> {
		if (!book.id || !this.settings.downloadCovers) {
			return null;
		}

		try {
			const coverFilename = this.generateCoverFilename(book);
			const coverPath = `${this.settings.coversFolder}/${coverFilename}`;
			
			// Check if cover already exists
			const existingCover = app.vault.getAbstractFileByPath(coverPath);
			if (existingCover) {
				return coverPath;
			}
			
			// Try different cover endpoints
			const timestamp = Date.now(); // Add timestamp for cache busting
			const coverEndpoints = [
				`/audiobookshelf/api/items/${book.id}/cover?ts=${timestamp}`,
				`/api/items/${book.id}/cover?ts=${timestamp}`,
				`/audiobookshelf/api/library-items/${book.id}/cover?ts=${timestamp}`,
				`/api/library-items/${book.id}/cover?ts=${timestamp}`
			];
			
			let coverDownloaded = false;
			let lastError = '';
			
			for (const endpoint of coverEndpoints) {
				try {
					const coverUrl = `${this.settings.serverUrl}${endpoint}`;
					
					const response = await requestUrl({
						url: coverUrl,
						method: 'GET',
						headers: {
							'Authorization': `Bearer ${this.authToken}`
						}
					});
					
					if (response.status === 200) {
						// Mark as downloaded for frontmatter purposes, but use remote URL
						coverDownloaded = true;
						break;
					} else {
						lastError = `Status ${response.status} from ${endpoint}`;
					}
				} catch (error) {
					lastError = `Error with ${endpoint}: ${error.message}`;
				}
			}
			
			if (coverDownloaded) {
				return coverPath;
			} else {
				return null;
			}
		} catch (error) {
			return null;
		}
	}

	private generateCoverFilename(book: AudiobookshelfBook): string {
		const title = book.media.metadata.title || 'unknown';
		const author = book.media.metadata.authorName || 'unknown';
		
		// Sanitize for filename
		const sanitizedTitle = title
			.replace(/[<>:"/\\|?*\x00-\x1F\x7F]/g, '')
			.replace(/[^\w\s.-]/g, '')
			.replace(/\s+/g, '_')
			.substring(0, 50);
			
		const sanitizedAuthor = author
			.replace(/[<>:"/\\|?*\x00-\x1F\x7F]/g, '')
			.replace(/[^\w\s.-]/g, '')
			.replace(/\s+/g, '_')
			.substring(0, 30);
		
		return `${sanitizedTitle}_${sanitizedAuthor}.jpg`;
	}
}
