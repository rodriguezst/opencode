import { Hono } from "hono"
import { serveStatic } from "hono/bun"
import path from "path"

// Simple mock server for testing the web interface
const app = new Hono()

// Add CORS headers
app.use("*", async (c, next) => {
  await next()
  c.header("Access-Control-Allow-Origin", "*")
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  c.header("Access-Control-Allow-Headers", "Content-Type")
})

// Mock data
const mockProviders = [
  {
    id: "openai",
    name: "OpenAI",
    models: {
      "gpt-4": { id: "gpt-4", name: "GPT-4" },
      "gpt-3.5-turbo": { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" }
    }
  }
]

const mockModes = [
  {
    id: "chat",
    name: "Chat",
    description: "General chat mode"
  },
  {
    id: "code",
    name: "Code",
    description: "Code generation mode"
  }
]

let mockSessions = [
  {
    id: "session1",
    name: "Test Session",
    timeCreated: new Date().toISOString()
  }
]

let mockMessages = []

// Static file serving for web interface
const webDir = path.resolve(import.meta.dirname, "packages/opencode/src/web")
console.log("Web directory:", webDir)

app.use("/web/*", serveStatic({
  root: webDir,
  rewriteRequestPath: (path) => path.replace(/^\/web/, "")
}))

app.get("/", serveStatic({
  path: "./index.html",
  root: webDir
}))

// Mock API endpoints
app.get("/app", async (c) => {
  return c.json({
    path: { cwd: "/test" },
    name: "test-app"
  })
})

app.get("/session", async (c) => {
  return c.json(mockSessions)
})

app.post("/session", async (c) => {
  const newSession = {
    id: "session" + Date.now(),
    name: "New Session",
    timeCreated: new Date().toISOString()
  }
  mockSessions.push(newSession)
  return c.json(newSession)
})

app.get("/session/:id/message", async (c) => {
  return c.json(mockMessages)
})

app.post("/session/:id/message", async (c) => {
  const body = await c.req.json()
  const userMessage = {
    info: {
      role: "user",
      timeCreated: new Date().toISOString()
    },
    parts: body.parts
  }
  
  const assistantMessage = {
    info: {
      role: "assistant", 
      timeCreated: new Date().toISOString()
    },
    parts: [{
      type: "text",
      content: `This is a mock response to: ${body.parts[0]?.content || ""}`
    }]
  }
  
  mockMessages.push(userMessage, assistantMessage)
  return c.json(assistantMessage)
})

app.get("/config/providers", async (c) => {
  return c.json({
    providers: mockProviders,
    default: { "openai": "gpt-4" }
  })
})

app.get("/mode", async (c) => {
  return c.json(mockModes)
})

app.get("/event", async (c) => {
  return new Response(new ReadableStream({
    start(controller) {
      // Send initial SSE connection
      controller.enqueue(new TextEncoder().encode("data: {}\n\n"))
      
      // Send periodic heartbeat
      const interval = setInterval(() => {
        controller.enqueue(new TextEncoder().encode(`data: {"type":"heartbeat","timestamp":"${new Date().toISOString()}"}\n\n`))
      }, 30000)
      
      // Clean up on close
      setTimeout(() => {
        clearInterval(interval)
        controller.close()
      }, 300000) // Close after 5 minutes
    }
  }), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  })
})

// Start server
const port = 3000
console.log(`Mock opencode server starting on http://localhost:${port}`)
console.log(`Web interface available at http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}