class OpenCodeWebClient {
    constructor() {
        this.baseUrl = '';
        this.currentSession = null;
        this.sessions = [];
        this.providers = [];
        this.modes = [];
        this.selectedProvider = null;
        this.selectedModel = null;
        this.selectedMode = null;
        this.eventSource = null;
        
        this.init();
    }
    
    async init() {
        this.bindEvents();
        await this.loadInitialData();
        this.connectToEvents();
    }
    
    bindEvents() {
        document.getElementById('new-session').addEventListener('click', () => this.createSession());
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        const providerSelect = document.getElementById('provider-select');
        const modelSelect = document.getElementById('model-select');
        const modeSelect = document.getElementById('mode-select');
        
        providerSelect.addEventListener('change', (e) => {
            this.selectedProvider = e.target.value;
            this.updateModelOptions();
        });
        
        modelSelect.addEventListener('change', (e) => {
            this.selectedModel = e.target.value;
        });
        
        modeSelect.addEventListener('change', (e) => {
            this.selectedMode = e.target.value;
        });
    }
    
    async loadInitialData() {
        try {
            this.updateStatus('Loading...', 'loading');
            
            // Load app info
            await this.apiCall('/app');
            
            // Load sessions
            await this.loadSessions();
            
            // Load providers
            await this.loadProviders();
            
            // Load modes
            await this.loadModes();
            
            this.updateStatus('Connected', 'connected');
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.updateStatus('Error loading data', 'error');
        }
    }
    
