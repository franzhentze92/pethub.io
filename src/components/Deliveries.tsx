import React from 'react';
import { Navigate } from 'react-router-dom';

/** Legacy route — redirects to client orders. */
const Deliveries: React.FC = () => <Navigate to="/client-orders" replace />;

export default Deliveries;
