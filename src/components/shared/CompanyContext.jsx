import React, { createContext, useContext, useState, useEffect } from 'react';

const CompanyContext = createContext();

export function CompanyProvider({ children }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    return localStorage.getItem('selectedCompanyId') || null;
  });

  useEffect(() => {
    if (selectedCompanyId) {
      localStorage.setItem('selectedCompanyId', selectedCompanyId);
    } else {
      localStorage.removeItem('selectedCompanyId');
    }
  }, [selectedCompanyId]);

  return (
    <CompanyContext.Provider value={{ selectedCompanyId, setSelectedCompanyId }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return context;
}