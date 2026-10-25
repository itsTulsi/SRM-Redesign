import Link from "next/link";
import "./globals.css";

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <main className="site-container py-24">
          <h1 className="font-display text-section font-bold">Page not found</h1>
          <p className="mt-4">
            <Link href="/">Go to the SRMIST homepage</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
