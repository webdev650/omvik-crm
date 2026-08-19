import React from 'react';
import useAuth from '../hooks/useAuth';
import DirectorDashboard from './DirectorDashboard';
import RepDashboard from './RepDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  // Roles permitted for executive analytics dashboard
  const EXECUTIVE_ROLES = ['super_admin', 'director', 'admin', 'team_lead'];

  const isExecutive = user?.role && EXECUTIVE_ROLES.includes(user.role);

  if (isExecutive) {
    return <DirectorDashboard />;
  }

  return <RepDashboard />;
}
