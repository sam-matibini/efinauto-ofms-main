import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AuditService } from './AuditService';
import { useCompany } from './CompanyContext';

/**
 * Custom hook for easy audit logging in components
 * 
 * Usage:
 * const { logCreate, logUpdate, logDelete, logStatusChange } = useAuditLog('Vehicle');
 * 
 * // When creating a record
 * await createVehicle(data);
 * logCreate(newVehicle.id, newVehicle.vin, data);
 * 
 * // When updating a record
 * await updateVehicle(id, newData);
 * logUpdate(id, vehicle.vin, oldData, newData);
 * 
 * // When deleting a record
 * await deleteVehicle(id);
 * logDelete(id, vehicle.vin, oldData);
 */
export function useAuditLog(module) {
  const { selectedCompanyId } = useCompany();
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const logCreate = useCallback(async (recordId, recordIdentifier, newValues, metadata = null) => {
    if (!user) return;
    return AuditService.logCreate(user, selectedCompanyId, module, recordId, recordIdentifier, newValues, metadata);
  }, [user, selectedCompanyId, module]);

  const logUpdate = useCallback(async (recordId, recordIdentifier, oldValues, newValues, metadata = null) => {
    if (!user) return;
    return AuditService.logUpdate(user, selectedCompanyId, module, recordId, recordIdentifier, oldValues, newValues, metadata);
  }, [user, selectedCompanyId, module]);

  const logDelete = useCallback(async (recordId, recordIdentifier, oldValues, metadata = null) => {
    if (!user) return;
    return AuditService.logDelete(user, selectedCompanyId, module, recordId, recordIdentifier, oldValues, metadata);
  }, [user, selectedCompanyId, module]);

  const logStatusChange = useCallback(async (recordId, recordIdentifier, oldStatus, newStatus, metadata = null) => {
    if (!user) return;
    return AuditService.logStatusChange(user, selectedCompanyId, module, recordId, recordIdentifier, oldStatus, newStatus, metadata);
  }, [user, selectedCompanyId, module]);

  const logUpload = useCallback(async (recordId, recordIdentifier, fileInfo, metadata = null) => {
    if (!user) return;
    return AuditService.logUpload(user, selectedCompanyId, module, recordId, recordIdentifier, fileInfo, metadata);
  }, [user, selectedCompanyId, module]);

  const logDownload = useCallback(async (recordId, recordIdentifier, metadata = null) => {
    if (!user) return;
    return AuditService.logDownload(user, selectedCompanyId, module, recordId, recordIdentifier, metadata);
  }, [user, selectedCompanyId, module]);

  const logView = useCallback(async (recordId, recordIdentifier, metadata = null) => {
    if (!user) return;
    return AuditService.logView(user, selectedCompanyId, module, recordId, recordIdentifier, metadata);
  }, [user, selectedCompanyId, module]);

  const logExport = useCallback(async (exportType, recordCount, metadata = null) => {
    if (!user) return;
    return AuditService.logExport(user, selectedCompanyId, module, exportType, recordCount, metadata);
  }, [user, selectedCompanyId, module]);

  const logImport = useCallback(async (importType, recordCount, metadata = null) => {
    if (!user) return;
    return AuditService.logImport(user, selectedCompanyId, module, importType, recordCount, metadata);
  }, [user, selectedCompanyId, module]);

  const logPayment = useCallback(async (recordId, recordIdentifier, paymentDetails, metadata = null) => {
    if (!user) return;
    return AuditService.logPayment(user, selectedCompanyId, module, recordId, recordIdentifier, paymentDetails, metadata);
  }, [user, selectedCompanyId, module]);

  const logError = useCallback(async (errorMessage, metadata = null) => {
    if (!user) return;
    return AuditService.logError(user, selectedCompanyId, module, errorMessage, metadata);
  }, [user, selectedCompanyId, module]);

  return {
    logCreate,
    logUpdate,
    logDelete,
    logStatusChange,
    logUpload,
    logDownload,
    logView,
    logExport,
    logImport,
    logPayment,
    logError,
    user,
    companyId: selectedCompanyId
  };
}

export default useAuditLog;