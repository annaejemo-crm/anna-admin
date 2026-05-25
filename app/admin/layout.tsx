import { Sidebar } from '@/components/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 max-w-[1400px] py-12 px-14">{children}</main>
    </div>
  );
}
