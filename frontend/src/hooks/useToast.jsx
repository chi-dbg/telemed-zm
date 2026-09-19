import { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);

    const show = useCallback((message, kind = '') => {
        setToast({ message, kind, id: Date.now() });
    }, []);

    useEffect(() => {
        if (!toast) return;
        const id = setTimeout(() => setToast(null), 3200);
        return () => clearTimeout(id);
    }, [toast]);

    return (
        <ToastCtx.Provider value={{ show }}>
            {children}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: 24, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 18, stiffness: 240 }}
                        className={`toast show ${toast.kind}`}
                    >
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </ToastCtx.Provider>
    );
}

export function useToast() {
    const v = useContext(ToastCtx);
    if (!v) throw new Error('useToast must be used inside <ToastProvider>');
    return v.show;
}
