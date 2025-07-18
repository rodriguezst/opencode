# Web TUI Client

This directory contains the web-based TUI client for opencode, providing the same functionality as the terminal client but accessible through a web browser.

## Files

- `index.html` - Main web interface HTML
- `style.css` - Terminal-style CSS styling  
- `app.js` - JavaScript client that communicates with the opencode server

## Usage

Start the opencode server with the web interface enabled:

```bash
opencode serve --web --port 4096
```

Then open `http://localhost:4096` in your web browser.

## Features

- Session management (create, select, view messages)
- Provider and model selection with dynamic dropdowns
- Mode selection (Chat, Code, etc.)  
- Real-time messaging with immediate UI feedback
- Server-Sent Events for live updates from the server
- Terminal-style dark theme matching opencode aesthetics

## API Integration

The web client uses the same REST API endpoints as the Go TUI client:

- `/session` - Session management
- `/session/:id/message` - Send and receive messages
- `/config/providers` - Get available providers and models
- `/mode` - Get available modes  
- `/event` - Server-Sent Events for real-time updates

## Browser Compatibility

Works with any modern browser that supports:
- ES6+ JavaScript
- Server-Sent Events
- CSS Grid/Flexbox