import { LayoutDashboard, Mail, MessageSquare, Settings, Users, Bell, HelpCircle } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { usePathname } from "next/navigation"
import Link from "next/link"

const translations = {
  en: {
    dashboard: "Dashboard",
    campaigns: "Campaigns",
    chat: "Chat",
    contacts: "Contacts",
    notifications: "Notifications",
    settings: "Settings",
    help: "Help & Support"
  },
  ar: {
    dashboard: "لوحة التحكم",
    campaigns: "الحملات",
    chat: "المحادثة",
    contacts: "جهات الاتصال",
    notifications: "الإشعارات",
    settings: "الإعدادات",
    help: "المساعدة والدعم"
  }
}

const sidebarLinks = [
  {
    title: translations.en.dashboard,
    titleAr: translations.ar.dashboard,
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: translations.en.campaigns,
    titleAr: translations.ar.campaigns,
    href: "/dashboard/campaigns",
    icon: Mail,
  },
  {
    title: translations.en.chat,
    titleAr: translations.ar.chat,
    href: "/dashboard/chat",
    icon: MessageSquare,
  },
  {
    title: translations.en.contacts,
    titleAr: translations.ar.contacts,
    href: "/dashboard/contacts",
    icon: Users,
  },
  {
    title: translations.en.notifications,
    titleAr: translations.ar.notifications,
    href: "/dashboard/notifications",
    icon: Bell,
  },
  {
    title: translations.en.settings,
    titleAr: translations.ar.settings,
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: translations.en.help,
    titleAr: translations.ar.help,
    href: "/dashboard/help",
    icon: HelpCircle,
  }
]

export function Sidebar() {
  const { language } = useLanguage()
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">🚀</span>
          <span>WhatsApp Bot</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-auto py-2">
        <ul className="grid gap-1 px-2">
          {sidebarLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent ${
                  pathname === link.href ? "bg-accent" : ""
                }`}
              >
                <link.icon className="h-4 w-4" />
                <span>{language === "ar" ? link.titleAr : link.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium">👤</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">User Name</p>
            <p className="text-xs text-muted-foreground truncate">user@example.com</p>
          </div>
        </div>
      </div>
    </div>
  )
} 