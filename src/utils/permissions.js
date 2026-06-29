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
    Wallet // 👈 Added Wallet icon for Accounts
} from 'lucide-react';

export const ROLES = {
    ADMIN: 'Admin',
    SALES: 'Sales',
    OPERATION: 'Operation',
    MARKETING: 'Marketing', 
    EMPLOYEE: 'Employee'
};

// Define all possible sidebar menus and who can see them
export const MENU_ITEMS = [
    // --------------------------------------------------------
    // PRIMARY MENU ITEMS
    // --------------------------------------------------------
    
    // Common for ALL users
    { 
        path: '/dashboard', 
        label: 'Dashboard', 
        icon: LayoutDashboard, 
        roles: [ROLES.ADMIN, ROLES.SALES, ROLES.OPERATION, ROLES.MARKETING, ROLES.EMPLOYEE] 
    },
    
    // Admin and Employee
    { 
        path: '/employees', 
        label: 'Employee Mgmt', 
        icon: BriefcaseBusiness, 
        roles: [ROLES.ADMIN, ROLES.EMPLOYEE] 
    },

    
    
    // Marketing, Sales teams, Admin, and Employee
    { 
        path: '/leads', 
        label: 'Leads Manager', 
        icon: ContactRound, 
        roles: [ROLES.ADMIN, ROLES.SALES, ROLES.MARKETING, ROLES.EMPLOYEE] 
    },

    
    
    // Sales team, Admin, and Employee
    { 
        path: '/sales', 
        label: 'Sales', 
        icon: TrendingUp, 
        roles: [ROLES.ADMIN, ROLES.SALES, ROLES.EMPLOYEE] 
    },
    
    // Operations team, Admin, and Employee
    { 
        path: '/operations', 
        label: 'Operations', 
        icon: Workflow, 
        roles: [ROLES.ADMIN, ROLES.OPERATION, ROLES.EMPLOYEE] 
    },
    { 
        path: '/fulfillment', 
        label: 'Fulfillment', 
        icon: PackageCheck, 
        roles: [ROLES.ADMIN,ROLES.SALES,ROLES.OPERATION,ROLES.EMPLOYEE] 
    },
    // Accounts (Admin Restricted)
    { 
        path: '/accounts', 
        label: 'Accounts', 
        icon: Wallet, 
        roles: [ROLES.ADMIN] // 👈 Added the Accounts menu item
    },
    
    // Sales team, Admin, and Employee
    { 
        path: '/reports', 
        label: 'Reports', 
        icon: ChartColumnBig, 
        roles: [ROLES.ADMIN, ROLES.SALES, ROLES.EMPLOYEE] 
    },

    // --------------------------------------------------------
    // SECONDARY ROUTE MAPPINGS
    // --------------------------------------------------------
    // { path: '/jobs', label: 'Jobs', icon: Briefcase, roles: [ROLES.SALES] },
    // { path: '/follow-up', label: 'Follow-up', icon: PhoneCall, roles: [ROLES.SALES] },
    // { path: '/move-to-operation', label: 'Move to Operation', icon: ArrowRightLeft, roles: [ROLES.SALES] },
    // { path: '/my-jobs', label: 'My Jobs', icon: Briefcase, roles: [ROLES.OPERATION] },
];