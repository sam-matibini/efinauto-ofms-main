import { payrollRules, roundMoney } from "./canadianTaxSchedule.js";

const PERIODS = {
  weekly: 52,
  bi_weekly: 26,
  semi_monthly: 24,
  monthly: 12,
};

export function payPeriods(frequency) {
  return PERIODS[frequency] || 26;
}

function taxOn(income, brackets) {
  let tax = 0;
  let previous = 0;
  for (const bracket of brackets) {
    if (income <= previous) break;
    const slice = Math.min(income, bracket.limit) - previous;
    tax += slice * bracket.rate;
    previous = bracket.limit;
  }
  return tax;
}

function basicAmount(personal, income) {
  if (!personal?.reduced || income <= personal.from) return personal.amount;
  if (income >= personal.to) return personal.reduced;
  const ratio = (income - personal.from) / (personal.to - personal.from);
  return personal.amount - (personal.amount - personal.reduced) * ratio;
}

function cappedContribution(gross, ytdGross, ytdPaid, periods, rules) {
  const exemption = (rules.basicExemption || 0) / periods;
  const pensionable = Math.max(0, gross - exemption);
  const earningsRoom = Math.max(0, rules.ympe - ytdGross);
  const raw = roundMoney(Math.min(pensionable, earningsRoom) * rules.rate);
  const room = Math.max(0, roundMoney(rules.maxEmployee - ytdPaid));
  return Math.min(raw, room);
}

function secondContribution(gross, ytdGross, ytdBasePaid, rules) {
  const start = Math.max(ytdGross, rules.ympe);
  const end = Math.min(ytdGross + gross, rules.yampe);
  const raw = roundMoney(Math.max(0, end - start) * rules.cpp2Rate);
  const already = Math.max(0, ytdBasePaid - rules.maxEmployee);
  const room = Math.max(0, roundMoney(rules.cpp2Max - already));
  return Math.min(raw, room);
}

function cappedPremium(gross, ytdGross, ytdPaid, rules) {
  const start = Math.min(ytdGross, rules.maxInsurable);
  const end = Math.min(ytdGross + gross, rules.maxInsurable);
  const raw = roundMoney(Math.max(0, end - start) * rules.employeeRate);
  const room = Math.max(0, roundMoney(rules.maxEmployee - ytdPaid));
  return Math.min(raw, room);
}

export function calculatePayrollDeductions({
  grossPay = 0,
  payFrequency = "bi_weekly",
  province = "ON",
  ytdGross = 0,
  ytdCpp = 0,
  ytdEi = 0,
  ytdQpip = 0,
  cppExempt = false,
  eiExempt = false,
  federalClaim,
  provincialClaim,
  asOf = new Date(),
} = {}) {
  const rules = payrollRules(asOf);
  const periods = payPeriods(payFrequency);
  const code = BRACKET_CODES.has(province) ? province : "ON";
  const gross = roundMoney(grossPay);
  const pensionRules = code === "QC" ? rules.qpp : rules.cpp;
  const eiRules = code === "QC" ? rules.eiQuebec : rules.ei;

  const cppBase = cppExempt ? 0 : cappedContribution(gross, ytdGross, ytdCpp, periods, pensionRules);
  const cppExtra = cppExempt ? 0 : secondContribution(gross, ytdGross, ytdCpp, pensionRules);
  const cppEmployee = roundMoney(cppBase + cppExtra);
  const eiEmployee = eiExempt ? 0 : cappedPremium(gross, ytdGross, ytdEi, eiRules);
  const qpipEmployee = code === "QC" && !eiExempt
    ? cappedPremium(gross, ytdGross, ytdQpip, rules.qpip)
    : 0;

  const annualGross = roundMoney(gross * periods);
  const annualCpp = Math.min(
    pensionRules.maxEmployee + pensionRules.cpp2Max,
    roundMoney(Math.max(0, Math.min(annualGross, pensionRules.ympe) - pensionRules.basicExemption) * pensionRules.rate)
      + roundMoney(Math.max(0, Math.min(annualGross, pensionRules.yampe) - pensionRules.ympe) * pensionRules.cpp2Rate)
  );
  const annualEi = Math.min(eiRules.maxEmployee, roundMoney(annualGross * eiRules.employeeRate));
  const annualQpip = code === "QC" ? Math.min(rules.qpip.maxEmployee, roundMoney(annualGross * rules.qpip.employeeRate)) : 0;
  const annualIncome = Math.max(0, roundMoney(annualGross - (cppExempt ? 0 : annualCpp) - (eiExempt ? 0 : annualEi + annualQpip)));

  const federalPersonal = rules.personal.federal;
  const federalClaimAmount = federalClaim > 0 ? federalClaim : basicAmount(federalPersonal, annualIncome);
  let federalAnnual = Math.max(0, taxOn(annualIncome, rules.brackets.federal) - federalClaimAmount * rules.brackets.federal[0].rate);
  if (code === "QC") federalAnnual *= 1 - rules.federalAbatement;
  const federalTax = roundMoney(federalAnnual / periods);

  const provincialPersonal = rules.personal[code];
  const provincialClaimAmount = provincialClaim > 0 ? provincialClaim : provincialPersonal.amount;
  let provincialAnnual = Math.max(
    0,
    taxOn(annualIncome, rules.brackets[code]) - provincialClaimAmount * rules.brackets[code][0].rate
  );
  if (code === "ON") {
    const basic = provincialAnnual;
    let surtax = 0;
    for (const step of rules.ontarioSurtax) {
      if (basic > step.over) surtax += (basic - step.over) * step.rate;
    }
    provincialAnnual = basic + surtax;
  }
  const provincialTax = roundMoney(provincialAnnual / periods);
  const totalDeductions = roundMoney(cppEmployee + eiEmployee + qpipEmployee + federalTax + provincialTax);

  return {
    province: code,
    taxYear: rules.taxYear,
    cppEmployee,
    cppEmployer: cppEmployee,
    eiEmployee,
    eiEmployer: roundMoney(eiEmployee * (eiRules.employerRate / eiRules.employeeRate)),
    qpipEmployee,
    qpipEmployer: code === "QC" ? roundMoney(qpipEmployee * (rules.qpip.employerRate / rules.qpip.employeeRate)) : 0,
    federalTax,
    provincialTax,
    totalDeductions,
    netPay: roundMoney(gross - totalDeductions),
  };
}

const BRACKET_CODES = new Set(Object.keys(payrollRules(new Date("2026-01-01")).brackets));
