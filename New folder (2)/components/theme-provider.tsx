"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // We don't need the mounted state anymore as we're using suppressHydrationWarning
  // in the root layout on the html element
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
