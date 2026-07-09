import {StrictMode} from 'react'
import ReactDOM from 'react-dom/client'
import {Provider} from "react-redux";
import {store} from "./store.ts";
import {ErrorModal} from "sf-common";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {Toaster} from "react-hot-toast";
import {HOC} from "./containers/HOC.tsx";
import {Home} from "./components/home/Home.tsx";
import {PurchaseOrdersManagementPage} from "./components/purchaseOrders/PurchaseOrdersManagementPage.tsx";
import {WorkOrdersHome} from "./components/workOrders/WorkOrdersHome.tsx";
import {StockHome} from "./components/stock/StockHome.tsx";
import {AdminHome} from "./components/admin/AdminHome.tsx";
import {ProductionPage} from "./components/production/ProductionPage.tsx";
import {MonitoringClientPanel} from "./components/monitoring/MonitoringClientPanel.tsx";
import {PurchasingPage} from "./components/purchasing/PurchasingPage.tsx";


const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    <StrictMode>
        <Provider store={store}>
            <Toaster position="top-center" />
            <ErrorModal/>
            <BrowserRouter>
                <HOC>
                    <Routes>
                        <Route path="/" element={<Home/>}/>
                        <Route path="/purchase-orders" element={<PurchaseOrdersManagementPage/>}/>
                        <Route path="/purchasing" element={<PurchasingPage/>}/>
                        <Route path="/work-orders" element={<WorkOrdersHome/>}/>
                        <Route path="/production" element={<ProductionPage/>}/>
                        <Route path="/stock" element={<StockHome/>}/>
                        <Route path="/admin" element={<AdminHome/>}/>
                        <Route path="/monitoring-client" element={<MonitoringClientPanel/>}/>
                    </Routes>
                </HOC>
            </BrowserRouter>

        </Provider>
    </StrictMode>)
