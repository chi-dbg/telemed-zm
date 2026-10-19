import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import { ToastProvider } from './hooks/useToast.jsx';
import Layout from './components/Layout.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Help from './pages/Help.jsx';

import Overview from './pages/Overview.jsx';
import ConsultationNew from './pages/ConsultationNew.jsx';
import Consultations from './pages/Consultations.jsx';
import Consultation from './pages/Consultation.jsx';
import Queue from './pages/Queue.jsx';
import Prescriptions from './pages/Prescriptions.jsx';
import Incoming from './pages/Incoming.jsx';
import Dispensed from './pages/Dispensed.jsx';
import Referrals from './pages/Referrals.jsx';
import Records from './pages/Records.jsx';
import Allergies from './pages/Allergies.jsx';
import Refills from './pages/Refills.jsx';
import Notifications from './pages/Notifications.jsx';
import Profile from './pages/Profile.jsx';
import Audit from './pages/Audit.jsx';
import Patients from './pages/Patients.jsx';
import PatientRecord from './pages/PatientRecord.jsx';
import Search from './pages/Search.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminHospitals from './pages/AdminHospitals.jsx';

export default function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <Routes>
                    {/* Public */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/help" element={<Help />} />

                    {/* Authenticated shell */}
                    <Route element={<Layout title="Overview" allowedRoles={['patient', 'doctor', 'pharmacist']} />}>
                        <Route path="/overview" element={<Overview />} />
                    </Route>

                    <Route element={<Layout title="Administrator dashboard" subtitle="Admin" allowedRoles={['admin']} />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                    </Route>

                    <Route element={<Layout title="Registered hospitals" subtitle="Admin" allowedRoles={['admin']} />}>
                        <Route path="/admin/hospitals" element={<AdminHospitals />} />
                    </Route>

                    <Route element={<Layout title="New consultation" subtitle="Care" allowedRoles={['patient']} />}>
                        <Route path="/consultation-new" element={<ConsultationNew />} />
                    </Route>

                    <Route element={<Layout title="My consultations" subtitle="Care" allowedRoles={['patient', 'doctor']} />}>
                        <Route path="/consultations" element={<Consultations />} />
                    </Route>

                    <Route element={<Layout title="Consultation" subtitle="Care" />}>
                        <Route path="/consultation/:id" element={<Consultation />} />
                    </Route>

                    <Route element={<Layout title="Patient queue" subtitle="Clinical" allowedRoles={['doctor']} />}>
                        <Route path="/queue" element={<Queue />} />
                    </Route>

                    <Route element={<Layout title="Prescriptions" />}>
                        <Route path="/prescriptions" element={<Prescriptions />} />
                    </Route>

                    <Route element={<Layout title="Incoming prescriptions" subtitle="Pharmacy" allowedRoles={['pharmacist']} />}>
                        <Route path="/incoming" element={<Incoming />} />
                    </Route>

                    <Route element={<Layout title="Dispensed prescriptions" subtitle="Pharmacy" allowedRoles={['pharmacist']} />}>
                        <Route path="/dispensed" element={<Dispensed />} />
                    </Route>

                    <Route element={<Layout title="Referrals" />}>
                        <Route path="/referrals" element={<Referrals />} />
                    </Route>

                    <Route element={<Layout title="Allergies & conditions" allowedRoles={['patient']} />}>
                        <Route path="/allergies" element={<Allergies />} />
                    </Route>

                    <Route element={<Layout title="Refill requests" />}>
                        <Route path="/refills" element={<Refills />} />
                    </Route>

                    <Route element={<Layout title="Notifications" />}>
                        <Route path="/notifications" element={<Notifications />} />
                    </Route>

                    <Route element={<Layout title="Profile & settings" />}>
                        <Route path="/profile" element={<Profile />} />
                    </Route>

                    <Route element={<Layout title="Audit log" subtitle="Admin" allowedRoles={['admin']} />}>
                        <Route path="/audit" element={<Audit />} />
                    </Route>

                    <Route element={<Layout title="My medical record" allowedRoles={['patient']} />}>
                        <Route path="/records" element={<Records />} />
                    </Route>

                    <Route element={<Layout title="My patients" subtitle="Clinical" allowedRoles={['doctor']} />}>
                        <Route path="/patients" element={<Patients />} />
                    </Route>

                    <Route element={<Layout title="Patient record" subtitle="Clinical" allowedRoles={['doctor']} />}>
                        <Route path="/patients/:patientId" element={<PatientRecord />} />
                    </Route>

                    <Route element={<Layout title="Search" />}>
                        <Route path="/search" element={<Search />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </ToastProvider>
        </AuthProvider>
    );
}
