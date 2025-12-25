import { base44 } from "@/api/base44Client";

/**
 * Calculate comprehensive compliance score for carrier
 */
export async function calculateComplianceScore(carrier) {
  const documents = carrier.compliance_documents || [];
  const checklist = carrier.compliance_checklist || {};
  
  // 1. Document Completeness (25 points)
  const requiredDocs = ['insurance_certificate', 'operating_authority', 'safety_rating', 'business_license', 'w9_form', 'carrier_agreement'];
  const uploadedDocTypes = documents.map(d => d.document_type.toLowerCase().replace(/\s+/g, '_'));
  const completenessScore = (uploadedDocTypes.filter(type => 
    requiredDocs.some(req => type.includes(req) || req.includes(type))
  ).length / requiredDocs.length) * 25;

  // 2. Document Validity & Verification (25 points)
  const verifiedDocs = documents.filter(d => d.verified).length;
  const validityScore = documents.length > 0 ? (verifiedDocs / documents.length) * 25 : 0;

  // 3. AI Confidence Average (25 points)
  const docsWithAI = documents.filter(d => d.ai_analysis?.confidence_score);
  const avgConfidence = docsWithAI.length > 0
    ? docsWithAI.reduce((sum, d) => sum + d.ai_analysis.confidence_score, 0) / docsWithAI.length
    : 0;
  const aiScore = avgConfidence * 25;

  // 4. Expiry Status (25 points)
  const now = new Date();
  let expiryScore = 25;
  const expiryAlerts = [];

  documents.forEach(doc => {
    if (doc.expiry_date) {
      const expiryDate = new Date(doc.expiry_date);
      const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        expiryScore -= 5; // Expired document
        expiryAlerts.push({
          document_type: doc.document_type,
          expiry_date: doc.expiry_date,
          days_until_expiry: daysUntilExpiry,
          alert_sent: false
        });
      } else if (daysUntilExpiry <= 30) {
        expiryScore -= 2; // Expiring soon
        expiryAlerts.push({
          document_type: doc.document_type,
          expiry_date: doc.expiry_date,
          days_until_expiry: daysUntilExpiry,
          alert_sent: false
        });
      }
    }
  });

  const totalScore = Math.max(0, Math.min(100, 
    completenessScore + validityScore + aiScore + Math.max(0, expiryScore)
  ));

  // Auto-approval eligibility: score >= 80 and all critical docs verified
  const autoApprovalEligible = totalScore >= 80 && verifiedDocs >= requiredDocs.length;

  return {
    compliance_score: Math.round(totalScore),
    compliance_score_breakdown: {
      document_completeness: Math.round(completenessScore),
      document_validity: Math.round(validityScore),
      ai_confidence: Math.round(aiScore),
      expiry_status: Math.round(Math.max(0, expiryScore)),
      last_calculated: new Date().toISOString()
    },
    auto_approval_eligible: autoApprovalEligible,
    expiry_alerts: expiryAlerts
  };
}

/**
 * Send expiry alerts for carrier documents
 */
export async function sendExpiryAlerts(carrier) {
  const alerts = carrier.expiry_alerts || [];
  const unseenAlerts = alerts.filter(a => !a.alert_sent);

  if (unseenAlerts.length === 0) return;

  const alertMessage = `
🚨 CARRIER DOCUMENT EXPIRY ALERT

Carrier: ${carrier.carrier_name}
Code: ${carrier.carrier_code}

Documents Requiring Attention:
${unseenAlerts.map(a => `
  • ${a.document_type}
    Expires: ${new Date(a.expiry_date).toLocaleDateString()}
    ${a.days_until_expiry < 0 ? '⚠️ EXPIRED' : `⏰ ${a.days_until_expiry} days remaining`}
`).join('\n')}

Action Required: Contact carrier to request updated documentation.

Carrier Contact: ${carrier.contact_phone}
Email: ${carrier.contact_email || 'N/A'}
`;

  try {
    // Get company contacts
    const company = await base44.entities.Company.filter({ id: carrier.company_id });
    const recipients = company[0]?.notification_settings?.notification_recipients || [];
    
    if (recipients.length > 0) {
      await base44.integrations.Core.SendEmail({
        to: recipients[0],
        subject: `⚠️ Carrier Document Expiry Alert - ${carrier.carrier_name}`,
        body: alertMessage
      });
    }

    // Mark alerts as sent
    const updatedAlerts = alerts.map(a => 
      unseenAlerts.find(ua => ua.document_type === a.document_type)
        ? { ...a, alert_sent: true, alert_sent_at: new Date().toISOString() }
        : a
    );

    await base44.entities.ThirdPartyCarrier.update(carrier.id, {
      expiry_alerts: updatedAlerts
    });
  } catch (error) {
    console.error('Failed to send expiry alerts:', error);
  }
}

/**
 * Update carrier compliance score and handle auto-approval
 */
export async function updateCarrierCompliance(carrierId) {
  const carriers = await base44.entities.ThirdPartyCarrier.filter({ id: carrierId });
  if (carriers.length === 0) return null;

  const carrier = carriers[0];
  const scoring = await calculateComplianceScore(carrier);

  const updates = {
    compliance_score: scoring.compliance_score,
    compliance_score_breakdown: scoring.compliance_score_breakdown,
    auto_approval_eligible: scoring.auto_approval_eligible,
    expiry_alerts: scoring.expiry_alerts
  };

  // Auto-approve if eligible and in review status
  if (scoring.auto_approval_eligible && carrier.onboarding_status === 'review') {
    updates.onboarding_status = 'approved';
    updates.approved_by = 'AI Auto-Approval System';
    updates.approved_at = new Date().toISOString();
    updates.status = 'active';
    updates.onboarding_completed_at = new Date().toISOString();
  }

  await base44.entities.ThirdPartyCarrier.update(carrierId, updates);

  // Send expiry alerts if needed
  if (scoring.expiry_alerts.length > 0) {
    await sendExpiryAlerts({ ...carrier, ...updates });
  }

  return { ...carrier, ...updates };
}