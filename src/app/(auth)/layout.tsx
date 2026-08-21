import { currentLang } from "@/lib/lang";
import { LangToggle } from "@/components/ui/lang-toggle";
import { Wordmark } from "@/components/ui/wordmark";

/** Shared chrome for the sign-in, 2FA and password screens. */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const lang = await currentLang();
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(120%_70%_at_50%_0%,#FFEDD5_0%,#FDF9F3_62%)]">
      <div className="screen-shell flex flex-1 flex-col">
        <header className="flex items-center gap-2 px-[18px] pt-4">
          <Wordmark className="mr-auto" />
          <LangToggle lang={lang} />
        </header>
        {children}
      </div>
    </div>
  );
}
