import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthDialog from './AuthDialog';
import { closeAuthDialog, useAuthDialog } from '@/hooks/useAuthDialog';

/**
 * The single mounted instance of the account dialog. Lives in App so any CTA —
 * header, landing hero, empty states, the report peek — can open it through
 * openAuthDialog() without carrying its own copy.
 */
const AuthDialogHost: React.FC = () => {
  const { open, mode } = useAuthDialog();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleSuccess = () => {
    // Signing up from the landing page should drop you into the dashboard.
    // Anywhere else, stay put — you were already reading something.
    if (pathname === '/' || pathname === '/welcome') navigate('/');
  };

  return (
    <AuthDialog
      open={open}
      defaultMode={mode}
      onOpenChange={(next) => {
        if (!next) closeAuthDialog();
      }}
      onSuccess={handleSuccess}
    />
  );
};

export default AuthDialogHost;
