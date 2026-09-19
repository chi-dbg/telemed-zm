import { motion } from 'framer-motion';
import { AlertIcon, CheckIcon, InfoIcon } from './Icons.jsx';

const ICON_BY_KIND = {
    error:   AlertIcon,
    warn:    AlertIcon,
    success: CheckIcon,
    info:    InfoIcon,
};

export default function Alert({ kind = 'info', children }) {
    const Icon = ICON_BY_KIND[kind] || InfoIcon;
    return (
        <motion.div
            className={`alert alert-${kind}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <span className="alert-icon"><Icon size={18} /></span>
            <div>{children}</div>
        </motion.div>
    );
}
