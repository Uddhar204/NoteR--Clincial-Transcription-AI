import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "notER — AI Clinical Copilot for Cardiologists",
  description:
    "AI-powered clinical copilot that converts doctor-patient conversations into structured medical notes and formatted prescriptions.",
  keywords: [
    "clinical copilot",
    "cardiology",
    "SOAP notes",
    "medical transcription",
    "AI",
    "prescription",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
