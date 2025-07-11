import React from 'react';
import type { AuthUser } from '../lib/supabase/auth-service';

interface AuthDetailsProps {
  user: AuthUser;
  onSignOut: () => void;
}

const AuthDetails: React.FC<AuthDetailsProps> = ({ user, onSignOut }) => {
  const containerStyle: React.CSSProperties = {
    border: '1px solid #CDD2D0',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'flex-start', // Align to the top
    gap: '12px',
  };

  const avatarStyle: React.CSSProperties = {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  };

  const avatarPlaceholderStyle: React.CSSProperties = {
    ...avatarStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981', // emerald-500
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px',
  };

  const userInfoStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  };

  const nameStyle: React.CSSProperties = {
    fontWeight: 600, // semibold
    fontSize: '14px', // text-sm
    color: '#374151', // text-gray-800
    margin: 0, // Remove default paragraph margins
  };

  const emailStyle: React.CSSProperties = {
    fontSize: '12px', // text-xs
    color: '#6B7280', // text-gray-500
    margin: 0, // Remove default paragraph margins
  };
  
  const buttonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    textAlign: 'left',
    fontSize: '12px', // text-xs
    fontWeight: 600, // semibold
    color: '#059669', // text-emerald-600
    cursor: 'pointer',
  };

  return (
    <div style={containerStyle}>
      {/* Avatar */}
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt="User avatar"
          style={avatarStyle}
        />
      ) : (
        <div style={avatarPlaceholderStyle}>
          {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
        </div>
      )}
      
      {/* User Info */}
      <div style={userInfoStyle}>
        <p style={nameStyle}>{user.full_name || 'User'}</p>
        <p style={emailStyle}>{user.email}</p>
        <button
          onClick={onSignOut}
          style={buttonStyle}
          onMouseEnter={(e) => e.currentTarget.style.color = '#047857'} // hover:text-emerald-700
          onMouseLeave={(e) => e.currentTarget.style.color = '#059669'}
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

export default AuthDetails; 