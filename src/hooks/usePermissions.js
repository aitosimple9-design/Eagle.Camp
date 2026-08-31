import { useMemo } from 'react';
import { getCurrentUserTitle, getAllowedRoles, getAllowedTabs, getDefaultRole, isRoleAllowed } from '../logic/permissions.js';

export function usePermissions() {
  const userTitle = getCurrentUserTitle();
  const allowedRoles = useMemo(() => getAllowedRoles(userTitle), [userTitle]);
  const allowedTabs = useMemo(() => getAllowedTabs(userTitle), [userTitle]);
  const defaultRole = useMemo(() => getDefaultRole(userTitle), [userTitle]);

  return {
    userTitle,
    allowedRoles,
    allowedTabs,
    defaultRole,
    isRoleAllowed: (role) => isRoleAllowed(userTitle, role)
  };
}
