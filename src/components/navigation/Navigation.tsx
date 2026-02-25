import { Home, Users, FileText, Globe, Settings, Shield, Phone, Workflow } from "lucide-react";

export const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "Cases",
    href: "/cases",
    icon: FileText,
  },
  {
    name: "Contacts",
    href: "/contacts",
    icon: Phone,
  },
  {
    name: "Website Templates",
    href: "/website-templates",
    icon: Globe,
  },
  {
    name: "Workflow Builder",
    href: "/workflows",
    icon: Workflow,
  },
  {
    name: "User Management",
    href: "/users",
    icon: Users,
  },
  {
    name: "Logs",
    href: "/logs",
    icon: FileText,
    children: [
      {
        name: "General",
        href: "/general",
      },
      {
        name: "Worflow",
        href: "/workflowlogs",
      }
    ]
  },
  {
    name: "Security Profiles",
    href: "/security-profiles",
    icon: Shield,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
]; 