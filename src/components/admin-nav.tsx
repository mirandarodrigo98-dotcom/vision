'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  FileText, 
  Settings, 
  LogOut,
  ShieldCheck,
  Briefcase,
  Lock
} from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/clients', label: 'Empresas', icon: Building2 },
  { href: '/admin/employees', label: 'Funcionários', icon: Briefcase },
  { href: '/admin/client-users', label: 'Usuários', icon: Users },
  { href: '/admin/admissions', label: 'Admissões', icon: FileText },
  { href: '/admin/team', label: 'Equipe', icon: ShieldCheck },
  { href: '/admin/permissions', label: 'Permissões', icon: Lock },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
  { href: '/admin/settings', label: 'Configurações', icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="flex flex-col h-screen w-64 bg-slate-900 text-white border-r">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold">VISION Admin</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-sm font-medium",
                isActive 
                  ? "bg-slate-800 text-white" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Sair
        </Button>
      </div>
    </div>
  );
}
