import { useEffect, useState } from 'react';

/**
 * Keeps form field state in a child component. Resets when the container opens or
 * `resetKey` changes (e.g. entity id being edited).
 */
export function useFormIsolation<T>(
    active: boolean,
    initialValues: T,
    resetKey?: string | number | null,
): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [values, setValues] = useState<T>(initialValues);

    useEffect(() => {
        if (active) {
            setValues(initialValues);
        }
        // Intentionally depend on resetKey, not full initialValues object identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, resetKey]);

    return [values, setValues];
}
