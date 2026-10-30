import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API } from '../api/client.js';
import { useToast } from '../hooks/useToast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import KpiCard from '../components/KpiCard.jsx';
import Card from '../components/Card.jsx';
import Empty from '../components/Empty.jsx';
import Pill from '../components/Pill.jsx';
import { fmtDateTime, safe, truncate } from '../lib/helpers.js';
import { staggerContainer, staggerItem } from '../lib/animations.js';
import {
    CheckCircleIcon,
    HospitalIcon,
    LockIcon,
    PillIcon,
    RefreshIcon,
    SearchIcon,
    ShieldIcon,
    UsersIcon,
} from '../components/Icons.jsx';

const TABS = [
    { key: 'users', label: 'Users' },
    { key: 'usage', label: 'Usage' },
    { key: 'audit', label: 'Audit' },
];

const STATUS_FILTERS = ['all', 'approved', 'blocked', 'pending', 'rejected'];
const ROLE_FILTERS = ['all', 'patient', 'doctor', 'pharmacist', 'admin'];
function tabFrom(value) {
    return TABS.some(tab => tab.key === value) ? value : 'users';
}

function statusFrom(value) {
    return STATUS_FILTERS.includes(value) ? value : 'all';
}

function roleFrom(value) {
    return ROLE_FILTERS.includes(value) ? value : 'all';
}

function kpiLinkFor(label) {
    const normalized = String(label || '').toLowerCase();
    if (normalized.includes('patient')) return '/admin?tab=users&role=patient';
    if (normalized.includes('doctor')) return '/admin?tab=users&role=doctor';
    if (normalized.includes('pharmac')) return '/admin?tab=users&role=pharmacist';
    if (normalized.includes('hospital')) return '/admin/hospitals';
    return '/admin?tab=usage';
}

const STATUS_TONE = {
    pending: 'warn',
    approved: 'success',
    blocked: 'danger',
    rejected: 'danger',
};

function numberValue(value) {
    return Number(value || 0);
}

function human(value) {
    return safe(value).replaceAll('_', ' ');
}

function credentialLine(user) {
    if (user.role === 'doctor') {
        return [user.credential, user.specialisation, user.organization].filter(Boolean).join(' | ');
    }
    if (user.role === 'pharmacist') {
        return [user.credential, user.organization, user.pharmacy_address].filter(Boolean).join(' | ');
    }
    return user.organization || user.phone || 'Profile details unavailable';
}

function StatusPill({ status }) {
    return <Pill status={STATUS_TONE[status] || status}>{human(status)}</Pill>;
}

function UserActions({ user, actioning, onStatus }) {
    const disabled = Boolean(actioning);
    const isApproved = user.account_status === 'approved';

    return (
        <div className="admin-action-row">
            {isApproved ? (
                <button type="button" className="btn-warn btn-sm" disabled={disabled} onClick={() => onStatus(user, 'blocked')}>
                    <LockIcon size={15} /> Block
                </button>
            ) : (
                <button type="button" className="btn-secondary btn-sm" disabled={disabled} onClick={() => onStatus(user, 'approved')}>
                    <RefreshIcon size={15} /> Restore access
                </button>
            )}
        </div>
    );
}

