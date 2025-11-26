# Audiobookshelf Sync Plugin

A plugin for Obsidian that syncs your Audiobookshelf library with your notes.

## Features

- 🔄 **One-click sync** with your Audiobookshelf server
- 📚 **Automatic note creation** for each book in your library
- 📝 **Rich metadata** including author, narrator, genres, and more
- 🗂️ **Organized by library** in separate folders
- ⚙️ **Configurable settings** for server connection and output location
- 🎯 **Duplicate detection** - won't create duplicate notes

## Setup

1. Install the plugin in Obsidian
2. Go to Settings → Audiobookshelf Sync
3. Configure your server settings:
   - **Server URL**: Your Audiobookshelf server (e.g., `https://audiobookshelf.example.com`)
   - **Username**: Your Audiobookshelf username
   - **Password**: Your Audiobookshelf password
   - **Output Folder**: Where to create book notes (default: `Books`)
4. Click "Test Connection" to verify your settings
5. Use the ribbon icon or command palette to sync your library

## Usage

### Sync Your Library

The plugin offers multiple sync modes to protect your notes:

#### Sync Commands Available:
- **"Sync Audiobookshelf Libraries"** - Uses your default sync mode
- **"Sync Audiobookshelf (Create New Only)"** - Only creates notes for new books, never overwrites existing ones
- **"Sync Audiobookshelf (Update Metadata Only)"** - Updates frontmatter/metadata but preserves all your content
- **"Sync Audiobookshelf (Full Overwrite - DANGER)"** - Completely overwrites existing notes (use with caution!)

#### Setting Up Hotkeys:
1. Go to **Settings → Hotkeys** in Obsidian
2. Search for "Audiobookshelf"
3. Click the **+** button next to any command to assign a hotkey
4. **Suggested hotkeys:**
   - Main Sync: `Ctrl+Shift+A` (or `Cmd+Shift+A` on Mac)
   - Create New Only: `Ctrl+Shift+N`
   - Update Metadata: `Ctrl+Shift+U`

#### Sync Modes Explained:

**🟢 Create New Only (Recommended)**
- Creates notes for new books only
- Existing notes are completely untouched
- Perfect for regular syncing without losing your notes
- **Safe**: No risk of losing your content

**🟡 Update Metadata Only**
- Updates book metadata (progress, status, etc.) in frontmatter
- Preserves all your notes, quotes, and content
- Keeps user-added fields like ratings and reviews
- **Safe**: Your content is preserved, only metadata updates

**🔴 Full Overwrite (DANGER)**
- Completely replaces existing notes with fresh content
- **ALL YOUR NOTES WILL BE LOST**
- Only use if you want to start over or haven't added any notes yet
- **Dangerous**: Use only when you're sure you want to lose existing content

### Generated Notes
Each book note includes:
- **Title and Author** as heading
- **Rich frontmatter** with metadata (genres, narrator, duration, etc.)
- **Description** from Audiobookshelf
- **Empty sections** for your notes and quotes
- **Audiobookshelf ID** for tracking

### Example Note Structure
```markdown
---
title: "The Great Gatsby"
author: "F. Scott Fitzgerald"
narrator: "Jake Gyllenhaal"
genres:
  - "Fiction"
  - "Classic Literature"
published: 1925
duration: 4 hours
audiobookshelf_id: "li_abc123"
added_at: "2024-01-15"
source: "Audiobookshelf"
---

# The Great Gatsby

**Author:** F. Scott Fitzgerald

**Narrator:** Jake Gyllenhaal

## Description

The story of Jay Gatsby and his unrequited love...

## Notes


## Quotes
```

## Templates

### Using Custom Templates

You can create a custom template file and specify its path in the plugin settings. The template should be a markdown file with placeholders that will be replaced with book data.

#### Template Variables

The plugin supports the following variables in templates:

**Basic Information:**
- `{{title}}` - Book title
- `{{author}}` - Author name
- `{{narrator}}` - Narrator name (if available)
- `{{description}}` - Book description

