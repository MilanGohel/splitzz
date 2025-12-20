import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    // baseURL is automatically detected in most Next.js environments,
    // but can be explicitly set via env var if needed.
})
