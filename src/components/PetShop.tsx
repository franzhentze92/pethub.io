import React from 'react';
import { Navigate } from 'react-router-dom';

/** Legacy route — redirects to real marketplace. */
const PetShop: React.FC = () => <Navigate to="/marketplace" replace />;

export default PetShop;
