import { requireOnboardedAccount } from "@/lib/account/guards";

/** Signed-in area: only for accounts that finished the library card step. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireOnboardedAccount();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] md:max-w-xl">
      <main className="flex-1">{children}</main>
    </div>
  );
}
