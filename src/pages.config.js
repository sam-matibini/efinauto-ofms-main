import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import AddProduct from './pages/AddProduct';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Products": Products,
    "AddProduct": AddProduct,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};