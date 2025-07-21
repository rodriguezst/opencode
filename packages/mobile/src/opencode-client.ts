// Mobile API client for connecting to opencode server
export interface ServerConfig {
  host: string;
  port: string;
  protocol: 'http' | 'https';
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
  };
  token: string;
}

export interface AuthStatus {
  hasUsers: boolean;
  defaultCredentials?: {
    username: string;
    password: string;
  };
}

export interface Session {
  id: string;
  time: {
    created: number;
    updated: number;
  };
  share?: {
    id: string;
    url: string;
  };
}

export interface MessageInfo {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  time: {
    created: number;
    completed?: number;
  };
}

export interface TextPart {
  id: string;
  messageId: string;
  sessionId: string;
  type: 'text';
  text: string;
}

export interface FilePart {
  id: string;
  messageId: string;
  sessionId: string;
  type: 'file';
  filename: string;
  mime: string;
  url: string;
}

export type Part = TextPart | FilePart;

export interface Message {
  info: MessageInfo;
  parts: Part[];
}

export interface Provider {
  id: string;
  name: string;
  models: Model[];
}

export interface Model {
  id: string;
  name: string;
  contextWindow: number;
  inputCost: number;
  outputCost: number;
}

export interface Mode {
  name: string;
  description: string;
  model: {
    providerId: string;
    modelId: string;
  };
}

export class OpenCodeClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(config: ServerConfig) {
    this.baseUrl = `${config.protocol}://${config.host}:${config.port}`;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Authentication
  async getAuthStatus(): Promise<AuthStatus> {
    return this.request<AuthStatus>('/auth/status');
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(response.token);
    return response;
  }

  async register(username: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(response.token);
    return response;
  }

  // Sessions
  async createSession(): Promise<Session> {
    return this.request<Session>('/session', {
      method: 'POST',
    });
  }

  async listSessions(): Promise<Session[]> {
    return this.request<Session[]>('/session');
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.request<boolean>(`/session/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    return this.request<Message[]>(`/session/${sessionId}/message`);
  }

  async sendMessage(
    sessionId: string,
    text: string,
    providerId: string,
    modelId: string,
    mode: string
  ): Promise<boolean> {
    return this.request<boolean>(`/session/${sessionId}/chat`, {
      method: 'POST',
      body: JSON.stringify({
        parts: [
          {
            type: 'text',
            text,
          },
        ],
        messageID: `msg_${Date.now()}`,
        providerID: providerId,
        modelID: modelId,
        mode,
      }),
    });
  }

  async abortSession(sessionId: string): Promise<boolean> {
    return this.request<boolean>(`/session/${sessionId}/abort`, {
      method: 'POST',
    });
  }

  // Providers and Models
  async getProviders(): Promise<{ providers: Provider[]; default: Record<string, number> }> {
    return this.request<{ providers: Provider[]; default: Record<string, number> }>('/app/provider');
  }

  async getModes(): Promise<Mode[]> {
    return this.request<Mode[]>('/app/mode');
  }

  // Events (for real-time updates)
  createEventStream(onEvent: (event: any) => void): EventSource {
    const eventSource = new EventSource(`${this.baseUrl}/event`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
      } catch (error) {
        console.error('Failed to parse event data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
    };

    return eventSource;
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.request('/doc');
      return true;
    } catch {
      return false;
    }
  }
}