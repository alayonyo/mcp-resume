// Global state
let isLoading = false;
let serverStatus = 'connecting';

// DOM Elements
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const loadingOverlay = document.getElementById('loading-overlay');
const resultsContent = document.getElementById('results-content');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 File Context MCP UI Loaded');
  checkServerStatus();

  // Set up chat input focus
  chatInput.focus();
});

// Server status check
async function checkServerStatus() {
  try {
    updateStatus('connecting', 'Checking server...');

    const response = await fetch('/api/status');
    if (response.ok) {
      updateStatus('connected', 'Server connected');
    } else {
      throw new Error('Server not responding');
    }
  } catch (error) {
    updateStatus('error', 'Server unavailable');
    console.error('Server status check failed:', error);
  }
}

function updateStatus(status, message) {
  serverStatus = status;
  statusText.textContent = message;
  statusDot.className = `status-dot ${status}`;
}

// Loading state management
function showLoading() {
  isLoading = true;
  loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  isLoading = false;
  loadingOverlay.classList.add('hidden');
}

// Results display
function displayResults(content, type = 'text') {
  const timestamp = new Date().toLocaleTimeString();

  if (type === 'error') {
    resultsContent.innerHTML = `
            <div class="error">
                <strong>❌ Error (${timestamp})</strong><br>
                ${escapeHtml(content)}
            </div>
        `;
  } else {
    // Format content based on type
    let formattedContent = content;

    if (typeof content === 'object') {
      formattedContent = JSON.stringify(content, null, 2);
    } else if (content.includes('\n')) {
      // Multi-line content - preserve formatting
      formattedContent = escapeHtml(content).replace(/\n/g, '<br>');
    } else {
      formattedContent = escapeHtml(content);
    }

    resultsContent.innerHTML = `
            <div class="success">
                <strong>✅ Success (${timestamp})</strong>
            </div>
            <div style="margin-top: 16px; white-space: pre-wrap; word-wrap: break-word;">
                ${formattedContent}
            </div>
        `;
  }

  // Scroll to top of results
  resultsContent.scrollTop = 0;
}

// Chat functionality
function addChatMessage(content, isUser = false) {
  const timestamp = new Date().toLocaleTimeString();
  const messageClass = isUser ? 'user-message' : 'bot-message';
  const sender = isUser ? '👤 You' : '🤖 AI Assistant';

  const messageHtml = `
        <div class="message ${messageClass}">
            <div class="message-content">
                <strong>${sender}:</strong> ${escapeHtml(content)}
            </div>
            <div class="message-time">${timestamp}</div>
        </div>
    `;

  chatMessages.insertAdjacentHTML('beforeend', messageHtml);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleChatKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendChatMessage();
  }
}

async function sendChatMessage() {
  const message = chatInput.value.trim();
  if (!message || isLoading) return;

  addChatMessage(message, true);
  chatInput.value = '';

  showLoading();

  try {
    // First, check if this is a file operation command
    const nlpResult = await processNaturalLanguageCommand(message);

    if (nlpResult.action) {
      // Execute the detected file operation
      const fileResult = await callMCPTool(nlpResult.action, nlpResult.params);

      // Get Claude's analysis of the file operation result
      const aiResponse = await callClaudeAPI(message, fileResult);
      addChatMessage(aiResponse);

      // Also show the raw results
      displayResults(fileResult);
    } else {
      // For general questions, just ask Claude directly
      const aiResponse = await callClaudeAPI(message);
      addChatMessage(aiResponse);
    }
  } catch (error) {
    addChatMessage(`Sorry, I encountered an error: ${error.message}`);
    console.error('Chat error:', error);
  } finally {
    hideLoading();
  }
}

