# OpenCode Mobile

iOS and Android applications for OpenCode AI coding assistant.

## Features

- **Cross-platform**: Works on both iOS and Android devices
- **Server Configuration**: Connect to any OpenCode server by specifying host and port
- **Authentication**: JWT-based authentication with user registration and login
- **Real-time Chat**: Communicate with AI coding assistant in real-time
- **Provider Support**: Use any configured AI provider (Anthropic, OpenAI, etc.)
- **Mode Selection**: Access all OpenCode modes (build, debug, review, etc.)
- **Secure**: Credentials stored securely using device keychain/keystore

## Setup

### Development

1. Install dependencies:
   ```bash
   cd packages/mobile
   bun install
   ```

2. Start the development server:
   ```bash
   bun run start
   ```

3. Run on device/simulator:
   ```bash
   # Android
   bun run android
   
   # iOS (requires macOS)
   bun run ios
   
   # Web (for testing)
   bun run web
   ```

### Building for Production

The mobile apps are automatically built via GitHub Actions when changes are pushed to the main branch.

#### Manual Build

1. Install EAS CLI:
   ```bash
   npm install -g @expo/eas-cli
   ```

2. Configure EAS project:
   ```bash
   eas build:configure
   ```

3. Build APK/IPA:
   ```bash
   # Android APK
   eas build --platform android --profile preview
   
   # iOS IPA
   eas build --platform ios --profile preview
   ```

## Usage

### First Time Setup

1. **Install the app** on your device
2. **Configure server**: Enter your OpenCode server's host and port
3. **Test connection** to ensure the server is reachable
4. **Authenticate**: 
   - If no users exist, create the default admin account
   - Otherwise, log in with existing credentials
5. **Start chatting** with the AI coding assistant

### Server Configuration

The app requires an OpenCode server running with the following:

- **Authentication enabled**: The server now includes JWT-based authentication
- **Network accessibility**: Server must be reachable from your mobile device
- **CORS configured**: For web-based previews (if needed)

Example server URLs:
- Local development: `http://localhost:3000`
- Remote server: `https://your-server.com:3000`
- Local network: `http://192.168.1.100:3000`

### Authentication

The mobile app uses JWT tokens for authentication:

1. **Registration**: Create new user accounts
2. **Login**: Authenticate with username/password
3. **Token storage**: Tokens are securely stored on the device
4. **Auto-refresh**: Tokens are automatically validated and refreshed

### Default Credentials

When no users exist on the server, a default admin account is automatically created:
- Username: `admin`
- Password: Randomly generated (displayed in the app)

**Important**: Change the default password after first login!

## Architecture

### Client-Server Communication

```
Mobile App ←→ OpenCode Server ←→ AI Providers
     ↓              ↓                   ↓
  User Auth    Session Mgmt         Model APIs
  Settings     File System         (Anthropic, etc.)
  UI/UX        Git Integration
```

### Key Components

- **OpenCodeClient**: API client for server communication
- **ServerAuth**: JWT authentication handling
- **Real-time Events**: SSE-based live updates
- **Secure Storage**: Encrypted credential storage

## Security

- **JWT Tokens**: Secure authentication with expiration
- **Token Storage**: Platform-native secure storage (Keychain/Keystore)
- **HTTPS Support**: Secure communication with remote servers
- **Input Validation**: All user inputs are validated
- **Error Handling**: Graceful handling of network and auth errors

## Development Notes

### Tech Stack

- **React Native**: Cross-platform mobile framework
- **Expo**: Development and build platform
- **TypeScript**: Type-safe development
- **React Navigation**: App navigation
- **Expo SecureStore**: Secure credential storage

### File Structure

```
packages/mobile/
├── App.tsx                 # Main app component
├── src/
│   └── opencode-client.ts  # API client
├── app.json               # Expo configuration
├── eas.json              # EAS build configuration
└── package.json          # Dependencies
```

### API Integration

The mobile app integrates with the OpenCode server API:

- `POST /auth/login` - User authentication
- `POST /auth/register` - User registration
- `GET /auth/status` - Check authentication status
- `GET /session` - List chat sessions
- `POST /session` - Create new session
- `POST /session/:id/chat` - Send message
- `GET /event` - Server-sent events for real-time updates

## Troubleshooting

### Connection Issues

1. **Server not reachable**:
   - Check server is running
   - Verify host/port configuration
   - Ensure firewall allows connections
   - Test from browser first

2. **Authentication fails**:
   - Check credentials are correct
   - Verify server has authentication enabled
   - Clear stored tokens and re-login

3. **Messages not sending**:
   - Check network connection
   - Verify authentication token is valid
   - Check server logs for errors

### Development Issues

1. **Build fails**:
   - Run `bun install` to ensure dependencies
   - Check Expo CLI is up to date
   - Verify EAS configuration

2. **Hot reload not working**:
   - Restart development server
   - Clear Metro cache: `npx expo start --clear`

## Contributing

1. Make changes to the mobile app
2. Test on both iOS and Android
3. Update this README if needed
4. Submit pull request

The mobile app builds are automatically triggered by GitHub Actions when changes are pushed to the main branch.