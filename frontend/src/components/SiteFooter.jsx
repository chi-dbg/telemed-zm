import { Link } from 'react-router-dom';
import { BrandIcon } from './Icons.jsx';

export default function SiteFooter({ className = '' }) {
    const year = new Date().getFullYear();
    return (
        <footer className={`site-footer ${className}`.trim()}>
            <div className="site-footer-grid">
                <section>
                    <div className="site-footer-brand"><BrandIcon size={20} /> <strong>Telemed ZM</strong></div>
                    <p>Secure remote care, electronic prescriptions, and connected clinical records for Zambia.</p>
                </section>
                <section>
                    <h3>Platform</h3>
                    <Link to="/register">Create account</Link>
                    <Link to="/login">Sign in</Link>
                    <Link to="/help">Help &amp; FAQ</Link>
                </section>
                <section>
                    <h3>Support</h3>
                    <a href="mailto:telemed@zm.org">telemed@zm.org</a>
                    <a href="tel:+260777159404">+260 777 159 404</a>
                    <a href="tel:+260765272070">+260 765 272 070</a>
                </section>
                <section>
                    <h3>Privacy &amp; safety</h3>
                    <p>Your account is protected with role-based access and password hashing.</p>
                    <p>For emergencies, contact local emergency services or visit the nearest health facility.</p>
                </section>
            </div>
            <div className="site-footer-bottom">
                <span>&copy; {year} Telemed ZM. All rights reserved.</span>
                <span>Healthcare without the journey.</span>
            </div>
        </footer>
    );
}
