import {
    LayoutDashboard,
    BriefcaseBusiness,
    ContactRound,
    TrendingUp,
    Workflow,
    PackageCheck,
    ChartColumnBig,
    Briefcase,
    PhoneCall,
    ArrowRightLeft,
    Megaphone,
    Wallet,
    Receipt
} from 'lucide-react';

export const ROLES = {
    ADMIN: 'Admin',
    DIRECTOR: 'Director',
    SALES: 'Sales',
    OPERATION: 'Operations',
    ACCOUNTS: 'Accounts',
    MARKETING: 'Marketing'
};

// Define all possible sidebar menus and who can see them
export const MENU_ITEMS = [
    // --------------------------------------------------------
    // PRIMARY MENU ITEMS
    // --------------------------------------------------------

    // Common for ALL roles
    {
         path: '/dashboard',
        label: 'Home',
        icon: LayoutDashboard,
        roles: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.SALES, ROLES.OPERATION, ROLES.ACCOUNTS, ROLES.MARKETING]
    },

    // Admin and Director only
    {
        path: '/employees',
        label: 'Employee',
        icon: BriefcaseBusiness,
        roles: [ROLES.ADMIN, ROLES.DIRECTOR]
    },

    // Marketing, Sales, Admin, Director
    {
    path: '/leads',
    label: 'Lead Manager',
    icon: ContactRound,
    roles: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.SALES, ROLES.OPERATION, ROLES.ACCOUNTS, ROLES.MARKETING]
},

    // Sales, Admin, Director
    {
        path: '/sales',
        label: 'Sales',
        icon: TrendingUp,
        roles: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.SALES]
    },

    // Operations, Admin, Director
    {
        path: '/operations',
        label: 'Operations',
        icon: Workflow,
        roles: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.OPERATION]
    },

    // Sales, Operations, Accounts, Admin, Director
    {
        path: '/fulfillment',
        label: 'Fulfillment',
        icon: PackageCheck,
        roles: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.SALES, ROLES.OPERATION, ROLES.ACCOUNTS]
    },

    // Accounts, Admin, Director
    {
        path: '/accounts',
        label: 'Accounts',
        icon: Wallet,
        roles: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.ACCOUNTS]
    },

    // Accounts, Admin, Director
    {
        path: '/finance',
        label: 'Billing & Finance',
        icon: Receipt,
        roles: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.ACCOUNTS]
    },

    // Sales, Operations, Accounts, Admin, Director
    {
        path: '/reports',
        label: 'Reports',
        icon: ChartColumnBig,
        roles: [ROLES.ADMIN, ROLES.DIRECTOR, ROLES.SALES, ROLES.OPERATION, ROLES.ACCOUNTS]
    },

    // --------------------------------------------------------
    // SECONDARY ROUTE MAPPINGS
    // --------------------------------------------------------
    // { path: '/jobs', label: 'Jobs', icon: Briefcase, roles: [ROLES.SALES] },
    // { path: '/follow-up', label: 'Follow-up', icon: PhoneCall, roles: [ROLES.SALES] },
    // { path: '/move-to-operation', label: 'Move to Operation', icon: ArrowRightLeft, roles: [ROLES.SALES] },
    // { path: '/my-jobs', label: 'My Jobs', icon: Briefcase, roles: [ROLES.OPERATION] },
];