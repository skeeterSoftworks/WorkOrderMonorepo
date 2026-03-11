import { AppBar, IconButton, Toolbar, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import streitNovaLogo from "../../res/streit-nova.png"
import type {LoggedUser} from '../../models/Common';
import englishFlag from "../../res/england-flag-icon.png"
import serbianFlag from "../../res/serbia-flag-icon.png"
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useCookies } from 'react-cookie';
import QrCodeIcon from '@mui/icons-material/QrCode';


export function AppBarHeader() {

    const userDataString =  sessionStorage.getItem("userData");
    const userData: LoggedUser = userDataString && JSON.parse(userDataString)

    const { i18n, t } = useTranslation();

    const [cookies, setCookie] = useCookies(['locale'])

    function onLogout() {
        sessionStorage.removeItem("userData")
        window.location.href = "/"
    }

    useEffect(() => {
        i18n.changeLanguage(cookies?.locale || "sr")
    }, []);

    const changeLanguageHandler = (lang: string) => {
        i18n.changeLanguage(lang)
        setCookie('locale', lang, { path: '/' })
    }


    return (
        <AppBar position="static">
            <Toolbar variant="dense">
                <img src={streitNovaLogo} style={{ height: "auto", width: "5%", marginRight: "5vh" }} />
                <Typography variant="h6" color="inherit" component="div">
                    {userData ? `${userData.role}: ${userData.name} ${userData.surname}` : t("notLoggedIn")}
                </Typography>

                {userData && userData.role === "ADMIN" &&
                <IconButton size="small" aria-label="search" color="inherit" sx={{ marginLeft: 'auto' }}
                    onClick={() => { window.location.href = "/mock-qr" }}>
                    <QrCodeIcon />
                </IconButton>
                }

                <IconButton size="small" aria-label="search" color="inherit" sx={{ marginLeft: 'auto' }}
                    onClick={() => { changeLanguageHandler("sr") }}>
                    <img src={serbianFlag} style={{ height: '20px', width: "auto" }} />
                </IconButton>

                <IconButton size="small" aria-label="search" color="inherit"
                    onClick={() => { changeLanguageHandler("en") }}>

                    <img src={englishFlag} style={{ height: '20px', width: "auto" }} />
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


