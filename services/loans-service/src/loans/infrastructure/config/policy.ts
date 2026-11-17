import { DEFAULT_LOAN_POLICY, LoanPolicy } from '../../domain/loan-policy';

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

/** Construye el reglamento a partir de variables de entorno (docker-compose / .env). */
export function loanPolicyFromEnv(env: NodeJS.ProcessEnv = process.env): LoanPolicy {
  const d = DEFAULT_LOAN_POLICY;
  const staffDays = num(env.LOAN_DAYS_STAFF, d.loanDays.LIBRARIAN);
  return {
    loanDays: { STUDENT: num(env.LOAN_DAYS_STUDENT, d.loanDays.STUDENT), LIBRARIAN: staffDays, ADMIN: staffDays },
    maxActiveLoans: {
      STUDENT: num(env.MAX_ACTIVE_LOANS_STUDENT, d.maxActiveLoans.STUDENT),
      LIBRARIAN: d.maxActiveLoans.LIBRARIAN,
      ADMIN: d.maxActiveLoans.ADMIN,
    },
    maxRenewals: num(env.MAX_RENEWALS, d.maxRenewals),
    renewalDays: num(env.RENEWAL_DAYS, d.renewalDays),
    dailyFine: num(env.DAILY_FINE, d.dailyFine),
    maxFinePerLoan: num(env.MAX_FINE_PER_LOAN, d.maxFinePerLoan),
    currency: env.CURRENCY ?? d.currency,
  };
}
