import toast from 'react-hot-toast';
import type { TFunction } from 'i18next';

const successStyle = { background: '#2e7d32', color: '#fff' } as const;
const errorStyle = { background: '#c62828', color: '#fff' } as const;

export function toastActionSuccess(message: string): void {
    toast.success(message, { duration: 3200, style: successStyle });
}

/** Prefer server string body, then JSON message/error, then HTTP status / fallback. */
export function toastActionError(message: string): void {
    toast.error(message, { duration: 6000, style: errorStyle });
}

export function toastServerError(err: unknown, t: TFunction): void {
    let msg = t('toastActionErrorFallback');
    const r = err as { response?: { data?: unknown; status?: number }; message?: string };
    const data = r.response?.data;
    if (typeof data === 'string' && data.trim()) {
        msg = data;
    } else if (data && typeof data === 'object') {
        const o = data as Record<string, unknown>;
        if (typeof o.message === 'string' && o.message.trim()) msg = o.message;
        else if (typeof o.error === 'string' && o.error.trim()) msg = o.error;
        else if (r.response?.status != null) msg = t('toastActionErrorHttp', { status: r.response.status });
    } else if (r.response?.status != null) {
        msg = t('toastActionErrorHttp', { status: r.response.status });
    } else if (typeof r.message === 'string' && r.message.trim()) {
        msg = r.message;
    }
    toast.error(msg, { duration: 6000, style: errorStyle });
}
