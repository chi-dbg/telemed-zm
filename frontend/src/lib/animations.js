/**
 * Reusable framer-motion variants for the Telemed ZM app.
 * Centralised so every page/component shares the same motion language.
 */

const SPRING = { type: 'spring', damping: 22, stiffness: 220 };
const EASE   = [0.16, 1, 0.3, 1];

/* ---------- Page-level ---------- */

export const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
    exit:    { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE } },
};

/* ---------- Layout shell ---------- */

export const sidebarVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.35, ease: EASE } },
};

export const headerVariants = {
    initial: { y: -14, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.5, delay: 0.1, ease: EASE } },
};

export const navListVariants = {
    initial: {},
    animate: { transition: { staggerChildren: 0.04, delayChildren: 0.2 } },
};

export const navItemVariants = {
    initial: { x: -10, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.4, ease: EASE } },
};

/* ---------- Stagger containers ---------- */

export const staggerContainer = {
    initial: {},
    animate: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

export const staggerContainerFast = {
    initial: {},
    animate: { transition: { staggerChildren: 0.03, delayChildren: 0.1 } },
};

export const staggerItem = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/* ---------- Cards ---------- */

export const cardVariants = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
    hover:   { y: -2, boxShadow: '0 4px 16px rgba(15,55,40,.10)', transition: { duration: 0.2 } },
};

export const featureCardVariants = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
    hover:   { y: -3, boxShadow: '0 8px 24px rgba(15,55,40,.10)', borderColor: 'var(--primary-soft)', transition: { duration: 0.25 } },
};

export const gapCardVariants = {
    initial: { opacity: 0, x: -28 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
};

/* ---------- Hero / landing ---------- */

export const heroLineVariants = {
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export const heroIllustrationVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.8, delay: 0.4, ease: EASE } },
};

export const heroFloatVariants = {
    animate: {
        y: [0, -8, 0],
        transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
    },
};

export const ctaPulse = {
    animate: {
        scale: [1, 1.04, 1],
        transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
    },
};

/* ---------- Auth pages ---------- */

export const slideFromLeft = {
    initial: { x: -32, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.7, ease: EASE } },
};

export const slideFromRight = {
    initial: { x: 32, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.7, delay: 0.1, ease: EASE } },
};

/* ---------- Buttons / interactive ---------- */

export const buttonPress = {
    whileHover: { y: -1 },
    whileTap:   { scale: 0.97 },
    transition: { duration: 0.15 },
};

/* ---------- Triage result spring ---------- */

export const triageResultVariants = {
    initial: { opacity: 0, scale: 0.92, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 14, stiffness: 220 } },
};

/* ---------- Symptom selection bounce ---------- */

export const symptomSelectVariants = {
    selected:   { opacity: 1, y: 0, scale: [1, 1.06, 1], transition: { duration: 0.3 } },
    unselected: {},
};

/* ---------- Chat messages ---------- */

export const chatMessageVariants = (isMe) => ({
    initial: { opacity: 0, x: isMe ? 16 : -16, y: 4 },
    animate: { opacity: 1, x: 0, y: 0, transition: { duration: 0.35, ease: EASE } },
});

/* Active sidebar item bounce */
export const activeNavBounce = {
    animate: {
        opacity: 1,
        x: 0,
        scale: [1, 1.04, 1],
        transition: { duration: 0.5, delay: 0.5, ease: [0.34, 1.56, 0.64, 1] },
    },
};
