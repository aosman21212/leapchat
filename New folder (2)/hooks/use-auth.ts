import { useEffect, useState } from "react"

interface AuthState {
  token: string | null
  user: any | null
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    user: null,
  })

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem("token")
    if (token) {
      setAuth((prev) => ({ ...prev, token }))
    }
  }, [])

  return {
    token: auth.token,
    user: auth.user,
  }
} 