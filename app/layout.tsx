import "./globals.css";
import AppShell from "./components/AppShell";
import { AuthProvider } from "./lib/AuthContext";
export const metadata = {
  title: "Pixel Cup MediCare",
  description: "Smart healthcare dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>

        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>

      </body>
    </html>

  );
}
