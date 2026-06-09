import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      storageKey={storageKey}
    >
      {children}
    </NextThemesProvider>
  )
}

export const useTheme = () => {
  const themeContext = useNextTheme()
  return themeContext as {
    theme: Theme | undefined
    setTheme: (theme: Theme) => void
    resolvedTheme?: string
    systemTheme?: string
  }
}
