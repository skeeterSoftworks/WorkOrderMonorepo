import {StrictMode} from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import {Provider} from "react-redux";
import {store} from "./store.ts";
import {ErrorModal, WebsocketListener} from "sf-common";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {HOC} from "./containers/HOC.tsx";
import {Home} from "./components/home/Home.tsx";


const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    <StrictMode>
        <Provider store={store}>
            <WebsocketListener onMessage={() => {
            }}/>
            <ErrorModal/>
            <BrowserRouter>
                <HOC>
                    <Routes>
                        <Route path="/" element={<Home/>}/>
                    </Routes>
                </HOC>
            </BrowserRouter>

        </Provider>
    </StrictMode>)


