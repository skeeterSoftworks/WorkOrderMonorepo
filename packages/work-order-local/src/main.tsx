import {StrictMode} from 'react'
import ReactDOM from 'react-dom/client'
import {Provider} from "react-redux";
import {store} from "./store.ts";
import {ErrorModal, WebsocketListener} from "sf-common";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {HOC} from "./containers/HOC.tsx";
import {Home} from "./components/home/Home.tsx";
import {MockQr} from "./containers/MockQr.tsx";
import {ProductionPage} from "./components/production/ProductionPage.tsx";
import {InformationManagementPage} from "./components/information/InformationManagementPage.tsx";
import {AdminPage} from "./components/admin/AdminPage.tsx";
import {AdminMachineDetailsPage} from "./components/admin/AdminMachineDetailsPage.tsx";


const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || ((globalThis as any).process?.env?.REACT_APP_SERVER_URL) || '';

root.render(
    <StrictMode>
        <Provider store={store}>
            <WebsocketListener  socketUrl={SERVER_URL}
                onMessage={() => {
            }}/>
            <ErrorModal/>
            <BrowserRouter>
                <HOC>
                    <Routes>
                        <Route path="/" element={<Home/>}/>
                        <Route path="/production" element={<ProductionPage/>}/>
                        <Route path="/information-management" element={<InformationManagementPage/>}/>
                        <Route path="/admin" element={<AdminPage/>}/>
                        <Route path="/admin/machine-details" element={<AdminMachineDetailsPage/>}/>
                        <Route path="/mock-qr" element={<MockQr/>}/>
                    </Routes>
                </HOC>
            </BrowserRouter>

        </Provider>
    </StrictMode>)


