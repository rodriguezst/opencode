import { z } from "zod"
import { createHash, randomBytes } from "crypto"
import { Global } from "../global"
import path from "path"
import fs from "fs/promises"

export namespace ServerAuth {
  export const User = z.object({
    id: z.string(),
    username: z.string(),
    passwordHash: z.string(),
    salt: z.string(),
    created: z.number(),
    lastAccess: z.number(),
  })
  export type User = z.infer<typeof User>

  export const Token = z.object({
    id: z.string(),
    userId: z.string(),
    token: z.string(),
    expires: z.number(),
    created: z.number(),
    lastUsed: z.number(),
  })
  export type Token = z.infer<typeof Token>

  const usersFile = path.join(Global.Path.data, "server-users.json")
  const tokensFile = path.join(Global.Path.data, "server-tokens.json")

  export function hashPassword(password: string, salt: string): string {
    return createHash("sha256").update(password + salt).digest("hex")
  }

  export function generateSalt(): string {
    return randomBytes(32).toString("hex")
  }

  export function generateToken(): string {
    return randomBytes(32).toString("hex")
  }

  export async function createUser(username: string, password: string): Promise<User> {
    const users = await getUsers()
    
    // Check if user already exists
    if (users.find(u => u.username === username)) {
      throw new Error("User already exists")
    }

    const salt = generateSalt()
    const passwordHash = hashPassword(password, salt)
    
    const user: User = {
      id: randomBytes(16).toString("hex"),
      username,
      passwordHash,
      salt,
      created: Date.now(),
      lastAccess: Date.now(),
    }

    users.push(user)
    await saveUsers(users)
    return user
  }

  export async function authenticateUser(username: string, password: string): Promise<User | null> {
    const users = await getUsers()
    const user = users.find(u => u.username === username)
    
    if (!user) return null
    
    const passwordHash = hashPassword(password, user.salt)
    if (passwordHash !== user.passwordHash) return null

    // Update last access
    user.lastAccess = Date.now()
    await saveUsers(users)
    
    return user
  }

  export async function createToken(userId: string): Promise<Token> {
    const tokens = await getTokens()
    
    // Clean up expired tokens
    const now = Date.now()
    const validTokens = tokens.filter(t => t.expires > now)
    
    const token: Token = {
      id: randomBytes(16).toString("hex"),
      userId,
      token: generateToken(),
      expires: now + (7 * 24 * 60 * 60 * 1000), // 7 days
      created: now,
      lastUsed: now,
    }

    validTokens.push(token)
    await saveTokens(validTokens)
    return token
  }

  export async function validateToken(tokenString: string): Promise<User | null> {
    const tokens = await getTokens()
    const token = tokens.find(t => t.token === tokenString)
    
    if (!token || token.expires < Date.now()) {
      return null
    }

    // Update last used
    token.lastUsed = Date.now()
    await saveTokens(tokens)

    const users = await getUsers()
    return users.find(u => u.id === token.userId) || null
  }

  export async function revokeToken(tokenString: string): Promise<void> {
    const tokens = await getTokens()
    const filteredTokens = tokens.filter(t => t.token !== tokenString)
    await saveTokens(filteredTokens)
  }

  export async function getUsers(): Promise<User[]> {
    try {
      const file = Bun.file(usersFile)
      const data = await file.json()
      return data.map((u: any) => User.parse(u))
    } catch {
      return []
    }
  }

  export async function getTokens(): Promise<Token[]> {
    try {
      const file = Bun.file(tokensFile)
      const data = await file.json()
      return data.map((t: any) => Token.parse(t))
    } catch {
      return []
    }
  }

  export async function saveUsers(users: User[]): Promise<void> {
    const file = Bun.file(usersFile)
    await Bun.write(file, JSON.stringify(users, null, 2))
    await fs.chmod(file.name!, 0o600)
  }

  export async function saveTokens(tokens: Token[]): Promise<void> {
    const file = Bun.file(tokensFile)
    await Bun.write(file, JSON.stringify(tokens, null, 2))
    await fs.chmod(file.name!, 0o600)
  }

  export async function hasUsers(): Promise<boolean> {
    const users = await getUsers()
    return users.length > 0
  }

  export async function initializeDefaultUser(): Promise<{ username: string; password: string } | null> {
    if (await hasUsers()) {
      return null
    }

    // Create default admin user with random password
    const username = "admin"
    const password = randomBytes(12).toString("hex")
    
    await createUser(username, password)
    
    return { username, password }
  }
}