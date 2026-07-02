import React from 'react';
import { Navigate } from 'react-router-dom';

/** @deprecated Use /recordatorios instead */
const PetReminders: React.FC = () => <Navigate to="/recordatorios" replace />;

export default PetReminders;
