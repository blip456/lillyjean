import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { SnackbarProvider } from "@/components/ui/snackbar";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return {
    title: { default: t("name"), template: `%s · ${t("name")}` },
    description: t("tagline"),
    applicationName: t("name"),
    appleWebApp: { capable: true, title: t("name"), statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f4" },
    { media: "(prefers-color-scheme: dark)", color: "#151412" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <SnackbarProvider>{children}</SnackbarProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
