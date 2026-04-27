import { Link, useNavigate } from 'react-router-dom';
import { clearSession, getUser, isLoggedIn } from '../auth';

export default function Navbar() {
  const navigate = useNavigate();
  const user = getUser();

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          MiniJira
        </Link>
        <div className="nav-actions">
          {isLoggedIn() ? (
            <>
              {user && (
                <span className="nav-user">
                  {user.username || user.email}
                </span>
              )}
              <Link to="/" className="btn secondary">
                Projects
              </Link>
              <button className="secondary" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn secondary">
                Login
              </Link>
              <Link to="/register" className="btn">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