    async loadSessions() {
        try {
            const sessions = await this.apiCall('/session');
            this.sessions = sessions;
            this.renderSessions();
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    }
    
    async loadProviders() {
        try {
            const data = await this.apiCall('/config/providers');
            this.providers = data.providers;
            this.renderProviders();
            this.updateProviderOptions();
        } catch (error) {
            console.error('Failed to load providers:', error);
        }
    }
    
    async loadModes() {
        try {
            const modes = await this.apiCall('/mode');
            this.modes = modes;
            this.renderModes();
            this.updateModeOptions();
        } catch (error) {
            console.error('Failed to load modes:', error);
        }
    }
    
    renderSessions() {
        const container = document.getElementById('sessions');
        if (this.sessions.length === 0) {
            container.innerHTML = '<div class="empty-state">No sessions</div>';
            return;
        }
        
        container.innerHTML = this.sessions.map(session => `
            <div class="session-item ${session.id === this.currentSession?.id ? 'active' : ''}" 
                 data-id="${session.id}" onclick="client.selectSession('${session.id}')">
                <div>${session.name || session.id.slice(0, 8)}</div>
                <div style="font-size: 11px; color: #7d8590;">${new Date(session.timeCreated).toLocaleString()}</div>
            </div>
        `).join('');
    }
    
    renderProviders() {
        const container = document.getElementById('providers');
        if (this.providers.length === 0) {
            container.innerHTML = '<div class="empty-state">No providers</div>';
            return;
        }
        
        container.innerHTML = this.providers.map(provider => `
            <div class="provider-item" data-id="${provider.id}">
                <div>${provider.name}</div>
                <div style="font-size: 11px; color: #7d8590;">${Object.keys(provider.models).length} models</div>
            </div>
        `).join('');
    }
    
    renderModes() {
        const container = document.getElementById('modes');
        if (this.modes.length === 0) {
            container.innerHTML = '<div class="empty-state">No modes</div>';
            return;
        }
        
        container.innerHTML = this.modes.map(mode => `
            <div class="mode-item" data-id="${mode.id}">
                <div>${mode.name}</div>
                <div style="font-size: 11px; color: #7d8590;">${mode.description || ''}</div>
            </div>
        `).join('');
    }
    
    updateProviderOptions() {
        const select = document.getElementById('provider-select');
        select.innerHTML = '<option value="">Select Provider</option>' + 
            this.providers.map(provider => 
                `<option value="${provider.id}">${provider.name}</option>`
            ).join('');
    }
    
    updateModelOptions() {
        const select = document.getElementById('model-select');
        select.innerHTML = '<option value="">Select Model</option>';
        
        if (this.selectedProvider) {
            const provider = this.providers.find(p => p.id === this.selectedProvider);
            if (provider) {
                select.innerHTML += Object.values(provider.models).map(model => 
                    `<option value="${model.id}">${model.name}</option>`
                ).join('');
            }
        }
    }
    
    updateModeOptions() {
        const select = document.getElementById('mode-select');
        select.innerHTML = '<option value="">Select Mode</option>' + 
            this.modes.map(mode => 
                `<option value="${mode.id}">${mode.name}</option>`
            ).join('');
    }
    
    async selectSession(sessionId) {
        try {
            const sessions = await this.apiCall('/session');
            this.currentSession = sessions.find(s => s.id === sessionId);
            this.renderSessions();
            await this.loadMessages();
        } catch (error) {
            console.error('Failed to select session:', error);
        }
    }
    
    async createSession() {
        try {
            const session = await this.apiCall('/session', 'POST');
            this.sessions.push(session);
            this.currentSession = session;
            this.renderSessions();
            this.clearMessages();
        } catch (error) {
            console.error('Failed to create session:', error);
        }
    }
    
    async loadMessages() {
        if (!this.currentSession) return;
        
        try {
            const messages = await this.apiCall(`/session/${this.currentSession.id}/message`);
            this.renderMessages(messages);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }
    
    renderMessages(messages) {
        const container = document.getElementById('messages');
        if (!messages || messages.length === 0) {
            container.innerHTML = '<div class="empty-state">No messages in this session</div>';
            return;
        }
        
        container.innerHTML = messages.map(msg => {
            const type = msg.info.role;
            const content = msg.parts.map(part => part.content || '').join('\n');
            return `
                <div class="message ${type}">
                    <div class="message-header">${type} • ${new Date(msg.info.timeCreated).toLocaleString()}</div>
                    <div class="message-content">${this.escapeHtml(content)}</div>
                </div>
            `;
        }).join('');
        
        container.scrollTop = container.scrollHeight;
    }
    
    clearMessages() {
        const container = document.getElementById('messages');
        container.innerHTML = '<div class="empty-state">Start a conversation</div>';
    }
    
    async sendMessage() {
        if (!this.currentSession) {
            this.showError('Please select or create a session first');
            return;
        }
        
        if (!this.selectedProvider || !this.selectedModel || !this.selectedMode) {
            this.showError('Please select provider, model, and mode');
            return;
        }
        
        const input = document.getElementById('message-input');
        const content = input.value.trim();
        if (!content) return;
        
        try {
            const messageId = this.generateId();
            const message = {
                messageID: messageId,
                providerID: this.selectedProvider,
                modelID: this.selectedModel,
                mode: this.selectedMode,
                parts: [{
                    type: 'text',
                    content: content
                }]
            };
            
            // Clear input
            input.value = '';
            
            // Add user message to UI immediately
            this.addMessageToUI('user', content);
            
            // Send to server
            const response = await this.apiCall(`/session/${this.currentSession.id}/message`, 'POST', message);
            
            // The assistant response will come via the event stream
        } catch (error) {
            console.error('Failed to send message:', error);
            this.showError('Failed to send message: ' + error.message);
        }
    }
    
    addMessageToUI(role, content) {
        const container = document.getElementById('messages');
        const emptyState = container.querySelector('.empty-state');
        if (emptyState) {
            container.innerHTML = '';
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.innerHTML = `
            <div class="message-header">${role} • ${new Date().toLocaleString()}</div>
            <div class="message-content">${this.escapeHtml(content)}</div>
        `;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    connectToEvents() {
        if (this.eventSource) {
            this.eventSource.close();
        }
        
        this.eventSource = new EventSource('/event');
        
        this.eventSource.onopen = () => {
            console.log('SSE connection opened');
            this.updateStatus('Connected', 'connected');
        };
        
        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleEvent(data);
            } catch (error) {
                console.error('Failed to parse event data:', error);
            }
        };
        
        this.eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            this.updateStatus('Connection error', 'error');
        };
    }
    
    handleEvent(event) {
        console.log('Received event:', event);
        
        // Handle different event types based on the Go TUI implementation
        // This would need to be adapted based on the actual event structure
        if (event.type === 'message') {
            // Handle new message events
            if (event.sessionId === this.currentSession?.id) {
                this.loadMessages();
            }
        } else if (event.type === 'session') {
            // Handle session updates
            this.loadSessions();
        }
    }
    
    async apiCall(endpoint, method = 'GET', body = null) {
        const url = this.baseUrl + endpoint;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    updateStatus(text, type = '') {
        const status = document.getElementById('status');
        status.textContent = text;
        status.className = 'status ' + type;
    }
    
    showError(message) {
        const container = document.getElementById('messages');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        container.appendChild(errorDiv);
        container.scrollTop = container.scrollHeight;
        
        // Remove error after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    generateId() {
        return 'msg_' + Math.random().toString(36).substring(2, 15);
    }
}

// Initialize the client when the page loads
let client;
document.addEventListener('DOMContentLoaded', () => {
    client = new OpenCodeWebClient();
});

// Expose client globally for debugging
window.client = client;