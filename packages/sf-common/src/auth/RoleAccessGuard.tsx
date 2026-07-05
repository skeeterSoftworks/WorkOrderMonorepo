import { useEffect } from 'react';
import type { UserWithRoles } from './applicationRoles';

type Props = {
    user: UserWithRoles;
    allowed: boolean;
    redirectTo?: string;
    children: React.ReactNode;
};

/** Redirects to home when the current user lacks access. */
export function RoleAccessGuard({ user, allowed, redirectTo = '/', children }: Props) {
    useEffect(() => {
        if (!allowed) {
            window.location.replace(redirectTo);
        }
    }, [allowed, redirectTo]);

    if (!allowed) {
        return null;
    }

    return <>{children}</>;
}

export function readLoggedUser(): UserWithRoles {
    try {
        const raw = sessionStorage.getItem('userData');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}