function UserTable({ users, actioning, onStatus, emptyTitle, emptyMessage }) {
    if (!users.length) {
        return <Empty Icon={UsersIcon} title={emptyTitle} message={emptyMessage} />;
    }

    return (
        <div className="table-wrap admin-table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Credential / organization</th>
                        <th>Status</th>
                        <th>Registered</th>
                        <th>Admin controls</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>
                                <strong>{user.full_name}</strong>
                                <div className="muted small">{user.email}</div>
                            </td>
                            <td>{human(user.role)}</td>
                            <td className="admin-detail-cell">{credentialLine(user)}</td>
                            <td><StatusPill status={user.account_status} /></td>
                            <td>{fmtDateTime(user.created_at)}</td>
                            <td>
                                <UserActions user={user} actioning={actioning === user.id} onStatus={onStatus} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MiniMetric({ icon: Icon, label, value, tone = '' }) {
    return (
        <div className={`mini-metric ${tone}`}>
            <span className="mini-metric-icon"><Icon size={17} /></span>
            <span className="mini-metric-body">
                <strong>{numberValue(value)}</strong>
                <span>{label}</span>
            </span>
        </div>
    );
}

function UsageGroup({ title, items, Icon }) {
    return (
        <Card hover={false} className="usage-group-card">
            <h3><Icon size={18} /> {title}</h3>
            <div className="usage-metric-list">
                {items.map(item => (
                    <div className="usage-metric" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{numberValue(item.value)}</strong>
                    </div>
                ))}
            </div>
        </Card>
    );
}

export default function AdminDashboard() {
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(() => tabFrom(searchParams.get('tab')));
    const [overview, setOverview] = useState(null);
    const [users, setUsers] = useState([]);
    const [statusFilter, setStatusFilter] = useState(() => statusFrom(searchParams.get('status')));
    const [roleFilter, setRoleFilter] = useState(() => roleFrom(searchParams.get('role')));
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState(null);
    useEffect(() => {
        const nextTab = tabFrom(searchParams.get('tab'));
        const nextStatus = statusFrom(searchParams.get('status'));
        const nextRole = roleFrom(searchParams.get('role'));
        setActiveTab(current => current === nextTab ? current : nextTab);
        setStatusFilter(current => current === nextStatus ? current : nextStatus);
        setRoleFilter(current => current === nextRole ? current : nextRole);
    }, [searchParams]);

    function setAdminParams(updates) {
        const next = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '' || value === 'all') {
                next.delete(key);
            } else {
                next.set(key, value);
            }
        });
        setSearchParams(next);
    }

    function selectTab(tabKey) {
        setActiveTab(tabKey);
        setAdminParams({
            tab: tabKey,
            role: tabKey === 'users' ? roleFilter : null,
            status: tabKey === 'users' ? statusFilter : null,
        });
    }

    function selectStatusFilter(value) {
        setStatusFilter(value);
        setAdminParams({ tab: 'users', status: value, role: roleFilter });
    }

    function selectRoleFilter(value) {
        setRoleFilter(value);
        setAdminParams({ tab: 'users', role: value, status: statusFilter });
    }

    async function loadOverview() {
        const data = await API.get('/admin/overview');
        setOverview(data);
        return data;
    }

    async function loadUsers() {
        const data = await API.get('/admin/users', { status: statusFilter, role: roleFilter });
        setUsers(data.users || []);
        return data.users || [];
    }

    useEffect(() => {
        setLoading(true);
        Promise.all([loadOverview(), loadUsers()])
            .catch(err => toast(err.message || 'Could not load administrator dashboard', 'error'))
            .finally(() => setLoading(false));
    }, [statusFilter, roleFilter]);

    const accountSummary = overview?.account_summary || {};
    const usage = overview?.usage || { clinical: [], pharmacy: [], system: [] };
    const roleBreakdown = overview?.role_breakdown || [];
    const recentActivity = overview?.recent_activity || [];

    const filteredUsers = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return users;
        return users.filter(user => [
            user.full_name,
            user.email,
            user.role,
            user.account_status,
            user.organization,
            user.credential,
            user.specialisation,
        ].some(value => safe(value).toLowerCase().includes(q)));
    }, [users, query]);

    async function updateUserStatus(user, status) {
        setActioning(user.id);
        try {
            await API.patch(`/admin/users/${user.id}/status`, { status });
            await Promise.all([loadOverview(), loadUsers()]);
            toast(`${user.full_name} is now ${human(status)}`, 'success');
        } catch (err) {
            toast(err.message || 'Could not update user status', 'error');
        } finally {
            setActioning(null);
        }
    }

    if (loading && !overview) return null;

    return (
        <>
            <PageHeader
                title="Administrator dashboard"
                lead="Manage user access and monitor platform-wide clinical and pharmacy usage. New registrations are approved automatically."
                actions={
                    <button type="button" className="btn-secondary" onClick={() => { loadOverview(); loadUsers(); }}>
                        <RefreshIcon size={16} /> Refresh
                    </button>
                }
            />

            <motion.div className="grid grid-4 admin-kpi-grid responsive-tile-grid" variants={staggerContainer} initial="initial" animate="animate">
                {(overview?.cards || []).map(card => (
                    <KpiCard key={card.label} {...card} to={kpiLinkFor(card.label)} />
                ))}
            </motion.div>

            <div className="admin-summary-grid responsive-summary-grid">
                <MiniMetric icon={UsersIcon} label="total users" value={accountSummary.total_users} />
                <MiniMetric icon={CheckCircleIcon} label="active users" value={accountSummary.active_users} tone="success" />
                <MiniMetric icon={LockIcon} label="blocked users" value={accountSummary.blocked_users} tone="danger" />
            </div>

            <div className="tabs glass-tabs" role="tablist" aria-label="Administrator dashboard sections">
                {TABS.map(tab => (
                    <button
                        type="button"
                        key={tab.key}
                        className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => selectTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'users' && (
                <motion.div variants={staggerItem} initial="initial" animate="animate">
                    <Card hover={false}>
                        <div className="card-title-row admin-filter-row">
                            <h2>User administration</h2>
                            <div className="admin-filters">
                                <input
                                    type="search"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search users"
                                />
                                <select value={statusFilter} onChange={e => selectStatusFilter(e.target.value)}>
                                    {STATUS_FILTERS.map(status => <option key={status} value={status}>{human(status)}</option>)}
                                </select>
                                <select value={roleFilter} onChange={e => selectRoleFilter(e.target.value)}>
                                    {ROLE_FILTERS.map(role => <option key={role} value={role}>{human(role)}</option>)}
                                </select>
                            </div>
                        </div>
                        <UserTable
                            users={filteredUsers}
                            actioning={actioning}
                            onStatus={updateUserStatus}
                            emptyTitle="No users found"
                            emptyMessage="Try a different role, status, or search term."
                        />
                    </Card>
                </motion.div>
            )}

            {activeTab === 'usage' && (
                <motion.div className="grid grid-3" variants={staggerContainer} initial="initial" animate="animate">
                    <UsageGroup title="Clinical usage" items={usage.clinical} Icon={HospitalIcon} />
                    <UsageGroup title="Pharmacy usage" items={usage.pharmacy} Icon={PillIcon} />
                    <UsageGroup title="System usage" items={usage.system} Icon={ShieldIcon} />
                    <Card hover={false} className="role-breakdown-card">
                        <h3><UsersIcon size={18} /> Role breakdown</h3>
                        <div className="table-wrap compact-table">
                            <table>
                                <thead><tr><th>Role</th><th>Total</th><th>Active</th><th>Blocked</th></tr></thead>
                                <tbody>
                                    {roleBreakdown.map(row => (
                                        <tr key={row.role}>
                                            <td>{human(row.role)}</td>
                                            <td>{numberValue(row.total)}</td>
                                            <td>{numberValue(row.active)}</td>
                                            <td>{numberValue(row.blocked)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </motion.div>
            )}

            {activeTab === 'audit' && (
                <motion.div variants={staggerItem} initial="initial" animate="animate">
                    <Card hover={false}>
                        <div className="card-title-row">
                            <h2>Recent platform activity</h2>
                            <span className="tag">latest {recentActivity.length}</span>
                        </div>
                        {recentActivity.length ? (
                            <div className="admin-activity-list">
                                {recentActivity.map(item => (
                                    <div className="activity-row" key={item.audit_id}>
                                        <div className="activity-icon"><SearchIcon size={18} /></div>
                                        <div className="activity-body">
                                            <div className="title">{item.action} <span className="muted small">on {item.entity_type} #{item.entity_id || '-'}</span></div>
                                            <div className="meta">
                                                {fmtDateTime(item.created_at)} | {item.actor_name || item.actor_role || 'System'} | {truncate(item.details, 120)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Empty Icon={SearchIcon} title="No audit activity" message="Platform events will appear here as users work in the system." />
                        )}
                    </Card>
                </motion.div>
            )}
        </>
    );
}
