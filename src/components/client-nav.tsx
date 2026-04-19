'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  FilePlus, 
  LogOut,
  User,
  Users,
  FileText,
  UserMinus,
  Plane,
  ArrowRightLeft,
  Stethoscope,
  ChevronDown,
  ChevronRight,
  FileBarChart
} from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type NavItem = {
  href?: string;
  label: string;
  icon: any;
  permission?: string;
  children?: NavItem[];
};

const navItems: NavItem[] = [
  { href: '/app', label: 'Painel', icon: LayoutDashboard },
  { 
    label: 'Pessoal', 
    icon: Users,
    children: [
      { href: '/app/admissions', label: 'Admissões', icon: FileText, permission: 'admissions.view' },
      { href: '/app/dismissals', label: 'Demissões', icon: UserMinus, permission: 'dismissals.view' },
      { href: '/app/vacations', label: 'Férias', icon: Plane, permission: 'vacations.view' },
      { href: '/app/transfers', label: 'Transferências', icon: ArrowRightLeft, permission: 'transfers.view' },
      { href: '/app/leaves', label: 'Afastamentos', icon: Stethoscope, permission: 'leaves.view' },
      { 
        label: 'Relatórios', 
        icon: FileBarChart,
        children: [
            { href: '/api/reports/ethnic-racial', label: 'Autodeclaração Étnico-Racial', icon: FileText, permission: 'admissions.view' },
        ]
      },
    ]
  },
];

export function ClientNav({ carneLeaoAccess, permissions = [] }: { carneLeaoAccess?: boolean, permissions?: string[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Pessoal']);

  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items.map(item => {
      if (item.children) {
        const filteredChildren = filterNavItems(item.children);
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }
      if (item.permission && !permissions.includes(item.permission)) {
        return null;
      }
      return item;
    }).filter(Boolean) as NavItem[];
  };

  const navItemsList: NavItem[] = filterNavItems([
    ...navItems,
    ...(carneLeaoAccess ? [
      {
        label: 'Pessoa Física',
        icon: User,
        children: [
          { href: '/app/carne-leao', label: 'Carnê Leão', icon: FileText }
        ]
      }
    ] : [])
  ]);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => 
      prev.includes(label) 
        ? prev.filter(g => g !== label) 
        : [...prev, label]
    );
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    
    if (item.children) {
      const isExpanded = expandedGroups.includes(item.label);
      const hasActiveChild = item.children.some(child => child.href === pathname);
      
      return (
        <div key={item.label} className="space-y-1">
          <button
            onClick={() => toggleGroup(item.label)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-md transition-colors text-sm font-medium",
              hasActiveChild ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon size={18} />
              {item.label}
            </div>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          
          {isExpanded && (
            <div className="pl-4 space-y-1 mt-1">
              {item.children.map(child => renderNavItem(child))}
            </div>
          )}
        </div>
      );
    }

    const isActive = pathname === item.href;
    const isApiRoute = item.href?.startsWith('/api/');

    if (isApiRoute) {
      return (
        <a 
          key={item.href} 
          href={item.href!}
          className="flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          download
        >
          <Icon size={18} />
          {item.label}
        </a>
      );
    }
    
    return (
      <Link 
        key={item.href} 
        href={item.href!}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-sm font-medium",
          isActive 
            ? "bg-sidebar-primary text-sidebar-primary-foreground" 
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon size={18} />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-primary">VISION Client</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItemsList.map(renderNavItem)}
      </nav>
    </div>
  );
}
