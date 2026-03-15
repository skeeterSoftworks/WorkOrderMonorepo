import {StrictMode} from 'react'
import ReactDOM from 'react-dom/client'
import {Provider} from "react-redux";
import {store} from "./store.ts";
import {ErrorModal, WebsocketListener} from "sf-common";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {HOC} from "./containers/HOC.tsx";
import {Home} from "./components/home/Home.tsx";
import {MockQr} from "./containers/MockQr.tsx";
import {PurchaseOrdersManagementPage} from "./components/purchaseOrders/PurchaseOrdersManagementPage.tsx";
import {WorkOrdersManagementPage} from "./components/workOrders/WorkOrdersManagementPage.tsx";
import {StockHome} from "./components/stock/StockHome.tsx";
import {AdminHome} from "./components/admin/AdminHome.tsx";


const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

// Resolve server URL from Vite's import.meta.env. Provide a fallback to process.env for other build tools.
const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || ((globalThis as any).process?.env?.REACT_APP_SERVER_URL) || '';

root.render(
    <StrictMode>
        <Provider store={store}>
            <WebsocketListener onMessage={() => {
            }} socketUrl={SERVER_URL}/>
            <ErrorModal/>
            <BrowserRouter>
                <HOC>
                    <Routes>
                        <Route path="/" element={<Home/>}/>
                        <Route path="/purchase-orders" element={<PurchaseOrdersManagementPage/>}/>
                        <Route path="/work-orders" element={<WorkOrdersManagementPage/>}/>
                        <Route path="/stock" element={<StockHome/>}/>
                        <Route path="/admin" element={<AdminHome/>}/>
                        <Route path="/mock-qr" element={<MockQr/>}/>
                    </Routes>
                </HOC>
            </BrowserRouter>

        </Provider>
    </StrictMode>)
