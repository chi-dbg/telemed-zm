import { motion } from 'framer-motion';
import { staggerItem } from '../lib/animations.js';

export default function PageHeader({ title, lead, actions, children }) {
    return (
        <motion.div className="page-header" variants={staggerItem} initial="initial" animate="animate">
            <h1>{title}</h1>
            {lead && <p className="lead">{lead}</p>}
            {(actions || children) && <div className="actions">{actions || children}</div>}
        </motion.div>
    );
}
