const menuItems = [
  {
    title: t("dashboard.sidebar.dashboard"),
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: t("dashboard.sidebar.base64Encode"),
    href: "/dashboard/base64-encode",
    icon: <FileImage className="h-5 w-5" />,
  },
  {
    title: t("dashboard.sidebar.users"),
    href: "/dashboard/users",
    icon: <Users className="h-5 w-5" />,
    showForRoles: ["admin"],
  },
  {
    title: t("dashboard.sidebar.smsCampaigns"),
    href: "/dashboard/sms-campaigns",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    title: t("dashboard.sidebar.campaigns"),
    href: "/dashboard/campaigns",
    icon: <Megaphone className="h-5 w-5" />,
  },
] 