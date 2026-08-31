export const GROUP_ROLES = {
  FC: ['FC', 'StarFC'],
  SL: ['GSL', 'SSL', 'ESL'],
  SM: ['SM', 'EM', 'ERM', 'IRM']
};

export function isFC(role) {
  return GROUP_ROLES.FC.includes(role);
}

export function isSL(role) {
  return GROUP_ROLES.SL.includes(role);
}

export function isSM(role) {
  return GROUP_ROLES.SM.includes(role);
}

export function getGroup(role) {
  if (isFC(role)) return 'FC';
  if (isSL(role)) return 'SL';
  if (isSM(role)) return 'SM';
  return 'FC'; // Fallback
}

export function getGroupClass(role) {
  const group = getGroup(role);
  if (group === 'FC') return 'theme-fc';
  if (group === 'SL') return 'theme-sl';
  if (group === 'SM') return 'theme-sm';
  return 'theme-fc';
}
