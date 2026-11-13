import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { Avatar, useNow } from './ui';
import { useAuth } from '../lib/auth';
import { useTable } from '../lib/store';
import { db } from '../lib/db';
import { dateLong } from '../lib/format';

const SITE = 'https://jaytech9.com';

export default function Layout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const now = useNow();
  const bookings = useTable('bookings').rows;
  const enquiries = useTable('enquiries').rows;
  const reviews = useTable('reviews').rows;
  const counts = {
    bookings: bookings.filter((b) => b.status === 'new').length,
    enquiries: enquiries.filter((e) => e.status === 'new').length,
    reviews: reviews.filter((r) => r.status === 'pending').length,
  };
  const alerts = counts.bookings + counts.enquiries + counts.reviews;
  useEffect(() => setOpen(false), [loc.pathname]);

  const item = (to: string, icon: string, label: string, count?: number, amber?: boolean) => (
    <NavLink to={to} end={to === '/'}>
      <span className="nav__ic"><Icon name={icon} /></span>{label}
      {!!count && <span className={`nav__count ${amber ? 'nav__count--amber' : ''}`} aria-label={`${count} new`}>{count}</span>}
    </NavLink>
  );

  return (
    <div className="shell">
      <div className={`scrim ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`side ${open ? 'is-open' : ''}`} aria-label="Main menu">
        <NavLink to="/" className="brand">
          <img src="/logo.png" alt="" />
          <div><strong>JayTech9</strong><small>CRM workspace</small></div>
        </NavLink>
        <nav className="nav">
          <p className="nav__group">Menu</p>
          {item('/', 'grid', 'Dashboard')}
          {item('/bookings', 'calendar', 'Bookings', counts.bookings)}
          {item('/enquiries', 'inbox', 'Enquiries', counts.enquiries)}
          {item('/clients', 'users', 'Clients')}
          {item('/pipeline', 'columns', 'Pipeline')}
          {item('/projects', 'folder', 'Projects')}
          {item('/messages', 'send', 'Messages')}
          <p className="nav__group">Website</p>
          {item('/website', 'globe', 'Website sections')}
          {item('/reviews', 'star', 'Reviews', counts.reviews, true)}
          <p className="nav__group">General</p>
          {item('/settings', 'settings', 'Settings')}
          <button type="button" className="nav__logout" onClick={() => signOut().then(() => nav('/'))}>
            <span className="nav__ic"><Icon name="logout" /></span>Log out
          </button>
        </nav>
        <a className="live-card" href={SITE} target="_blank" rel="noreferrer">
          <strong>See your live website</strong>
          <span>jaytech9.com <Icon name="external" size={14} /></span>
        </a>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>
          <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get('q'); nav(`/clients?q=${encodeURIComponent(String(q ?? ''))}`); }}>
            <Icon name="search" size={17} />
            <label className="visually-hidden" htmlFor="gq">Search clients</label>
            <input id="gq" name="q" type="search" placeholder="Search clients, phone or email" />
          </form>
          <div className="topbar__right">
            <span className="topbar__date">{dateLong(now)}</span>
            <NavLink to="/messages" className="icon-btn" aria-label="Messages"><Icon name="chat" /></NavLink>
            <NavLink to={counts.reviews ? '/reviews' : counts.enquiries ? '/enquiries' : '/bookings'} className="icon-btn" aria-label={`${alerts} items need attention`}>
              <Icon name="bell" />{alerts > 0 && <span className="dot" />}
            </NavLink>
            <div className="me">
              <Avatar name={user?.name ?? 'User'} size={40} />
              <div><strong>{user?.name}</strong><small>{user?.role === 'admin' ? 'Admin' : 'Staff'}</small></div>
            </div>
          </div>
        </header>
        <main className="content" id="main">
          {db.mode === 'demo' && (
            <p className="demo-bar"><Icon name="help" size={16} />Demo mode: you are looking at sample data. Nothing here is saved.</p>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
