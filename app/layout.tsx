import "./globals.css";

export const metadata = {
  title: "Garmin Season Analyzer",
  description: "Garmin season dashboard with Supabase"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
