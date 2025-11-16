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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};