import { AppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import cubeLogo from "../../res/CubeLogo.png"
import type {LoggedUser} from '../../models/Common';
import type { WorkstationMachineConfigTO } from '../../models/ApiRequests';
import englishFlag from "../../res/england-flag-icon.png"
import serbianFlag from "../../res/serbia-flag-icon.png"
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useCookies } from 'react-cookie';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { Server } from '../../api/Server';



export function AppBarHeader() {

    const userDataString =  sessionStorage.getItem("userData");
    const userData: LoggedUser = userDataString && JSON.parse(userDataString)

    const { i18n, t } = useTranslation();

    const [cookies, setCookie] = useCookies(['locale'])

    const [workstationMachine, setWorkstationMachine] = useState<{ loaded: boolean; name: string }>({
        loaded: false,
        name: '',
    });

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

    useEffect(() => {
        const load = () => {
            Server.getWorkstationMachine(
                (resp: { data?: WorkstationMachineConfigTO }) => {
                    const raw = resp?.data?.machineName;
                    const trimmed = typeof raw === 'string' ? raw.trim() : '';
                    setWorkstationMachine({ loaded: true, name: trimmed });
                },
                () => setWorkstationMachine({ loaded: true, name: '' }),
            );
        };
        load();
        const onUpdated = () => load();
        window.addEventListener('workstationMachineUpdated', onUpdated);
        return () => window.removeEventListener('workstationMachineUpdated', onUpdated);
    }, []);

    const machineHeaderText = !workstationMachine.loaded
        ? '…'
        : workstationMachine.name.length > 0
          ? workstationMachine.name
          : t('configureMachineNamePlaceholder');

    return (
        <AppBar position="static">
            <Toolbar variant="dense" sx={{ flexWrap: 'wrap', gap: 1 }}>
                <img src={cubeLogo} style={{ height: "auto", width: "3%", marginRight: "5vh" }} alt="" />
                <Typography variant="h6" color="inherit" component="div" sx={{ mr: 1 }}>
                    {userData ? `${userData.role}: ${userData.name} ${userData.surname}` : t("notLoggedIn")}
                </Typography>
                <Typography
                    variant="subtitle2"
                    color="inherit"
                    component="div"
                    sx={{
                        mr: 2,
                        maxWidth: { xs: '100%', sm: 360 },
                        opacity: workstationMachine.loaded && workstationMachine.name.length > 0 ? 1 : 0.85,
                        fontStyle: workstationMachine.loaded && workstationMachine.name.length > 0 ? 'normal' : 'italic',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                    title={machineHeaderText}
                >
                    {t('headerWorkstationMachine')}: {machineHeaderText}
                </Typography>

                <Box sx={{ flexGrow: 1, minWidth: 8 }} />

                <IconButton size="small" aria-label="Serbian" color="inherit"
                    onClick={() => { changeLanguageHandler("sr") }}>
                    <img src={serbianFlag} style={{ height: '20px', width: "auto" }} alt="" />
                </IconButton>

                <IconButton size="small" aria-label="English" color="inherit"
                    onClick={() => { changeLanguageHandler("en") }}>
                    <img src={englishFlag} style={{ height: '20px', width: "auto" }} alt="" />
                </IconButton>

                {userData && userData.role === "ADMIN" && (
                    <IconButton
                        size="small"
                        color="inherit"
                        onClick={() => { window.location.href = "/mock-qr" }}
                        aria-label={t("mockQrPanel")}
                    >
                        <QrCodeIcon />
                    </IconButton>
                )}

                <IconButton size="large" aria-label={t('backToHome')} color="inherit" sx={{ ml: { xs: 0, sm: 1 } }}
                    onClick={() => { window.location.href = "/" }}>
                    <HomeIcon />
                </IconButton>
                {userData &&
                    <IconButton size="large" aria-label={t("logoutAction")} color="inherit"
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


