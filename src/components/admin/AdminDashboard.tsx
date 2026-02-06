'use client'

import { useState, Fragment, useEffect } from 'react'
import { Dialog, Transition, Menu } from '@headlessui/react'
import {
  Bars3Icon,
  BellIcon,
  Cog6ToothIcon,
  HomeIcon,
  UsersIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  UserGroupIcon,
  ChevronRightIcon,
  BriefcaseIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const navigation = [
  { name: 'Painel', href: '/admin/dashboard', icon: HomeIcon },
  { name: 'Empresas', href: '/admin/clients', icon: BuildingOfficeIcon },
  { name: 'Funcionários', href: '/admin/employees', icon: BriefcaseIcon },
  { name: 'Usuários', href: '/admin/client-users', icon: UsersIcon },
  {
    name: 'Pessoal',
    icon: UserGroupIcon,
    children: [
      { name: 'Admissões', href: '/admin/admissions' },
      { name: 'Demissões', href: '/admin/dismissals' },
      { name: 'Férias', href: '/admin/vacations' },
      { name: 'Transferências', href: '/admin/transfers' },
    ]
  },
  { name: 'Equipe', href: '/admin/team', icon: ShieldCheckIcon },
  { name: 'Permissões', href: '/admin/permissions', icon: LockClosedIcon },
  { name: 'Logs de Auditoria', href: '/admin/audit-logs', icon: DocumentTextIcon },
  { name: 'Configurações', href: '/admin/settings', icon: Cog6ToothIcon },
]

const userNavigation = [
  { name: 'Meu Perfil', href: '/admin/profile' },
  { name: 'Sair', href: '#', action: 'logout' },
]

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

interface AdminDashboardProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    avatar_path: string | null;
  };
}