**Metadata:**
- `{{genres}}` - Array of genres (will be formatted as YAML list)
- `{{tags}}` - Array of tags (will be formatted as YAML list)
- `{{publisher}}` - Publisher name
- `{{publishedYear}}` - Publication year
- `{{language}}` - Book language

**Technical Details:**
- `{{duration}}` - Duration in hours (calculated)
- `{{size}}` - File size in bytes
- `{{addedAt}}` - Date added to Audiobookshelf (formatted per settings)
- `{{audiobookshelfId}}` - Unique Audiobookshelf ID

**Reading Progress & Status:**
- `{{readingStatus}}` - Current status: `not-started`, `in-progress`, or `finished`
- `{{progressPercentage}}` - Progress as percentage (0-100)
- `{{currentTime}}` - Current listening position (e.g., "2h 30m")
- `{{timeRemaining}}` - Time remaining to finish (e.g., "1h 15m")
- `{{isFinished}}` - Boolean: `true` if finished, `false` otherwise
- `{{lastListened}}` - Date last listened (formatted per settings)
- `{{startedAt}}` - Date first started listening
- `{{finishedAt}}` - Date finished (only if completed)

#### Example Template

Create a file like `Templates/Audiobook Template.md`:

```markdown
---
title: "{{title}}"
author: "{{author}}"
narrator: "{{narrator}}"
genres: {{genres}}
tags: {{tags}}
published: {{publishedYear}}
publisher: "{{publisher}}"
duration: {{duration}} hours
audiobookshelf_id: "{{audiobookshelfId}}"
added_at: "{{addedAt}}"
reading_status: "{{readingStatus}}"
progress: "{{progressPercentage}}%"
last_listened: "{{lastListened}}"
finished_at: "{{finishedAt}}"
source: "Audiobookshelf"
rating: 
---

# {{title}}

> [!info] Book Info
> **Author:** {{author}}
> **Narrator:** {{narrator}}
> **Duration:** {{duration}} hours
> **Published:** {{publishedYear}}
> **Status:** {{readingStatus}} ({{progressPercentage}}% complete)
> **Current Position:** {{currentTime}} / {{duration}}h
> **Time Remaining:** {{timeRemaining}}

> [!progress] Reading Progress
> **Started:** {{startedAt}}
> **Last Listened:** {{lastListened}}
> **Finished:** {{finishedAt}}
> 
> Progress: {{progressPercentage}}% complete
> 
> ```
> ████████████████████████████████████████ {{progressPercentage}}%
> ```

## Summary

{{description}}

## My Notes

### Key Takeaways
- 

### Favorite Quotes
> 

## Review

**Rating:** ⭐⭐⭐⭐⭐
**Recommendation:** 
```

Then set the template path in plugin settings: `Templates/Audiobook Template.md`

### Available Fields Reference

For a complete list of available fields from the Audiobookshelf API, see:
- [Audiobookshelf API Documentation](https://api.audiobookshelf.org/)
- [Library Item Schema](https://api.audiobookshelf.org/#library-item)
- [Book Metadata Schema](https://api.audiobookshelf.org/#book-metadata)

The plugin extracts and processes the following data structure from each library item:

```json
{
  "id": "library_item_id",
  "media": {
    "metadata": {
      "title": "Book Title",
      "authorName": "Author Name",
      "narratorName": "Narrator Name",
      "description": "Book description...",
      "genres": ["Genre1", "Genre2"],
      "publishedYear": "2023",
      "publisher": "Publisher Name",
      "language": "en"
    },
    "duration": 28800,
    "tags": ["tag1", "tag2"]
  },
  "addedAt": 1640995200000,
  "size": 157286400
}
```

## Development

```bash
# Install dependencies
pnpm install

# Start development mode (watch for changes)
pnpm run dev

# Build for production
pnpm run build

# Clean build artifacts
pnpm run clean
```

### Build Output

The build process creates a `dist/` folder containing:
- `main.js` - The compiled plugin code
- `manifest.json` - Plugin metadata

To install the plugin:
1. Copy the entire `dist/` folder to your vault's `.obsidian/plugins/audiobookshelf-sync/` directory
2. Rename the `dist/` folder to `audiobookshelf-sync/`
3. Enable the plugin in Obsidian settings

## License

MIT