import { applyTheme, mapStyleForTheme, nextTheme, themeAtom, type Theme } from "@/app/usecase/theme.usecase"
/**
 * React bindings for theme usecase.
 */
import { useAtom } from "@effect/atom-react"
import { useCallback, useEffect, useMemo } from "react"

export type { Theme }

export function useTheme() {
  const [theme, setTheme] = useAtom(themeAtom)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(nextTheme(theme))
  }, [setTheme, theme])

  const mapStyle = useMemo(() => mapStyleForTheme(theme), [theme])

  return { theme, setTheme, toggleTheme, mapStyle }
}
