import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import AddProduct from './pages/AddProduct';
import Vehicles from './pages/Vehicles';
import Parts from './pages/Parts';
import Sales from './pages/Sales';
import Repairs from './pages/Repairs';
import Exports from './pages/Exports';
import Freight from './pages/Freight';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Products": Products,
    "AddProduct": AddProduct,
    "Vehicles": Vehicles,
    "Parts": Parts,
    "Sales": Sales,
    "Repairs": Repairs,
    "Exports": Exports,
    "Freight": Freight,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};