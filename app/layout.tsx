import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "Travel Map",
  description: "Track your travels around the world",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
