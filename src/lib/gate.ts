/** Parts 1–2 of each course (units 1 and 2) are open to everyone; lessons and part tests from Part 3 on need an account. */
export const FREE_UNITS = [1, 2];
export const needsLogin = (unit: number | undefined) => unit !== undefined && !FREE_UNITS.includes(unit);
