import React from 'react';
import HomeView from '@/components/home/HomeView';
import LandingPage from './LandingPage';
import { useAuth } from '@/hooks/useAuth';

/**
 * `/` is two different pages. Signed out, it's the pitch — who we are and why
 * you'd want an account. Signed in, it's the dashboard — your season and this
 * week's board. The landing page also stays permanently reachable at /welcome.
 */
const Index: React.FC = () => {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <HomeView /> : <LandingPage />;
};

export default Index;
