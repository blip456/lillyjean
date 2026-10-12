import { AppFrame } from "@/components/navigation/app-frame";
import { requireOnboardedAccount } from "@/lib/account/guards";

/**
 * Signed-in area: only for accounts that finished the library card step. The tab bar (N1) sits at
 * the bottom; the padding keeps the last content above it (`--tab-bar-height`).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireOnboardedAccount();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(var(--tab-bar-height,0px)+max(2.5rem,env(safe-area-inset-bottom)))] md:max-w-xl">
      <AppFrame>{children}</AppFrame>
    </div>
  );
}
