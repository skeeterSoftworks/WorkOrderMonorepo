import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import  {useEffect} from "react"
import {useTranslation} from 'react-i18next';
import type {LoggedUser} from "work-order-local/src/models/Common.ts";


export function StockHome() {

    const { t } = useTranslation();

    const userDataString =  sessionStorage.getItem("userData");
    const userData: LoggedUser = userDataString && JSON.parse(userDataString)

    useEffect(() => {

    }, [])



    return (
        <Container>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6">
                        {t("stock")} - {t("welcome")}, {userData.name} {userData.surname}
                    </Typography>
                </Toolbar>

            </AppBar>


        </Container>
    );
}
