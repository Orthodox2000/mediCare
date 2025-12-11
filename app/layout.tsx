import "./globals.css";
import AppShell from "./components/AppShell";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
export const metadata = {
  title: "MediCare",
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
        
          <AppShell>
            {children}
          </AppShell>
        
      </body>
    </html> 
    
  );
}
