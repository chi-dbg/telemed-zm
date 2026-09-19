import { motion } from 'framer-motion';
import { InboxIcon } from './Icons.jsx';

export default function Empty({ Icon = InboxIcon, title, message }) {
    return (
        <motion.div
            className="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="empty-icon" style={{ color: 'var(--muted-light)' }}>
                <Icon size={40} />
            </div>
            <h3>{title}</h3>
            {message && <p>{message}</p>}
        </motion.div>
    );
}
