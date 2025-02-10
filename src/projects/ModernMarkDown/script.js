/**
 * MarkdownEditor - A minimalist markdown editor with real-time preview
 * Features:
 * - Multiple document support with auto-save
 * - Three viewing modes: Edit, Read, and Zen
 * - Smart markdown shortcuts and formatting
 * - File import/export support
 * - Synchronized split-screen preview
 */
class MarkdownEditor {
    /**
     * Initialize the editor and set up all required components
     * @constructor
     */
    constructor() {
        // DOM elements
        this.container = document.getElementById('editor-container');
        this.editorWrapper = document.getElementById('editor-wrapper');
        this.preview = document.getElementById('preview');
        this.modeToggle = document.getElementById('mode-toggle');
        
        // Editor state
        this.modes = ['edit', 'read', 'zen'];
        this.currentMode = 0;
        
        // Add scroll position tracking
        this.lastScrollPosition = 0;
        this.isScrolling = false;
        
        // Initialize mode indicators
        const indicators = document.querySelectorAll('.mode-indicator');
        indicators[0].classList.add('active');
        
        // Initialize CodeMirror
        this.editor = CodeMirror(this.editorWrapper, {
            mode: 'markdown',
            theme: 'material-darker',
            lineNumbers: true,
            lineWrapping: true,
            autofocus: true,
            tabSize: 4,
            indentUnit: 4,
            indentWithTabs: true,
            viewportMargin: Infinity,
            extraKeys: {
                'Tab': (cm) => {
                    if (cm.somethingSelected()) {
                        cm.indentSelection('add');
                    } else {
                        cm.replaceSelection('\t', 'end');
                    }
                },
                'Shift-Tab': (cm) => {
                    if (cm.somethingSelected()) {
                        cm.indentSelection('subtract');
                    } else {
                        cm.indentLine(cm.getCursor().line, 'subtract');
                    }
                },
                'Backspace': (cm) => {
                    const cursor = cm.getCursor();
                    const line = cm.getLine(cursor.line);
                    const beforeCursor = line.slice(0, cursor.ch);
                    
                    if (beforeCursor.match(/^\s+$/) && cursor.ch % 4 === 0) {
                        cm.deleteH(-4, 'char');
                    } else {
                        cm.deleteH(-1, 'char');
                    }
                },
                'Ctrl-M': false,
                'Cmd-M': false,
                'Ctrl-B': cm => this.wrapSelection(cm, '**', '**'),
                'Ctrl-I': cm => this.wrapSelection(cm, '_', '_'),
                'Ctrl-L': cm => this.wrapSelection(cm, '[', '](url)'),
                'Ctrl-K': cm => this.wrapSelection(cm, '`', '`'),
                'Enter': cm => this.handleEnter(cm) || CodeMirror.Pass
            }
        });
        
        // Set up auto-save interval
        this.setupAutoSave();
        
        // Set up export buttons
        this.setupExportButtons();
        
        // Add document management
        this.documents = {};
        this.currentDocId = 'default';
        
        // Add new DOM elements
        this.docSelector = document.getElementById('document-selector');
        
        // Set up document controls
        this.setupDocumentControls();
        
        // Initialize with stored documents
        this.loadDocuments();
        
        // Add file input handler
        this.fileInput = document.getElementById('file-input');
        this.setupFileHandling();
        
        // Set up info button
        this.setupInfoButton();
        
        this.init();
    }
    
    init() {
        // Set up event listeners
        this.setupModeToggle();
        this.setupEditorEvents();
        
        // Load saved content if any
        this.loadSavedContent();
        
        // Initial preview update
        this.updatePreview();

        // Show help on first visit
        if (!localStorage.getItem('mdHelpShown')) {
            this.showInfo();
            localStorage.setItem('mdHelpShown', 'true');
        }
    }
    
