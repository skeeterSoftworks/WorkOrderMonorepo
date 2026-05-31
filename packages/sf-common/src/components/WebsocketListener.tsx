import React, {useEffect} from 'react';
import {useDispatch} from 'react-redux';
import {Client} from '@stomp/stompjs';
import {addToAppStore, clearQrData} from "../actions/Actions";
import {SOCKET_URL} from "../constants/Constants";

type Props = {
    onMessage: Function,
    onConnect?: Function,
    onWebsocketClose?: Function,
    socketUrl: string
}

export function WebsocketListener(props: Props) {

    const dispatch = useDispatch();

    useEffect(() => {
        const stomp = new Client({
            brokerURL: props.socketUrl || SOCKET_URL,
            reconnectDelay: 2000,
            onConnect: () => {

                console.log("Websocket connected, listening for QR scanner events.")

                dispatch(addToAppStore("socketConnected", true));

                props.onConnect?.();

                stomp.subscribe("/websocket/message", (messageRaw) => {
                    messageRaw && props.onMessage(JSON.parse(messageRaw.body))
                });
            },
            onWebSocketClose: () => {
                console.error("Websocket closed!")
                dispatch(addToAppStore("socketConnected", false));
                dispatch(clearQrData())
                props.onWebsocketClose?.();
            }
        });
        stomp.activate();
        return () => {
            stomp.deactivate();
        };
    }, [props.socketUrl, dispatch]);

    return (
        <div/>
    )
}
