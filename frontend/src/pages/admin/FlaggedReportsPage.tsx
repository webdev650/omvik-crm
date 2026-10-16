import React from 'react';
import { Navigate } from 'react-router-dom';

export default function FlaggedReportsPage() {
  return <Navigate to="/admin/team-eod?tab=flagged" replace />;
}
