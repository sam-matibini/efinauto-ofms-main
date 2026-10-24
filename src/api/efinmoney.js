import { supabase } from '@/api/supabaseClient';

async function call(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('efinmoney', {
    body: { action, ...payload },
  });
  if (error) throw error;
  if (data && data.success === false) {
    const err = new Error(data.error || 'efinmoney_error');
    err.code = data.code || data.error;
    err.raw = data;
    throw err;
  }
  return data?.data !== undefined ? data.data : data;
}

export const efinMoneyApi = {
  start: (companyId) => call('start', { company_id: companyId }),
  complete: (state, session_id, code) => call('complete', { state, session_id, code }),
  cancel: (state) => call('cancel', { state }),
  status: (companyId) => call('status', { company_id: companyId }),
  accounts: (companyId) => call('accounts', { company_id: companyId }),
  balances: (companyId) => call('balances', { company_id: companyId }),
  disconnect: (companyId) => call('disconnect', { company_id: companyId }),
};
