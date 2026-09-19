import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Empty from '../components/Empty.jsx';
import { HospitalIcon, UsersIcon } from '../components/Icons.jsx';
import { staggerContainer, staggerItem } from '../lib/animations.js';

export default function AdminHospitals() {
    const [hospitals, setHospitals] = useState(null);

    useEffect(() => {
        API.get('/admin/hospitals')
            .then(result => setHospitals(result.hospitals || []))
            .catch(() => setHospitals([]));
    }, []);

    if (hospitals === null) return null;

    return (
        <>
            <PageHeader
                title="Hospitals registered"
                lead="Approved institutions linked to active doctors on Telemed ZM."
                actions={<Link to="/admin" className="btn-ghost">Back to dashboard</Link>}
            />

            {hospitals.length === 0 ? (
                <Empty Icon={HospitalIcon} title="No hospitals registered" message="Institutions appear here once an approved active doctor has an affiliated institution on their profile." />
            ) : (
                <motion.div className="grid grid-2 hospital-directory-grid" variants={staggerContainer} initial="initial" animate="animate">
                    {hospitals.map(hospital => (
                        <motion.div key={hospital.name} variants={staggerItem}>
                            <Card className="hospital-directory-card">
                                <div className="hospital-directory-icon"><HospitalIcon size={20} /></div>
                                <h2>{hospital.name}</h2>
                                <div className="hospital-directory-count"><UsersIcon size={16} /> {hospital.doctor_count} active doctor{hospital.doctor_count === 1 ? '' : 's'}</div>
                                {hospital.specialisations && <p className="muted small">{hospital.specialisations}</p>}
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </>
    );
}