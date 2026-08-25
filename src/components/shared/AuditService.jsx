import { supabase } from "@/api/supabaseClient";

/**
 * AuditService - Centralized logging service for security audit trail
 * All CRUD operations, authentication events, and system actions should be logged through this service
 */

// Simple hash function for tamper detection (client-side)
const generateHash = async (data) => {
  const str = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Get user agent info
const getUserAgent = () => {
  if (typeof navigator !== 'undefined') {
    return navigator.userAgent;
  }
  return 'unknown';
};

// Get changes summary between old and new values
const getChangesSummary = (oldValues, newValues) => {
  if (!oldValues || !newValues) return null;
  
  const changes = [];
  const allKeys = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]);
  
  for (const key of allKeys) {
    const oldVal = oldValues?.[key];
    const newVal = newValues?.[key];
    
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
        changes.push(`${key}: [redacted]`);
      } else {
        const oldDisplay = oldVal !== undefined ? JSON.stringify(oldVal).substring(0, 50) : 'null';
        const newDisplay = newVal !== undefined ? JSON.stringify(newVal).substring(0, 50) : 'null';
        changes.push(`${key}: ${oldDisplay} → ${newDisplay}`);
      }
    }
  }
  
  return changes.length > 0 ? changes.join('; ') : 'No changes detected';
};

// Main audit logging function
export const logAuditEvent = async ({
  userId,
  userEmail,
  userName,
  companyId,
  module,
  action,
  recordId = null,
  recordIdentifier = null,
  oldValues = null,
  newValues = null,
  status = 'success',
  errorMessage = null,
  metadata = null
}) => {
  try {
    const timestamp = new Date().toISOString();
    const userAgent = getUserAgent();
    
    // Generate tamper-detection hash
    const hashData = {
      userId,
      module,
      action,
      recordId,
      timestamp,
      newValues: newValues ? JSON.stringify(newValues) : null
    };
    const hash = await generateHash(hashData);
    
    // Generate changes summary for updates
    const changesSummary = action === 'UPDATE' ? getChangesSummary(oldValues, newValues) : null;
    
    const auditEntry = {
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      company_id: companyId,
      module,
      action,
      record_id: recordId,
      record_identifier: recordIdentifier,
      old_values: oldValues,
      new_values: newValues,
      changes_summary: changesSummary,
      ip_address: 'client-side', // Note: Real IP should be captured server-side
      user_agent: userAgent,
      status,
      error_message: errorMessage,
      metadata,
      hash
    };
    
    await supabase.entities.AuditLog.create(auditEntry);
    
    // Console log in development
    if (import.meta.env.DEV) {
      console.log('[AUDIT]', action, module, recordIdentifier || recordId, status);
    }
    
    return true;
  } catch (error) {
    // Don't throw - audit logging should not break main functionality
    console.error('[AUDIT ERROR]', error);
    return false;
  }
};

// Convenience methods for common actions
export const AuditService = {
  // CRUD Operations
  logCreate: async (user, companyId, module, recordId, recordIdentifier, newValues, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId,
      module,
      action: 'CREATE',
      recordId,
      recordIdentifier,
      newValues,
      metadata
    });
  },
  
  logUpdate: async (user, companyId, module, recordId, recordIdentifier, oldValues, newValues, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId,
      module,
      action: 'UPDATE',
      recordId,
      recordIdentifier,
      oldValues,
      newValues,
      metadata
    });
  },
  
  logDelete: async (user, companyId, module, recordId, recordIdentifier, oldValues, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId,
      module,
      action: 'DELETE',
      recordId,
      recordIdentifier,
      oldValues,
      metadata
    });
  },
  
  logStatusChange: async (user, companyId, module, recordId, recordIdentifier, oldStatus, newStatus, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId,
      module,
      action: 'STATUS_CHANGE',
      recordId,
      recordIdentifier,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      metadata
    });
  },
  
  // File Operations
  logUpload: async (user, companyId, module, recordId, recordIdentifier, fileInfo, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId,
      module,
      action: 'UPLOAD',
      recordId,
      recordIdentifier,
      newValues: fileInfo,
      metadata
    });
  },
  
  logDownload: async (user, companyId, module, recordId, recordIdentifier, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId,
      module,
      action: 'DOWNLOAD',
      recordId,
      recordIdentifier,
      metadata
    });
  },
  
  logExport: async (user, companyId, module, exportType, recordCount, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId,
      module,
      action: 'EXPORT',
      recordIdentifier: `${exportType} - ${recordCount} records`,
      metadata
    });
  },
  
  logImport: async (user, companyId, module, importType, recordCount, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId,
      module,
      action: 'IMPORT',
      recordIdentifier: `${importType} - ${recordCount} records`,
      metadata
    });
  },
  
  // Authentication Events
  logLogin: async (user, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId: user?.company_id,
      module: 'Authentication',
      action: 'LOGIN',
      metadata
    });
  },
  
  logLogout: async (user, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId: user?.company_id,
      module: 'Authentication',
      action: 'LOGOUT',
      metadata
    });
  },
  
  logLoginFailed: async (email, reason, metadata = null) => {
    return logAuditEvent({
      userId: 'unknown',
      userEmail: email,
      module: 'Authentication',
      action: 'LOGIN_FAILED',
      status: 'failure',
      errorMessage: reason,
      metadata
    });
  },
  
  logPermissionDenied: async (user, companyId, module, attemptedAction, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId,
      module,
      action: 'PERMISSION_DENIED',
      status: 'failure',
      errorMessage: `Attempted: ${attemptedAction}`,
      metadata
    });
  },
  
  // Communication Events
  logEmailSent: async (user, companyId, recipientEmail, subject, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId,
      module: 'System',
      action: 'EMAIL_SENT',
      recordIdentifier: `To: ${recipientEmail} - ${subject}`,
      metadata
    });
  },
  
  logSmsSent: async (user, companyId, recipientPhone, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId,
      module: 'System',
      action: 'SMS_SENT',
      recordIdentifier: `To: ${recipientPhone}`,
      metadata
    });
  },
  
  // Error Logging
  logError: async (user, companyId, module, errorMessage, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId,
      module,
      action: 'ERROR',
      status: 'failure',
      errorMessage,
      metadata
    });
  },
  
  // Generic view logging (for sensitive data access)
  logView: async (user, companyId, module, recordId, recordIdentifier, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId,
      module,
      action: 'VIEW',
      recordId,
      recordIdentifier,
      metadata
    });
  },
  
  // Payment logging
  logPayment: async (user, companyId, module, recordId, recordIdentifier, paymentDetails, metadata = null) => {
    return logAuditEvent({
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.full_name,
      companyId,
      module,
      action: 'PAYMENT',
      recordId,
      recordIdentifier,
      newValues: paymentDetails,
      metadata
    });
  }
};

export default AuditService;