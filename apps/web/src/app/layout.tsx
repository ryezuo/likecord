import type { Metadata } from "next";
import "./globals.css";
import "../styles/themes/retro-98.css";
import { AuthWrapper } from "./auth-wrapper";
import { DEFAULT_THEME_ID } from "@likecord/shared";
import { getThemeBootstrapScript, themeMetadata } from "../lib/theme";

export const metadata: Metadata = {
  title: "Likecord",
  description: "A private real-time communication platform for friends.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const defaultTheme = themeMetadata(DEFAULT_THEME_ID);
  return (
    <html lang="en" data-theme={defaultTheme.rootValue} style={{ colorScheme: defaultTheme.colorScheme }}>
      <head>
        <script id="likecord-theme-bootstrap" dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }} />
      </head>
      <body>
        <AuthWrapper>{children}</AuthWrapper>
      </body>
    </html>
  );
}
