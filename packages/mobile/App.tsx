import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as SecureStore from 'expo-secure-store';
import { OpenCodeClient, ServerConfig, AuthStatus, Message as OpenCodeMessage, Provider, Mode } from './src/opencode-client';

// Types
interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Stack Navigator
const Stack = createStackNavigator();

// Auth Screen
function AuthScreen({ navigation, route }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const { client } = route.params;

  useEffect(() => {
    loadAuthStatus();
  }, []);

  const loadAuthStatus = async () => {
    try {
      const status = await client.getAuthStatus();
      setAuthStatus(status);
      
      if (status.defaultCredentials) {
        setUsername(status.defaultCredentials.username);
        setPassword(status.defaultCredentials.password);
        Alert.alert(
          'Default Credentials',
          `Default admin user created:\nUsername: ${status.defaultCredentials.username}\nPassword: ${status.defaultCredentials.password}\n\nPlease log in and change the password.`
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check authentication status');
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setIsLoading(true);
    try {
      await client.login(username, password);
      await SecureStore.setItemAsync('authToken', client.token);
      navigation.navigate('Chat', { client });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await client.register(username, password);
      await SecureStore.setItemAsync('authToken', client.token);
      navigation.navigate('Chat', { client });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OpenCode Authentication</Text>
      
      {authStatus && (
        <Text style={styles.subtitle}>
          {authStatus.hasUsers ? 'Log in to continue' : 'Create admin account'}
        </Text>
      )}

      <View style={styles.form}>
        <Text style={styles.label}>Username:</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter username"
          autoCapitalize="none"
          editable={!isLoading}
        />

        <Text style={styles.label}>Password:</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
          editable={!isLoading}
        />

        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
        ) : (
          <>
            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleLogin}>
              <Text style={[styles.buttonText, { color: '#fff' }]}>
                {authStatus?.hasUsers ? 'Log In' : 'Create Admin'}
              </Text>
            </TouchableOpacity>

            {authStatus?.hasUsers && (
              <TouchableOpacity style={styles.button} onPress={handleRegister}>
                <Text style={styles.buttonText}>Register New User</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// Server Configuration Screen
function ServerConfigScreen({ navigation }: any) {
  const [config, setConfig] = useState<ServerConfig>({
    host: 'localhost',
    port: '3000',
    protocol: 'http'
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const savedConfig = await SecureStore.getItemAsync('serverConfig');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const saveConfig = async () => {
    try {
      await SecureStore.setItemAsync('serverConfig', JSON.stringify(config));
      Alert.alert('Success', 'Server configuration saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration');
    }
  };

  const testAndConnect = async () => {
    setIsLoading(true);
    try {
      const client = new OpenCodeClient(config);
      const connected = await client.testConnection();
      
      if (connected) {
        await saveConfig();
        
        // Check if token exists
        const savedToken = await SecureStore.getItemAsync('authToken');
        if (savedToken) {
          client.setToken(savedToken);
          try {
            // Test if token is still valid by making an authenticated request
            await client.listSessions();
            navigation.navigate('Chat', { client });
            return;
          } catch {
            // Token invalid, continue to auth
            await SecureStore.deleteItemAsync('authToken');
          }
        }
        
        navigation.navigate('Auth', { client });
      } else {
        Alert.alert('Error', 'Failed to connect to server');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OpenCode Server Configuration</Text>
      
      <View style={styles.form}>
        <Text style={styles.label}>Protocol:</Text>
        <View style={styles.protocolContainer}>
          <TouchableOpacity 
            style={[styles.protocolButton, config.protocol === 'http' && styles.protocolButtonActive]}
            onPress={() => setConfig({...config, protocol: 'http'})}
            disabled={isLoading}
          >
            <Text style={config.protocol === 'http' ? styles.protocolTextActive : styles.protocolText}>HTTP</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.protocolButton, config.protocol === 'https' && styles.protocolButtonActive]}
            onPress={() => setConfig({...config, protocol: 'https'})}
            disabled={isLoading}
          >
            <Text style={config.protocol === 'https' ? styles.protocolTextActive : styles.protocolText}>HTTPS</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Host:</Text>
        <TextInput
          style={styles.input}
          value={config.host}
          onChangeText={(text) => setConfig({...config, host: text})}
          placeholder="localhost or IP address"
          autoCapitalize="none"
          editable={!isLoading}
        />

        <Text style={styles.label}>Port:</Text>
        <TextInput
          style={styles.input}
          value={config.port}
          onChangeText={(text) => setConfig({...config, port: text})}
          placeholder="3000"
          keyboardType="numeric"
          editable={!isLoading}
        />

        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
        ) : (
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={testAndConnect}>
            <Text style={[styles.buttonText, { color: '#fff' }]}>Connect to Server</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Chat Screen
function ChatScreen({ navigation, route }: any) {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [modes, setModes] = useState<Mode[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const { client } = route.params;

  useEffect(() => {
    loadData();
    setupEventStream();
  }, []);

  const loadData = async () => {
    try {
      const [providersResponse, modesResponse] = await Promise.all([
        client.getProviders(),
        client.getModes(),
      ]);
      
      setProviders(providersResponse.providers);
      setModes(modesResponse);
      
      if (providersResponse.providers.length > 0) {
        setSelectedProvider(providersResponse.providers[0]);
      }
      
      if (modesResponse.length > 0) {
        setSelectedMode(modesResponse[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load server data');
    }
  };

  const setupEventStream = () => {
    const eventSource = client.createEventStream((event) => {
      console.log('Received event:', event);
      // Handle real-time events from server
      if (event.type === 'message') {
        // Update messages in real-time
        loadMessages();
      }
    });

    return () => {
      eventSource.close();
    };
  };

  const loadMessages = async () => {
    if (!currentSession) return;
    
    try {
      const serverMessages = await client.getSessionMessages(currentSession);
      const localMessages: LocalMessage[] = serverMessages.map(msg => ({
        id: msg.info.id,
        role: msg.info.role,
        content: msg.parts.filter(p => p.type === 'text').map(p => (p as any).text).join('\n'),
        timestamp: msg.info.time.created,
      }));
      setMessages(localMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedProvider || !selectedMode) return;

    let sessionId = currentSession;
    if (!sessionId) {
      try {
        const session = await client.createSession();
        sessionId = session.id;
        setCurrentSession(sessionId);
      } catch (error) {
        Alert.alert('Error', 'Failed to create session');
        return;
      }
    }

    const userMessage: LocalMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      await client.sendMessage(
        sessionId,
        userMessage.content,
        selectedProvider.id,
        selectedProvider.models[0].id,
        selectedMode.name
      );
      
      // Messages will be updated via event stream
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message');
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>OpenCode Chat</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ServerConfig')}>
          <Text style={styles.headerButton}>Settings</Text>
        </TouchableOpacity>
      </View>

      {selectedProvider && selectedMode && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {selectedProvider.name} • {selectedMode.name}
          </Text>
        </View>
      )}

      <ScrollView style={styles.messagesContainer}>
        {messages.map((message) => (
          <View key={message.id} style={[
            styles.messageContainer,
            message.role === 'user' ? styles.userMessage : styles.assistantMessage
          ]}>
            <Text style={styles.messageText}>{message.content}</Text>
          </View>
        ))}
        {isLoading && (
          <View style={[styles.messageContainer, styles.assistantMessage]}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.messageText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.chatInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          multiline
          maxLength={1000}
          editable={!isLoading}
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!inputText.trim() || isLoading || !selectedProvider || !selectedMode) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading || !selectedProvider || !selectedMode}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Main App Component
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="ServerConfig">
        <Stack.Screen 
          name="ServerConfig" 
          component={ServerConfigScreen} 
          options={{ title: 'Server Setup' }}
        />
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen} 
          options={{ title: 'Authentication' }}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen} 
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  protocolContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  protocolButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  protocolButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  protocolText: {
    color: '#333',
    fontWeight: '600',
  },
  protocolTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  statusBar: {
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
    paddingVertical: 10,
  },
  messageContainer: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  userMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});