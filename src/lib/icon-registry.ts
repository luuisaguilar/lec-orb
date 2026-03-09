/**
 * Icon Registry
 * -------------
 * Maps Lucide icon name strings (stored in module_registry.icon) to their
 * React components. Used by the dynamic sidebar and Studio module builder.
 *
 * When adding a new icon:
 * 1. Import it from "lucide-react"
 * 2. Add it to ICON_MAP with its exact Lucide name as the key
 */
import type { LucideIcon } from "lucide-react";
import {
    BarChart3,
    BookOpen,
    Briefcase,
    Building2,
    Calculator,
    Calendar,
    CheckSquare,
    ClipboardList,
    Clock,
    Code2,
    DollarSign,
    FileText,
    Filter,
    FolderOpen,
    GraduationCap,
    Hash,
    HeartHandshake,
    History,
    Home,
    Inbox,
    Layers,
    Link,
    List,
    Mail,
    Map,
    MessageSquare,
    Package,
    Phone,
    PieChart,
    School,
    Settings,
    ShoppingCart,
    Star,
    Tag,
    Target,
    ToggleLeft,
    Truck,
    User,
    UserCog,
    Users,
    Warehouse,
    Wrench,
    Zap,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
    // Default / generic
    FileText,
    FolderOpen,
    Layers,
    List,

    // People / org
    User,
    Users,
    UserCog,
    HeartHandshake,
    School,
    Building2,

    // Finance / business
    DollarSign,
    ShoppingCart,
    Briefcase,
    PieChart,
    BarChart3,
    Tag,
    Target,

    // Inventory / logistics
    Package,
    Warehouse,
    Truck,

    // Events / time
    Calendar,
    Clock,
    History,

    // Education
    GraduationCap,
    BookOpen,
    Calculator,

    // Communication
    Mail,
    MessageSquare,
    Phone,
    Inbox,

    // Settings / dev
    Settings,
    Wrench,
    Code2,
    Hash,
    Link,
    Filter,
    ToggleLeft,

    // Status
    CheckSquare,
    ClipboardList,
    Star,
    Zap,

    // Dashboard / metrics
    Map,
    Home,
};

/**
 * Returns the Lucide icon component for a given icon name string.
 * Falls back to FileText if the icon name is not found.
 *
 * @param name - Icon name exactly as stored in module_registry.icon
 * @returns LucideIcon component
 *
 * @example
 * const Icon = getIcon("Calendar");
 * return <Icon className="h-4 w-4" />;
 */
export function getIcon(name: string | null | undefined): LucideIcon {
    if (!name) return FileText;
    return ICON_MAP[name] ?? FileText;
}

/** Full list of available icon names (for Studio icon picker) */
export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export default ICON_MAP;
