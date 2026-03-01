import { AppBar, IconButton, Toolbar, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useCookies } from 'react-cookie';
import React from 'react';
import {LoggedUser} from "../models/Common";

interface Props {
    mainLogo: string,
    serbianFlag: string,
    englishFlag: string

}

export function AppBarHeader(props: Props) {

    const userDataSessionStorage = sessionStorage.getItem("userData");

    const userData: LoggedUser = userDataSessionStorage && JSON.parse(userDataSessionStorage)
    const { i18n, t } = useTranslation();

    const [cookies, setCookie] = useCookies(['locale'])

    function onLogout() {
        sessionStorage.removeItem("userData")
        window.location.href = "/"
    }

    useEffect(() => {
        i18n.changeLanguage(cookies?.locale || "sr")
    }, []);

    const changeLanguageHandler = (lang) => {
        i18n.changeLanguage(lang)
        setCookie('locale', lang, { path: '/' })
    }


    return (
        <AppBar position="static">
            <Toolbar variant="dense">
                <img src={props.mainLogo} style={{ height: "auto", width: "5%", marginRight: "5vh" }} />
                <Typography variant="h6" color="inherit" component="div">
                    {userData ? `${userData.role}: ${userData.name} ${userData.surname}` : t("notLoggedIn")}
                </Typography>

                <IconButton size="small" aria-label="search" color="inherit" sx={{ marginLeft: 'auto' }}
                    onClick={() => { changeLanguageHandler("sr") }}>
                    <img src={props.serbianFlag} style={{ height: '20px', width: "auto" }} />
                </IconButton>

                <IconButton size="small" aria-label="search" color="inherit"
                    onClick={() => { changeLanguageHandler("en") }}>

                    <img src={props.englishFlag} style={{ height: '20px', width: "auto" }} />
                </IconButton>

                <IconButton size="large" aria-label="search" color="inherit" style={{ marginLeft: "40px" }}
                    onClick={() => { window.location.href = "/" }}>
                    <HomeIcon />
                </IconButton>
                {userData &&
                    <IconButton size="large" aria-label="search" color="inherit"
                        onClick={onLogout}>
                        <div style={{ fontSize: "1rem", marginRight: "5px" }}>
                            {t("logoutAction")}
                        </div>
                        <LogoutIcon />

                    </IconButton>}

            </Toolbar>
        </AppBar>

    );
}


