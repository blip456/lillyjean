import { useTranslations } from "next-intl";

export default function OnboardingLayout({
  children,
}: LayoutProps<"/onboarding">) {
  const t = useTranslations("app");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10">
      <p className="text-center font-serif text-lg font-semibold">
        {t("name")}
      </p>
      <main className="mt-6 flex-1">{children}</main>
    </div>
  );
}
