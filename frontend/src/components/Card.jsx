import { motion } from 'framer-motion';
import { cardVariants } from '../lib/animations.js';

export default function Card({ children, className = '', style, hover = true, ...rest }) {
    return (
        <motion.div
            className={`card ${className}`}
            style={style}
            variants={cardVariants}
            whileHover={hover ? 'hover' : undefined}
            {...rest}
        >
            {children}
        </motion.div>
    );
}
