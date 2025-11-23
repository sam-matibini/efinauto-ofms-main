import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import AddProduct from './pages/AddProduct';
import Vehicles from './pages/Vehicles';
import Parts from './pages/Parts';
import Repairs from './pages/Repairs';
import Exports from './pages/Exports';
import Freight from './pages/Freight';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Companies from './pages/Companies';
import Salvage from './pages/Salvage';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import Technicians from './pages/Technicians';
import Analytics from './pages/Analytics';
import TechnicianMobile from './pages/TechnicianMobile';
import Purchases from './pages/Purchases';
import VehicleAnalytics from './pages/VehicleAnalytics';
import Accounting from './pages/Accounting';
import ProductsServices from './pages/ProductsServices';
import CustomerSupport from './pages/CustomerSupport';
import CustomerCommunications from './pages/CustomerCommunications';
import Settings from './pages/Settings';
import Payroll from './pages/Payroll';
import TD1Form from './pages/TD1Form';
import EmployeePortal from './pages/EmployeePortal';
import Banking from './pages/Banking';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Products": Products,
    "AddProduct": AddProduct,
    "Vehicles": Vehicles,
    "Parts": Parts,
    "Repairs": Repairs,
    "Exports": Exports,
    "Freight": Freight,
    "Sales": Sales,
    "Customers": Customers,
    "Companies": Companies,
    "Salvage": Salvage,
    "Notifications": Notifications,
    "Reports": Reports,
    "UserManagement": UserManagement,
    "Technicians": Technicians,
    "Analytics": Analytics,
    "TechnicianMobile": TechnicianMobile,
    "Purchases": Purchases,
    "VehicleAnalytics": VehicleAnalytics,
    "Accounting": Accounting,
    "ProductsServices": ProductsServices,
    "CustomerSupport": CustomerSupport,
    "CustomerCommunications": CustomerCommunications,
    "Settings": Settings,
    "Payroll": Payroll,
    "TD1Form": TD1Form,
    "EmployeePortal": EmployeePortal,
    "Banking": Banking,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};