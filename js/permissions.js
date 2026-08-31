// js/permissions.js
export const ROLE_PERMISSIONS = {
  'FC': ['FC', 'StarFC'],
  'StarFC': ['FC', 'StarFC'],
  'GSL': ['GSL'],
  'SSL': ['SSL'],
  'ESL': ['ESL'],
  'SM': ['SM'],
  'EM': ['EM'],
  'ERM': ['ERM'],
  'IRM': ['IRM']
};

export const ROLE_TO_TAB = {
  'FC': 'agent',
  'StarFC': 'agent',
  'GSL': 'sl',
  'SSL': 'sl',
  'ESL': 'sl',
  'SM': 'sm',
  'EM': 'sm',
  'ERM': 'sm',
  'IRM': 'sm'
};

export const PLACEHOLDER_USER_TITLE = 'FC';

// TODO: Thay bằng Supabase session sau này
export function getCurrentUserTitle() {
  const urlParams = new URLSearchParams(window.location.search);
  const debugTitle = urlParams.get('debugTitle');
  return debugTitle || PLACEHOLDER_USER_TITLE;
}

export function getAllowedRoles(userTitle) {
  return ROLE_PERMISSIONS[userTitle] || [];
}

export function getAllowedTabs(userTitle) {
  const allowedRoles = getAllowedRoles(userTitle);
  const tabs = new Set(allowedRoles.map(role => ROLE_TO_TAB[role]));
  return Array.from(tabs);
}

export function getDefaultRole(userTitle) {
  const allowedRoles = getAllowedRoles(userTitle);
  return allowedRoles.length > 0 ? allowedRoles[0] : PLACEHOLDER_USER_TITLE;
}

export function isRoleAllowed(userTitle, role) {
  const allowedRoles = getAllowedRoles(userTitle);
  return allowedRoles.includes(role);
}