    setupModeToggle() {
        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
                e.preventDefault();
                this.toggleMode();
            }
        });
        
        // Button click
        this.modeToggle.addEventListener('click', () => this.toggleMode());
    }
    
    setupEditorEvents() {
        this.editor.on('change', () => {
            this.updatePreview();
            this.updateStats();
            this.saveContent();
        });

        // Update scroll handling for zen mode sync
        this.editor.on('scroll', () => {
            if (this.modes[this.currentMode] === 'zen') {
                this.syncZenScroll('editor');
            }
            this.handleScroll();
        });

        // Add preview scroll handler for zen mode
        this.preview.addEventListener('scroll', () => {
            if (this.modes[this.currentMode] === 'zen') {
                this.syncZenScroll('preview');
            }
            this.handleScroll();
        });

        // Add smart link paste handling
        this.editor.on('paste', (cm, e) => {
            const text = e.clipboardData.getData('text');
            if (text.match(/^https?:\/\//)) {
                e.preventDefault();
                const selection = cm.getSelection();
                const link = selection 
                    ? `[${selection}](${text})`
                    : `[${new URL(text).hostname}](${text})`;
                cm.replaceSelection(link);
            }
        });
    }
    
    /**
     * Handles mode switching between Edit, Read, and Zen modes
     * Manages UI updates and scroll position preservation
     */
    toggleMode() {
        const prevMode = this.modes[this.currentMode];
        this.currentMode = (this.currentMode + 1) % this.modes.length;
        const newMode = this.modes[this.currentMode];
        
        // Remove old mode class
        this.container.classList.remove(`mode-${prevMode}`);
        
        requestAnimationFrame(() => {
            this.container.classList.add(`mode-${newMode}`);
            
            // Update mode label and indicators
            const modeLabel = this.modeToggle.querySelector('.mode-label');
            modeLabel.textContent = newMode.charAt(0).toUpperCase() + newMode.slice(1);
            
            const indicators = document.querySelectorAll('.mode-indicator');
            indicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === this.currentMode);
            });
            
            // Handle scroll position
            if (newMode === 'zen') {
                // Reset scroll position for both panels in zen mode
                this.editor.getScrollerElement().scrollTop = 0;
                this.preview.scrollTop = 0;
                this.editor.focus();
            } else {
                // Restore scroll position for other modes
                const activeElement = newMode === 'read' 
                    ? this.preview 
                    : this.editor.getScrollerElement();
                activeElement.scrollTop = this.lastScrollPosition;
            }
            
            this.editor.refresh();
            
            setTimeout(() => {
                this.isScrolling = false;
            }, 100);
        });
    }
    
    /**
     * Updates the preview pane with rendered markdown
     * Handles code syntax highlighting and content synchronization
     */
    updatePreview() {
        const html = marked.parse(this.editor.getValue());
        this.preview.innerHTML = html;
        
        // Highlight code blocks in preview
        this.preview.querySelectorAll('pre code').forEach((block) => {
            const language = block.className.replace('language-', '') || 'plaintext';
            if (Prism.languages[language]) {
                block.innerHTML = Prism.highlight(
                    block.textContent,
                    Prism.languages[language],
                    language
                );
            }
        });

        // Ensure preview content fills available space in zen mode
        if (this.modes[this.currentMode] === 'zen') {
            const previewContent = this.preview.querySelector('.markdown-body');
            if (previewContent) {
                const minHeight = this.editor.getScrollerElement().scrollHeight;
                previewContent.style.minHeight = `${minHeight}px`;
            }
        }
    }
    
    saveContent() {
        this.saveDocuments();
        this.showSaveStatus('Saved');
    }
    
    loadSavedContent() {
        this.loadDocuments();
    }
    
    getDefaultContent() {
        return `# Welcome to ModernMarkdown

A minimalist yet powerful Markdown editor with real-time preview.

## Key Features
- Real-time preview with syntax highlighting
- Three viewing modes: Edit, Read, and Zen
- Auto-save functionality
- Multiple document support
- File import/export
- Smart markdown shortcuts

## Quick Start
1. Start typing in markdown format
2. Use Ctrl+M to switch between modes
3. Create new documents with the + button
4. Import existing .md files with ⊕
5. Your work is automatically saved

Try some markdown formatting:
- **Bold text** (Ctrl+B)
- *Italic text* (Ctrl+I)
- \`Code snippets\` (Ctrl+K)
- [Links](url) (Ctrl+L)

Happy writing! 📝`;
    }
    
    handleScroll() {
        if (this.isScrolling) return;
        
        const activeElement = this.modes[this.currentMode] === 'read' 
            ? this.preview 
            : this.editor.getScrollerElement();
            
        this.lastScrollPosition = activeElement.scrollTop;
    }
    
    // Add a method to calculate relative scroll position
    getRelativeScrollPosition(element) {
        return element.scrollTop / (element.scrollHeight - element.clientHeight);
    }
    
    // Add a method to set scroll position by relative value
    setRelativeScrollPosition(element, position) {
        element.scrollTop = position * (element.scrollHeight - element.clientHeight);
    }

    // New methods for markdown shortcuts
    wrapSelection(cm, start, end) {
        if (cm.getSelection().length > 0) {
            cm.replaceSelection(start + cm.getSelection() + end);
        } else {
            let pos = cm.getCursor();
            cm.replaceSelection(start + end);
            cm.setCursor(pos.line, pos.ch + start.length);
        }
    }

    /**
     * Handles smart list continuation and formatting
     * @param {CodeMirror} cm - The CodeMirror instance
     * @returns {boolean} - Whether the event was handled
     */
    handleEnter(cm) {
        const cursor = cm.getCursor();
        const line = cm.getLine(cursor.line);
        const match = line.match(/^(\s*)([-*+]|\d+\.)\s/);
        
        if (match && line.trim().length === match[0].length) {
            // Empty list item - remove it
            cm.replaceRange('', 
                {line: cursor.line, ch: 0}, 
                {line: cursor.line, ch: line.length});
            return true;
        } else if (match) {
            // Continue list with proper type
            let newItem;
            if (match[2].endsWith('.')) {
                // Numbered list - increment the number
                const num = parseInt(match[2]) + 1;
                newItem = match[1] + num + '. ';
            } else {
                // Bullet list - keep the same bullet type
                const bullet = match[2];
                newItem = match[1] + bullet + ' ';
            }
            cm.replaceSelection('\n' + newItem);
            return true;
        }
        return false;
    }

    // Word count and reading time
    updateStats() {
        const text = this.editor.getValue();
        const words = text.trim().split(/\s+/).length || 0;
        const readingTime = Math.ceil(words / 200); // Average reading speed
        
        const statsEl = document.querySelector('.word-count');
        statsEl.textContent = `${words} words · ${readingTime} min read`;
    }

    // Auto-save functionality
    setupAutoSave() {
        let saveTimeout;
        this.editor.on('change', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => this.saveContent(), 1000);
        });
    }

    showSaveStatus(message) {
        const status = document.querySelector('.save-status');
        status.textContent = message;
        status.classList.add('visible');
        setTimeout(() => status.classList.remove('visible'), 2000);
    }

    // Export functionality
    setupExportButtons() {
        document.querySelector('.export-md').addEventListener('click', () => this.exportMarkdown());
        document.querySelector('.export-html').addEventListener('click', () => this.exportHTML());
    }

    exportMarkdown() {
        const content = this.editor.getValue();
        this.downloadBlob(
            new Blob([content], { type: 'text/markdown' }), 
            'document.md'
        );
    }

    exportHTML() {
        const content = marked.parse(this.editor.getValue());
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Exported Document</title>
    <style>
        body { max-width: 800px; margin: 40px auto; padding: 0 20px; }
        code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; }
        pre code { display: block; padding: 10px; }
        blockquote { border-left: 3px solid #ddd; margin: 0; padding-left: 1em; }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
        this.downloadBlob(
            new Blob([html], { type: 'text/html' }), 
            'document.html'
        );
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Synchronizes scrolling between editor and preview in Zen mode
     * @param {string} source - The source of the scroll event ('editor' or 'preview')
     */
    syncZenScroll(source) {
        if (this.isScrolling) return;
        this.isScrolling = true;

        const editorElement = this.editor.getScrollerElement();
        const previewElement = this.preview;

        // Calculate available scroll space
        const editorMax = Math.max(0, editorElement.scrollHeight - editorElement.clientHeight);
        const previewMax = Math.max(0, previewElement.scrollHeight - previewElement.clientHeight);

        if (editorMax === 0 || previewMax === 0) {
            this.isScrolling = false;
            return;
        }

        if (source === 'editor') {
            const ratio = editorElement.scrollTop / editorMax;
            previewElement.scrollTop = ratio * previewMax;
        } else {
            const ratio = previewElement.scrollTop / previewMax;
            editorElement.scrollTop = ratio * editorMax;
        }

        // Reset scroll lock after a short delay
        setTimeout(() => {
            this.isScrolling = false;
        }, 50);
    }

    setupDocumentControls() {
        // New document button
        document.querySelector('.new-doc').addEventListener('click', () => this.createNewDocument());
        
        // Delete document button
        document.querySelector('.delete-doc').addEventListener('click', () => this.deleteCurrentDocument());
        
        // Document selector
        this.docSelector.addEventListener('change', (e) => {
            this.switchDocument(e.target.value);
        });
    }
    
    loadDocuments() {
        // Load documents from localStorage
        const stored = localStorage.getItem('mdDocuments');
        try {
            if (stored) {
                this.documents = JSON.parse(stored);
                // Ensure default document exists
                if (!this.documents.default) {
                    this.documents.default = {
                        title: 'Welcome Guide',
                        content: this.getDefaultContent()
                    };
                }
            } else {
                // Initialize with welcome document
                this.documents = {
                    default: {
                        title: 'Welcome Guide',
                        content: this.getDefaultContent()
                    }
                };
            }
        } catch (e) {
            console.error('Error loading documents:', e);
            // Reset to default if there's an error
            this.documents = {
                default: {
                    title: 'Welcome Guide',
                    content: this.getDefaultContent()
                }
            };
        }
        
        // Update selector options
        this.updateDocumentList();
        
        // Load the last active document or default if it doesn't exist
        const lastDoc = localStorage.getItem('mdLastDocument');
        this.switchDocument(lastDoc && this.documents[lastDoc] ? lastDoc : 'default');
    }
    
    updateDocumentList() {
        // Clear existing options
        this.docSelector.innerHTML = '';
        
        // Add option for each document
        Object.entries(this.documents).forEach(([id, doc]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = doc.title;
            option.selected = id === this.currentDocId;
            this.docSelector.appendChild(option);
        });
    }
    
    createNewDocument() {
        const title = prompt('Enter document name:', 'Untitled Document');
        if (!title) return;
        
        const id = 'doc_' + Date.now();
        this.documents[id] = {
            title: title,
            content: ''
        };
        
        this.saveDocuments();
        this.updateDocumentList();
        this.switchDocument(id);
    }
    
    deleteCurrentDocument() {
        if (this.currentDocId === 'default') {
            alert('Cannot delete the welcome guide!');
            return;
        }
        
        if (!confirm(`Delete "${this.documents[this.currentDocId].title}"?`)) return;
        
        // Store the current ID before deletion
        const idToDelete = this.currentDocId;
        
        // Switch to default document first
        this.switchDocument('default');
        
        // Then delete the document
        delete this.documents[idToDelete];
        
        // Update storage and UI
        this.saveDocuments();
        this.updateDocumentList();
    }
    
    /**
     * Manages document switching and content preservation
     * @param {string} id - The ID of the document to switch to
     */
    switchDocument(id) {
        // Validate that the document exists
        if (!this.documents[id]) {
            console.error(`Document ${id} not found`);
            id = 'default';
        }
        
        // Save current document content before switching
        if (this.currentDocId && this.documents[this.currentDocId]) {
            this.documents[this.currentDocId].content = this.editor.getValue();
        }
        
        // Switch to new document
        this.currentDocId = id;
        this.editor.setValue(this.documents[id].content);
        
        // Update UI
        this.docSelector.value = id;
        
        // Save last active document
        localStorage.setItem('mdLastDocument', id);
        
        // Update browser tab title
        document.title = `${this.documents[id].title} - Markdown Editor`;
        
        // Update preview
        this.updatePreview();
    }
    
    saveDocuments() {
        // Save current document content
        this.documents[this.currentDocId].content = this.editor.getValue();
        
        // Save all documents to localStorage
        localStorage.setItem('mdDocuments', JSON.stringify(this.documents));
    }

    setupFileHandling() {
        // Open file button click
        document.querySelector('.open-file').addEventListener('click', () => {
            this.fileInput.click();
        });

        // File input change
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.openFile(file);
            }
            // Reset input so the same file can be selected again
            this.fileInput.value = '';
        });

        // Setup drag and drop
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const container = document.getElementById('editor-container');
        
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            container.classList.add('drag-over');
        });

        container.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            container.classList.remove('drag-over');
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            container.classList.remove('drag-over');

            const file = e.dataTransfer.files[0];
            if (file && (file.type === 'text/markdown' || file.name.endsWith('.md'))) {
                this.openFile(file);
            }
        });
    }

    openFile(file) {
        // File size validation
        if (file.size > 1024 * 1024) { // 1MB limit
            alert('File is too large. Maximum size is 1MB.');
            return;
        }

        // File type validation
        if (!file.name.toLowerCase().endsWith('.md') && file.type !== 'text/markdown') {
            alert('Please select a markdown (.md) file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                if (content.length > 100000) { // Additional size check
                    throw new Error('File content is too large');
                }
                
                const fileName = file.name.replace(/\.[^/.]+$/, "");
                const id = 'doc_' + Date.now();
                
                this.documents[id] = {
                    title: fileName,
                    content: content
                };
                
                this.saveDocuments();
                this.updateDocumentList();
                this.switchDocument(id);
            } catch (error) {
                alert('Error loading file: ' + error.message);
            }
        };
        
        reader.onerror = () => {
            alert('Error reading file');
        };
        
        reader.readAsText(file);
    }

    setupInfoButton() {
        const infoButton = document.querySelector('.info-button');
        infoButton.addEventListener('click', () => this.showInfo());
    }

    showInfo() {
        // Create modal if it doesn't exist
        if (!document.querySelector('.info-modal')) {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            
            const modal = document.createElement('div');
            modal.className = 'info-modal';
            modal.innerHTML = this.getInfoContent();
            
            document.body.appendChild(overlay);
            document.body.appendChild(modal);
            
            // Close on overlay click or escape
            overlay.addEventListener('click', () => this.hideInfo());
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.hideInfo();
            });
        }
        
        document.querySelector('.modal-overlay').classList.add('visible');
        document.querySelector('.info-modal').classList.add('visible');
    }

    hideInfo() {
        document.querySelector('.modal-overlay').classList.remove('visible');
        document.querySelector('.info-modal').classList.remove('visible');
    }

    getInfoContent() {
        return `
            <h2>ModernMarkdown Editor Guide</h2>
            
            <h3>Viewing Modes</h3>
            <ul>
                <li><strong>Edit Mode:</strong> Full-width editor for focused writing</li>
                <li><strong>Read Mode:</strong> Clean, distraction-free preview</li>
                <li><strong>Zen Mode:</strong> Split-screen with synchronized scrolling</li>
            </ul>

            <h3>Keyboard Shortcuts</h3>
            <ul>
                <li><strong>Ctrl+M:</strong> Toggle between Edit, Read, and Zen modes</li>
                <li><strong>Ctrl+B:</strong> Bold text</li>
                <li><strong>Ctrl+I:</strong> Italic text</li>
                <li><strong>Ctrl+K:</strong> Code snippet</li>
                <li><strong>Ctrl+L:</strong> Create link</li>
                <li><strong>Tab/Shift+Tab:</strong> Indent/unindent</li>
            </ul>

            <h3>Smart Features</h3>
            <ul>
                <li><strong>Auto-continuing lists:</strong> Press Enter in a list to continue it</li>
                <li><strong>Smart link pasting:</strong> Paste URLs to automatically create markdown links</li>
                <li><strong>Auto-save:</strong> All documents are automatically saved locally</li>
                <li><strong>Multiple documents:</strong> Create and manage multiple markdown files</li>
                <li><strong>File handling:</strong> Import/export markdown and HTML files</li>
                <li><strong>Drag & drop:</strong> Drop .md files anywhere to open them</li>
            </ul>

            <h3>Markdown Syntax Guide</h3>
            <pre><code># Heading 1
## Heading 2
### Heading 3

**bold text** or __bold__
*italic text* or _italic_
\`inline code\`

- Bullet list
- Another item
  - Indented item

1. Numbered list
2. Second item

> Blockquote text

[Link text](url)
![Image alt text](image-url)

\`\`\`
Code block
\`\`\`

---
Horizontal rule</code></pre>

            <p><em>Tip: You can always access this guide by clicking the ? button in the toolbar.</em></p>
        `;
    }
}

// Initialize the editor
const editor = new MarkdownEditor();
