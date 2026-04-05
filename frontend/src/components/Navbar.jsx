import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    {
      path: '/',
      label: 'Home',
      icon: (a) => (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      path: '/rent',
      label: 'Rent',
      icon: (a) => (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      path: '/expenses',
      label: 'Expenses',
      icon: (a) => (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: (a) => (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      path: '/house',
      label: 'House',
      icon: (a) => (
        <svg className="w-5 h-5" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Top bar */}
      <nav className="glass sticky top-0 z-30 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-gradient shadow-brand flex items-center justify-center text-white text-base font-bold group-hover:scale-105 transition-transform">
                🏡
              </div>
              <div className="hidden xs:block">
                <div className="text-sm sm:text-base font-bold text-slate-900 leading-tight">HouseFinance</div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 leading-tight">Split smart. Live easy.</div>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                      active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.icon(active)}
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* User menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden xs:flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[100px] truncate">
                  {user.name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs sm:text-sm text-slate-500 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-50"
                aria-label="Logout"
              >
                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass border-t border-slate-200/70 shadow-[0_-4px_16px_-4px_rgba(15,23,42,0.08)] pb-safe">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center py-2 gap-0.5 relative"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-emerald-500" />
                )}
                <div className={`transition-colors ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {item.icon(active)}
                </div>
                <span className={`text-[10px] font-medium transition-colors ${active ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
