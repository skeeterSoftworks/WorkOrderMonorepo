import React, {useEffect} from 'react';
import {useDispatch} from 'react-redux';
import {Client} from '@stomp/stompjs';
import {addToAppStore, clearQrData} from "../actions/Actions";
import {SOCKET_URL} from "../constants/Constants";

let stompClient: any;

type Props = {
    onMessage: Function,
    onConnect?: Function,
    onWebsocketClose?: Function
}

export function WebsocketListener(props: Props) {

    const dispatch = useDispatch();

    useEffect(() => {

        stompClient = new Client({
            brokerURL: SOCKET_URL,
            reconnectDelay: 2000,
            onConnect: () => {

                console.log("Websocket connected, listening for QR scanner events.")

                dispatch(addToAppStore("socketConnected", true));

                props.onConnect && props.onConnect()

                stompClient.unsubscribe("sub-0");
                stompClient.subscribe("/websocket/message", (messageRaw) => {
                    messageRaw && props.onMessage(JSON.parse(messageRaw.body))

                })
            },
            onWebSocketClose: () => {
                console.error("Websocket closed!")
                dispatch(addToAppStore("socketConnected", false));
                dispatch(clearQrData())
                props.onWebsocketClose && props.onWebsocketClose()
            }
        })
        stompClient.activate();
    });

    return (
        <div/>
    )
}
