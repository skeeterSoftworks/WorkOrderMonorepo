import {useSelector} from 'react-redux';
import {ThemeProvider} from '@emotion/react';
import {getCentralTheme} from '../util/ThemeUtils';
import {Container, CssBaseline, Grid, LinearProgress} from '@mui/material';
import {LoginForm} from '../components/shared/LoginForm';
import {AppBarHeader} from '../components/shared/AppBarHeader';
import "../i18n/I18n"
import {useTranslation} from 'react-i18next';


export function HOC(props) {

    const { t } = useTranslation()

    const userData = sessionStorage.getItem("userData")
    const socketConnected = useSelector((state: any) => state.applicationStore?.socketConnected);

    const theme = getCentralTheme();


    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppBarHeader/>
            {userData && socketConnected &&
                <Container style={{maxWidth: "100%"}}>
                    {props.children}
                </Container>}
            {!userData && socketConnected &&
                <LoginForm />
            }


            {!socketConnected &&
                <Grid style={{ marginTop: 100, textAlign: "center" }}>
                    <h4>{t("connectingToServer")}</h4>
                    <LinearProgress />
                </Grid>}
        </ThemeProvider>
    )
}
