import { useMemo, useState } from "react";
import { createTheme } from "@mui/material/styles";

export default function useThemeMode() {
  const [colorMode, setColorMode] = useState("light");

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: colorMode,
          primary: {
            main: colorMode === "light" ? "#ff6b6b" : "#ff8fb1",
          },
          secondary: {
            main: colorMode === "light" ? "#845ef7" : "#a78bfa",
          },
          background: {
            default: colorMode === "light" ? "#f7f8ff" : "#0b1220",
            paper: colorMode === "light" ? "#ffffff" : "#0f172a",
          },
        },
        shape: { borderRadius: 12 },
        typography: {
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
      }),
    [colorMode]
  );

  const toggleColorMode = () =>
    setColorMode((prev) => (prev === "light" ? "dark" : "light"));

  return { colorMode, theme, toggleColorMode };
}
