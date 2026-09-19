import { statusLabel } from '../lib/helpers.js';

export default function Pill({ status, children, className = '' }) {
    return (
        <span className={`pill pill-${status} ${className}`}>
            {children || statusLabel(status)}
        </span>
    );
}
