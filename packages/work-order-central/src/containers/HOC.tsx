import {getCentralTheme} from '../util/ThemeUtils';
import {Container, CssBaseline, ThemeProvider} from '@mui/material';
import {LoginForm} from '../components/shared/LoginForm';
import {AppBarHeader} from '../components/shared/AppBarHeader';
import "../i18n/I18n"
import {useState, useEffect} from 'react';


export function HOC(props: any) {

    const [userData, setUserData] = useState<string | null>(sessionStorage.getItem("userData"));

    const theme = getCentralTheme();

    useEffect(() => {
        const onUserLoggedIn = () => setUserData(sessionStorage.getItem("userData"));
        window.addEventListener('userLoggedIn', onUserLoggedIn);
        return () => window.removeEventListener('userLoggedIn', onUserLoggedIn);
    }, [])

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppBarHeader/>
            {userData
                ? <Container style={{maxWidth: "100%"}}>
                    {props.children}
                </Container>
                : <LoginForm />
            }
        </ThemeProvider>
    )
}
