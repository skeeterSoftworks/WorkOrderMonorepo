import * as React from "react";
import './App.css'
import {store} from "./store.ts";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {Provider, useDispatch} from "react-redux";
import {ErrorModal, WebsocketListener} from "sf-common";
import {HOC} from "./containers/HOC.tsx";
import {addToAppStore} from "sf-common/dist/actions/Actions";
import {Home} from "./components/home/Home.tsx";

function App() {

    function onWebsocketMessage(message: { qrText: unknown }) {

        try {
            if (message?.qrText) {
                store.dispatch(addToAppStore("QRData", message))
            }

        } catch (e) {
            console.error(e)
        }
    }

  return (
      <React.StrictMode>
          <Provider store={store}>
              <WebsocketListener onMessage={onWebsocketMessage} />
              <ErrorModal />
              <BrowserRouter>
                  <HOC>
                      <Routes>
                          <Route path="/" element={<Home />} />
                      </Routes>
                  </HOC>
              </BrowserRouter>

          </Provider>
      </React.StrictMode>
  )
}

export default App
