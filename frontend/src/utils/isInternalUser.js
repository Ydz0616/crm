const rawEmails = import.meta.env.VITE_INTERNAL_DASHBOARD_EMAILS || '';

const allowSet = new Set(
  rawEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export default function isInternalUser(currentAdmin) {
  if (!currentAdmin || !currentAdmin.email) return false;
  return allowSet.has(String(currentAdmin.email).toLowerCase());
}
