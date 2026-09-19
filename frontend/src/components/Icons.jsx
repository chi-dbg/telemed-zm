/**
 * Inline SVG icon library for the Telemed ZM platform.
 *
 * All icons are line-style (similar to Lucide / Feather), 24x24 viewBox,
 * stroke uses currentColor so they inherit the parent's text color.
 * No external dependencies — pure inline SVG.
 *
 * Usage:
 *   <HomeIcon />
 *   <PillIcon size={18} />
 *   <BellIcon className="my-class" />
 */

import React from 'react';

const SVG = ({ size = 20, className = '', children, style, ...rest }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={{ verticalAlign: 'middle', ...style }}
        aria-hidden="true"
        focusable="false"
        {...rest}
    >
        {children}
    </svg>
);

/* ---------- Brand mark (medical cross in circle) ---------- */
export const BrandIcon = (p) => (
    <SVG {...p}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="7" x2="12" y2="17" />
        <line x1="7" y1="12" x2="17" y2="12" />
    </SVG>
);

/* ---------- Navigation ---------- */
export const HomeIcon = (p) => (
    <SVG {...p}>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </SVG>
);

export const PlusCircleIcon = (p) => (
    <SVG {...p}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
    </SVG>
);

export const PlusIcon = (p) => (
    <SVG {...p}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </SVG>
);

export const MessageIcon = (p) => (
    <SVG {...p}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </SVG>
);

export const VideoIcon = (p) => (
    <SVG {...p}>
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="m22 8-6 4 6 4V8Z" />
    </SVG>
);

export const VideoOffIcon = (p) => (
    <SVG {...p}>
        <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 .66 5-3v8l-2.1-1.26" />
        <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
        <line x1="2" y1="2" x2="22" y2="22" />
    </SVG>
);

export const MicIcon = (p) => (
    <SVG {...p}>
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
    </SVG>
);

export const MicOffIcon = (p) => (
    <SVG {...p}>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
        <path d="M15 9.34V5a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12v-2" />
        <path d="M19 10v2a7 7 0 0 1-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="2" x2="22" y2="22" />
    </SVG>
);

export const ClipboardIcon = (p) => (
    <SVG {...p}>
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
    </SVG>
);

export const PillIcon = (p) => (
    <SVG {...p}>
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
    </SVG>
);

export const RefreshIcon = (p) => (
    <SVG {...p}>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
        <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </SVG>
);

export const ActivityIcon = (p) => (
    <SVG {...p}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </SVG>
);

export const HospitalIcon = (p) => (
    <SVG {...p}>
        <path d="M12 6v4" />
        <path d="M14 14h-4" />
        <path d="M14 18h-4" />
        <path d="M14 8h-4" />
        <path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18" />
        <path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h2" />
    </SVG>
);

export const BellIcon = (p) => (
    <SVG {...p}>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </SVG>
);

export const UserIcon = (p) => (
    <SVG {...p}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </SVG>
);

export const BookIcon = (p) => (
    <SVG {...p}>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </SVG>
);

export const ClockIcon = (p) => (
    <SVG {...p}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </SVG>
);

export const UsersIcon = (p) => (
    <SVG {...p}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </SVG>
);

export const SearchIcon = (p) => (
    <SVG {...p}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </SVG>
);

export const InboxIcon = (p) => (
    <SVG {...p}>
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </SVG>
);

export const CheckCircleIcon = (p) => (
    <SVG {...p}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </SVG>
);

export const NoteIcon = (p) => (
    <SVG {...p}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
    </SVG>
);

export const StethoscopeIcon = (p) => (
    <SVG {...p}>
        <path d="M11 2v2" />
        <path d="M5 2v2" />
        <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
        <path d="M8 15a6 6 0 0 0 12 0v-3" />
        <circle cx="20" cy="10" r="2" />
    </SVG>
);

export const CalendarIcon = (p) => (
    <SVG {...p}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </SVG>
);

export const DownloadIcon = (p) => (
    <SVG {...p}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </SVG>
);

export const ShieldIcon = (p) => (
    <SVG {...p}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </SVG>
);

export const LockIcon = (p) => (
    <SVG {...p}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </SVG>
);

export const LogoutIcon = (p) => (
    <SVG {...p}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </SVG>
);

export const AlertIcon = (p) => (
    <SVG {...p}>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </SVG>
);

export const CheckIcon = (p) => (
    <SVG {...p}>
        <polyline points="20 6 9 17 4 12" />
    </SVG>
);

export const MailIcon = (p) => (
    <SVG {...p}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </SVG>
);

export const MenuIcon = (p) => (
    <SVG {...p}>
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </SVG>
);

export const InfoIcon = (p) => (
    <SVG {...p}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </SVG>
);

export const ChevronRightIcon = (p) => (
    <SVG {...p}>
        <polyline points="9 18 15 12 9 6" />
    </SVG>
);

export const ChevronLeftIcon = (p) => (
    <SVG {...p}>
        <polyline points="15 18 9 12 15 6" />
    </SVG>
);

export const ArrowRightIcon = (p) => (
    <SVG {...p}>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </SVG>
);

export const ExternalLinkIcon = (p) => (
    <SVG {...p}>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
    </SVG>
);

export const PrinterIcon = (p) => (
    <SVG {...p}>
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
    </SVG>
);

export const FileSearchIcon = (p) => (
    <SVG {...p}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <circle cx="11" cy="14" r="2" />
        <path d="m13.5 16.5 2.5 2.5" />
    </SVG>
);

export const SettingsIcon = (p) => (
    <SVG {...p}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </SVG>
);

export const EyeIcon = (p) => (
    <SVG {...p}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
    </SVG>
);

export const EyeOffIcon = (p) => (
    <SVG {...p}>
        <path d="m3 3 18 18" />
        <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.1 18.1 0 0 1-3.2 4.2" />
        <path d="M6.6 6.6C3.5 8.7 2 12 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4.1-.8" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </SVG>
);