export default function AdminDashboard({ children, user }: AdminDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [ignoreHover, setIgnoreHover] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  const isExpanded = !collapsed || (isHovering && !ignoreHover)
  const pathname = usePathname()

  useEffect(() => {
    // Expand menu if current path is a child
    navigation.forEach(item => {
      if (item.children) {
        if (item.children.some(child => child.href === pathname)) {
          setExpandedMenus(prev => [...new Set([...prev, item.name])])
        }
      }
    })
  }, [pathname])

  const toggleMenu = (name: string) => {
    if (collapsed && !isExpanded) {
        setIgnoreHover(false) // Allow hover expansion
        // We might want to trigger expansion or just handle it gracefully
        // For now, let's just toggle
    }
    setExpandedMenus(prev => 
      prev.includes(name) 
        ? prev.filter(i => i !== name) 
        : [...prev, name]
    )
  }


  const handleLogout = async () => {
    await logout()
  }

  return (
    <>
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50 md:hidden" onClose={setSidebarOpen}>
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/80" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                      <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                        <span className="sr-only">Fechar menu</span>
                        <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </button>
                    </div>
                  </Transition.Child>

                  {/* Sidebar component */}
                  <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[#134D38] px-6 pb-4 ring-1 ring-white/10">
                    <div className="flex h-16 shrink-0 items-center gap-2">
                      <img src="/logo.svg" alt="Vision Logo" width={32} height={32} />
                      <span className="text-white font-bold text-xl">VISION Admin</span>
                    </div>
                    <nav className="flex flex-1 flex-col">
                      <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                          <ul role="list" className="-mx-2 space-y-1">
                            {navigation.map((item) => {
                              // Mobile Sidebar Logic
                              const hasChildren = 'children' in item && item.children
                              const isCurrent = item.href ? pathname === item.href : false
                              const isChildCurrent = hasChildren && item.children?.some(child => child.href === pathname)
                              const isMenuExpanded = expandedMenus.includes(item.name)

                              return (
                                <li key={item.name}>
                                  {hasChildren ? (
                                    <>
                                      <button
                                        onClick={() => toggleMenu(item.name)}
                                        className={classNames(
                                          isChildCurrent
                                            ? 'bg-[#0E3A2B] text-white'
                                            : 'text-gray-200 hover:text-white hover:bg-[#0E3A2B]',
                                          'group flex w-full items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                        )}
                                      >
                                        <item.icon
                                          className={classNames(
                                            isChildCurrent ? 'text-white' : 'text-gray-200 group-hover:text-white',
                                            'h-6 w-6 shrink-0'
                                          )}
                                          aria-hidden="true"
                                        />
                                        <span className="flex-1 text-left">{item.name}</span>
                                        <ChevronRightIcon
                                          className={classNames(
                                            isMenuExpanded ? 'rotate-90 text-white' : 'text-gray-400',
                                            'h-5 w-5 shrink-0 transition-transform duration-200'
                                          )}
                                          aria-hidden="true"
                                        />
                                      </button>
                                      {isMenuExpanded && (
                                        <ul className="mt-1 px-2">
                                          {item.children?.map((child) => (
                                            <li key={child.name}>
                                              <Link
                                                href={child.href}
                                                onClick={() => setSidebarOpen(false)}
                                                className={classNames(
                                                  pathname === child.href
                                                    ? 'bg-[#0E3A2B] text-white'
                                                    : 'text-gray-200 hover:text-white hover:bg-[#0E3A2B]',
                                                  'block rounded-md py-2 pr-2 pl-9 text-sm leading-6 font-semibold'
                                                )}
                                              >
                                                {child.name}
                                              </Link>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </>
                                  ) : (
                                    <Link
                                      href={item.href!}
                                      onClick={() => setSidebarOpen(false)}
                                      className={classNames(
                                        isCurrent
                                          ? 'bg-[#0E3A2B] text-white'
                                          : 'text-gray-200 hover:text-white hover:bg-[#0E3A2B]',
                                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                      )}
                                    >
                                      <item.icon
                                        className={classNames(
                                          isCurrent ? 'text-white' : 'text-gray-200 group-hover:text-white',
                                          'h-6 w-6 shrink-0'
                                        )}
                                        aria-hidden="true"
                                      />
                                      {item.name}
                                    </Link>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div 
            className={classNames(
                "hidden md:fixed md:inset-y-0 md:z-50 md:flex md:flex-col transition-all duration-300 ease-in-out shadow-xl",
                isExpanded ? "md:w-72" : "md:w-20"
            )}
            onMouseEnter={() => collapsed && setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
          {/* Sidebar component */}
          <div className="flex grow flex-col gap-y-5 bg-[#134D38]">
            <div className="flex h-16 shrink-0 items-center px-6 mt-5">
              {!isExpanded ? (
                <div className="w-full flex justify-center">
                   <Logo width={32} height={32} />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                   <Logo width={32} height={32} />
                   <span className="text-white font-bold text-xl whitespace-nowrap">VISION Admin</span>
                </div>
              )}
            </div>
            <nav className="flex flex-1 flex-col overflow-y-auto px-6">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => {
                      // Desktop Sidebar Logic
                      const hasChildren = 'children' in item && item.children
                      const isCurrent = item.href ? pathname === item.href : false
                      const isChildCurrent = hasChildren && item.children?.some(child => child.href === pathname)
                      const isMenuExpanded = expandedMenus.includes(item.name)

                      return (
                        <li key={item.name}>
                          {hasChildren ? (
                            <>
                              <button
                                onClick={() => toggleMenu(item.name)}
                                className={classNames(
                                  isChildCurrent
                                    ? 'bg-[#0E3A2B] text-white'
                                    : 'text-gray-200 hover:text-white hover:bg-[#0E3A2B]',
                                  'group flex w-full items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold whitespace-nowrap',
                                  !isExpanded ? 'justify-center' : ''
                                )}
                                title={!isExpanded ? item.name : undefined}
                              >
                                <item.icon
                                  className={classNames(
                                    isChildCurrent ? 'text-white' : 'text-gray-200 group-hover:text-white',
                                    'h-6 w-6 shrink-0'
                                  )}
                                  aria-hidden="true"
                                />
                                {isExpanded && (
                                  <>
                                    <span className="flex-1 text-left">{item.name}</span>
                                    <ChevronRightIcon
                                      className={classNames(
                                        isMenuExpanded ? 'rotate-90 text-white' : 'text-gray-400',
                                        'h-5 w-5 shrink-0 transition-transform duration-200'
                                      )}
                                      aria-hidden="true"
                                    />
                                  </>
                                )}
                              </button>
                              {isExpanded && isMenuExpanded && (
                                <ul className="mt-1 px-2">
                                  {item.children?.map((child) => (
                                    <li key={child.name}>
                                      <Link
                                        href={child.href}
                                        className={classNames(
                                          pathname === child.href
                                            ? 'bg-[#0E3A2B] text-white'
                                            : 'text-gray-200 hover:text-white hover:bg-[#0E3A2B]',
                                          'block rounded-md py-2 pr-2 pl-9 text-sm leading-6 font-semibold'
                                        )}
                                      >
                                        {child.name}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </>
                          ) : (
                            <Link
                                      href={item.href!}
                                      className={classNames(
                                        isCurrent
                                          ? 'bg-[#0E3A2B] text-white'
                                          : 'text-gray-200 hover:text-white hover:bg-[#0E3A2B]',
                                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold whitespace-nowrap',
                                        !isExpanded ? 'justify-center' : ''
                                      )}
                                    >
                                      <item.icon
                                        className={classNames(
                                          isCurrent ? 'text-white' : 'text-gray-200 group-hover:text-white',
                                          'h-6 w-6 shrink-0'
                                        )}
                                        aria-hidden="true"
                                      />
                                      {isExpanded && item.name}
                                    </Link>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </li>
              </ul>
            </nav>
            <div className="px-6 pb-4 mt-auto">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => {
                                    if (!collapsed) {
                                        setIgnoreHover(true)
                                    }
                                    setCollapsed(!collapsed)
                                }}
                                className={classNames(
                                    "group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-400 hover:bg-gray-800 hover:text-white whitespace-nowrap",
                                    !isExpanded ? 'justify-center' : ''
                                )}
                            >
                                {collapsed ? (
                                    <ChevronDoubleRightIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                ) : (
                                    <ChevronDoubleLeftIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            <p>{collapsed ? "Expandir / Fixar Menu" : "Recolher Menu"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
          </div>
        </div>

        <div className={classNames("transition-all duration-300", collapsed ? "md:pl-20" : "md:pl-72")}>

          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 md:px-8">
            <button type="button" className="-m-2.5 p-2.5 text-gray-700 md:hidden" onClick={() => setSidebarOpen(true)}>
              <span className="sr-only">Abrir menu</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Separator */}
            <div className="h-6 w-px bg-gray-900/10 md:hidden" aria-hidden="true" />

            <div className="flex flex-1 gap-x-4 self-stretch md:gap-x-6">
              <form className="relative flex flex-1" action="#" method="GET">
                <label htmlFor="search-field" className="sr-only">
                  Buscar
                </label>
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  id="search-field"
                  className="block size-full border-0 py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm bg-white"
                  placeholder="Buscar..."
                  type="search"
                  name="search"
                />
              </form>
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                <button type="button" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
                  <span className="sr-only">Ver notificações</span>
                  <BellIcon className="h-6 w-6" aria-hidden="true" />
                </button>

                {/* Separator */}
                <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" aria-hidden="true" />

                {/* Profile dropdown */}
                <Menu as="div" className="relative">
                  <Menu.Button className="-m-1.5 flex items-center p-1.5">
                    <span className="sr-only">Abrir menu de usuário</span>
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.avatar_path || ''} className="object-cover" />
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-xs">
                            {getInitials(user?.name || 'Admin')}
                        </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:flex lg:items-center">
                      <span className="ml-4 text-sm font-semibold leading-6 text-gray-900" aria-hidden="true">
                        {user?.name || 'Admin'}
                      </span>
                      <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                  </Menu.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                      {userNavigation.map((item) => (
                        <Menu.Item key={item.name}>
                          {({ active }) => (
                            <a
                              href={item.href}
                              onClick={item.action === 'logout' ? handleLogout : undefined}
                              className={classNames(
                                active ? 'bg-gray-50' : '',
                                'block px-3 py-1 text-sm leading-6 text-gray-900 cursor-pointer'
                              )}
                            >
                              {item.name}
                            </a>
                          )}
                        </Menu.Item>
                      ))}
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
          </div>

          <main className="py-10">
            <div className="px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  )
}