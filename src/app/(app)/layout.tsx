import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const deconnexion = <BoutonDeconnexion />;
  return (
    <div className="flex min-h-screen">
      <Sidebar deconnexion={deconnexion} />
      <div className="flex flex-1 flex-col min-w-0">
        <MobileNav deconnexion={deconnexion} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
