'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';

import { CompanySelector } from '@/components/company-selector';

interface ClientHeaderProps {
  user: {
    name: string;
    email: string;
    avatar_url?: string;
  };
  activeCompany: {
    id: string;
    name: string;
    cnpj: string;
  } | null;
  companies: {
    id: string;
    razao_social: string;
    cnpj: string;
  }[];
}

export function ClientHeader({ user, activeCompany, companies }: ClientHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <header className="flex h-16 items-center justify-end gap-4 border-b bg-white px-6 shadow-sm">
      <DropdownMenu>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 font-medium text-sm text-gray-700 hover:text-gray-900 focus:outline-none">
                {user.name} <ChevronDown className="h-3 w-3 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            
            <CompanySelector 
              activeCompany={activeCompany} 
              companies={companies} 
              className="items-end mt-0.5"
            />
          </div>

          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarImage src={user.avatar_url} alt={user.name} />
              <AvatarFallback className="font-semibold">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
        </div>

        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/app/profile">
              <User className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
