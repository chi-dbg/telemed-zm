import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, animate as motionAnimate } from 'framer-motion';
import { staggerItem } from '../lib/animations.js';
import {
    ClockIcon, MessageIcon, PillIcon, HospitalIcon, UsersIcon,
    CheckCircleIcon, AlertIcon, InboxIcon, ShieldIcon, UserIcon,
} from './Icons.jsx';

/**
 * Maps the icon name the backend sends in /stats to a real SVG icon.
 * Unknown values fall back to ClockIcon.
 */
const ICON_BY_NAME = {
    hospital: HospitalIcon,
    users: UsersIcon,
    user: UserIcon,
    shield: ShieldIcon,
    pill: PillIcon,
    message: MessageIcon,
    clock: ClockIcon,
    inbox: InboxIcon,
    alert: AlertIcon,
    check: CheckCircleIcon,
};

function resolveIcon(input) {
    if (!input) return ClockIcon;
    if (typeof input === 'function') return input;
    if (typeof input === 'string' && ICON_BY_NAME[input]) return ICON_BY_NAME[input];
    return ClockIcon;
}

/**
 * KPI card with framer-motion entry + count-up animation on the value.
 */
const MotionLink = motion(Link);

export default function KpiCard({ icon, label, value, tone = 'primary', foot, to }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (!inView) return;
        const target = Number(value) || 0;
        if (target === 0) { setDisplay(0); return; }
        const controls = motionAnimate(0, target, {
            duration: 1.0,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (v) => setDisplay(Math.round(v)),
        });
        return () => controls.stop();
    }, [inView, value]);

    const Icon = resolveIcon(icon);
    const className = `kpi-card ${tone} ${to ? 'interactive' : ''}`;
    const motionProps = {
        ref,
        className,
        variants: staggerItem,
        whileHover: { y: -2, boxShadow: '0 4px 16px rgba(15,55,40,.08)', transition: { duration: 0.2 } },
    };
    const content = (
        <>
            <div className="kpi-icon"><Icon size={20} /></div>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{display}</div>
            {foot && <div className="kpi-foot">{foot}</div>}
        </>
    );

    if (to) {
        return (
            <MotionLink
                {...motionProps}
                to={to}
                aria-label={`Open ${label}`}
            >
                {content}
            </MotionLink>
        );
    }

    return (
        <motion.div {...motionProps}>
            {content}
        </motion.div>
    );
}