// Natural language processing
async function processNaturalLanguageCommand(message) {
  const lower = message.toLowerCase();

  // Questions about directory contents (handle first for better matching)
  if (
    (lower.includes('what') &&
      (lower.includes('files') || lower.includes('in'))) ||
    (lower.includes('show me') &&
      (lower.includes('files') || lower.includes('contents'))) ||
    lower.includes('list') ||
    lower.includes('ls')
  ) {
    let path = 'api-resources'; // default to api-resources directory only

    // Look for specific directory mentions within api-resources
    if (lower.includes('api-resources') || lower.includes('api resources')) {
      path = 'api-resources';
    } else if (
      lower.includes('current directory') ||
      lower.includes('current folder') ||
      lower.includes('this directory')
    ) {
      path = 'api-resources'; // redirect current directory requests to api-resources
    } else {
      // Try to extract directory name from patterns like "what files are in folder_name"
      const dirMatch = message.match(
        /(?:in|from)\s+(?:the\s+)?([a-zA-Z0-9\-_\/\.]+)(?:\s+(?:directory|folder|dir))?/i
      );
      if (dirMatch && dirMatch[1]) {
        const extractedPath = dirMatch[1].toLowerCase();
        // Filter out common words that aren't directory names
        if (
          ![
            'the',
            'a',
            'an',
            'this',
            'that',
            'current',
            'files',
            'directory',
            'folder',
          ].includes(extractedPath)
        ) {
          // Always ensure we're within api-resources
          path = dirMatch[1].startsWith('api-resources')
            ? dirMatch[1]
            : `api-resources/${dirMatch[1]}`;
        }
      }
    }

    return {
      action: 'list_directory',
      params: { path },
    };
  }

  // File reading commands
  if (
    lower.includes('read') ||
    lower.includes('show') ||
    lower.includes('open')
  ) {
    const fileMatch = message.match(/read|show|open\s+([^\s]+)/i);
    if (fileMatch) {
      return {
        action: 'read_file',
        params: { path: fileMatch[1] },
      };
    }
  }

  // Simple list/ls commands (for direct commands like "ls src" or "list api-resources")
  if (
    (lower.startsWith('list ') || lower.startsWith('ls ')) &&
    !lower.includes('what')
  ) {
    // Extract the directory from direct list commands
    const pathMatch = message.match(/(?:list|ls)\s+([a-zA-Z0-9\/\.\-_]+)/i);
    let path = pathMatch ? pathMatch[1] : 'api-resources';

    // Ensure path is within api-resources
    if (path === '.' || path === '') {
      path = 'api-resources';
    } else if (!path.startsWith('api-resources')) {
      path = `api-resources/${path}`;
    }

    return {
      action: 'list_directory',
      params: { path },
    };
  }

  // Search commands
  if (lower.includes('search') || lower.includes('find')) {
    const searchMatch = message.match(
      /(?:search|find)\s+(?:for\s+)?([^\s]+)(?:\s+in\s+([a-zA-Z0-9\/\.\-_]+))?/i
    );
    if (searchMatch) {
      let rootPath = searchMatch[2] || 'api-resources';

      // Ensure search path is within api-resources
      if (rootPath === '.' || rootPath === '') {
        rootPath = 'api-resources';
      } else if (!rootPath.startsWith('api-resources')) {
        rootPath = `api-resources/${rootPath}`;
      }

      return {
        action: 'search_files',
        params: {
          rootPath: rootPath,
          pattern: searchMatch[1],
        },
      };
    }
  }

  // Analyze commands
  if (
    lower.includes('analyze') ||
    lower.includes('summary') ||
    lower.includes('overview')
  ) {
    const pathMatch = message.match(
      /(?:analyze|summary|overview)(?:\s+of)?\s+([^\s]+)/i
    );
    let path = pathMatch ? pathMatch[1] : 'api-resources';

    // Ensure analyze path is within api-resources
    if (path === '.' || path === '') {
      path = 'api-resources';
    } else if (!path.startsWith('api-resources')) {
      path = `api-resources/${path}`;
    }

    // Check if it's a file (has extension) vs directory
    if (path.includes('.') && path.match(/\.[a-zA-Z0-9]+$/)) {
      // It's a file - use read_file instead
      return {
        action: 'read_file',
        params: { path },
      };
    } else {
      // It's a directory - use analyze_folder
      return {
        action: 'analyze_folder',
        params: { path },
      };
    }
  }

  // Default responses for common questions
  if (lower.includes('help') || lower.includes('what can')) {
    return {
      response: `I can help you with file operations! Here are some things you can try:

📖 **Read files**: "Read package.json" or "Show the README file"
📁 **List directories**: "List current directory" or "What's in src folder?"
🔍 **Search files**: "Find all .js files" or "Search for config in src"
📊 **Analyze folders**: "Analyze current folder" or "Give me an overview of src"

Just ask naturally, and I'll try to understand what you want to do!`,
    };
  }

  return {
    response: `I understand you want to: "${message}"
        
I can help with file operations. Try commands like:
• "List current directory"
• "Read package.json" 
• "Search for .js files"
• "Analyze this folder"

Or use the tools on the left for direct access!`,
  };
}

