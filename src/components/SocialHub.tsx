import React from 'react';
import { Navigate } from 'react-router-dom';

/** Legacy route — redirects to real adoption page. */
const SocialHub: React.FC = () => <Navigate to="/adopcion" replace />;

export default SocialHub;
