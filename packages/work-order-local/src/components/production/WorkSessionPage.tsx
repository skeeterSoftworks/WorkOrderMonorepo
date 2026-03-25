import {useEffect} from 'react';
import {Navigate} from 'react-router-dom';

/** Work session UI lives on {@link ProductionPage} when a work order is selected. */
export function WorkSessionPage() {
    useEffect(() => {
        sessionStorage.removeItem('activeWorkSessionId');
    }, []);
    return <Navigate to="/production" replace />;
}