// Action execution
async function executeAction(action, params) {
  try {
    let result;

    switch (action) {
      case 'read_file':
        result = await callMCPTool('read_file', { path: params.path });
        addChatMessage(`Reading file: ${params.path}`);
        break;

      case 'list_directory':
        result = await callMCPTool('list_directory', { path: params.path });
        addChatMessage(`Listing directory: ${params.path}`);
        break;

      case 'search_files':
        result = await callMCPTool('search_files', {
          rootPath: params.rootPath,
          pattern: params.pattern,
        });
        addChatMessage(
          `Searching for "${params.pattern}" in ${params.rootPath}`
        );
        break;

      case 'analyze_folder':
        result = await callMCPTool('analyze_folder', { path: params.path });
        addChatMessage(`Analyzing folder: ${params.path}`);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    displayResults(result);
  } catch (error) {
    displayResults(error.message, 'error');
    addChatMessage(`❌ Error: ${error.message}`);
  }
}

// Claude API calls
async function callClaudeAPI(message, context = null) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: message,
      context: context,
    }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Server error: ${response.status}`);
  }

  const data = await response.json();

  // Log token usage if available
  if (data.usage) {
    console.log(
      `📊 Claude Usage - Prompt: ${data.usage.promptTokens}, Completion: ${data.usage.completionTokens}, Total: ${data.usage.totalTokens}`
    );
  }

  return data.response;
}

// MCP Tool API calls
async function callMCPTool(toolName, params) {
  const response = await fetch('/api/tools', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tool: toolName,
      params: params,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Server error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.result;
}

// File operation functions (called by buttons)
async function readFile() {
  const path = document.getElementById('read-file-path').value.trim();
  if (!path) {
    displayResults('Please enter a file path', 'error');
    return;
  }

  showLoading();
  try {
    const result = await callMCPTool('read_file', { path });
    displayResults(result);
    addChatMessage(`📖 Read file: ${path}`);
  } catch (error) {
    displayResults(error.message, 'error');
  } finally {
    hideLoading();
  }
}

async function listDirectory() {
  const path =
    document.getElementById('list-dir-path').value.trim() || 'api-resources';

  showLoading();
  try {
    const result = await callMCPTool('list_directory', { path });
    displayResults(result);
    addChatMessage(`📁 Listed directory: ${path}`);
  } catch (error) {
    displayResults(error.message, 'error');
  } finally {
    hideLoading();
  }
}

async function searchFiles() {
  const rootPath =
    document.getElementById('search-root-path').value.trim() || 'api-resources';
  const pattern = document.getElementById('search-pattern').value.trim();

  if (!pattern) {
    displayResults('Please enter a search pattern', 'error');
    return;
  }

  showLoading();
  try {
    const result = await callMCPTool('search_files', { rootPath, pattern });
    displayResults(result);
    addChatMessage(`🔍 Searched for "${pattern}" in ${rootPath}`);
  } catch (error) {
    displayResults(error.message, 'error');
  } finally {
    hideLoading();
  }
}

async function analyzeFolder() {
  const path =
    document.getElementById('analyze-folder-path').value.trim() ||
    'api-resources';

  showLoading();
  try {
    const result = await callMCPTool('analyze_folder', { path });
    displayResults(result);
    addChatMessage(`📊 Analyzed folder: ${path}`);
  } catch (error) {
    displayResults(error.message, 'error');
  } finally {
    hideLoading();
  }
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
  // Ctrl/Cmd + K to focus chat input
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault();
    chatInput.focus();
  }

  // Escape to clear chat input
  if (event.key === 'Escape' && document.activeElement === chatInput) {
    chatInput.value = '';
  }
});

console.log(
  '🎉 MCP UI Ready! Try typing "help" in the chat or use the file tools on the left.'
);
