import React, { useState } from 'react';
import PaymentPage from './PaymentPage';

const UpgradePlan = () => {
  const [showPayment, setShowPayment] = useState(true);

  return (
    <div className="upgrade-container">
      <PaymentPage />
    </div>
  );
};

export default UpgradePlan; 