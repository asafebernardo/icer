/** Posicionamento partilhado dos FABs mobile (acima da bottom nav). */
export const MOBILE_FAB_RIGHT =
  "right-[max(1rem,env(safe-area-inset-right,0px))]";

/** Literais fixos — o Tailwind só inclui classes escritas por completo no código. */
export const MOBILE_FAB_BOTTOM = {
  0: "bottom-[calc(8.5rem+env(safe-area-inset-bottom,0px))]",
  1: "bottom-[calc(8.5rem+3.75rem+env(safe-area-inset-bottom,0px))]",
  2: "bottom-[calc(8.5rem+7.5rem+env(safe-area-inset-bottom,0px))]",
};

/** @param {number} stackSlot 0 = contacto, 1 = editar, 2 = sessão */
export function mobileFabBottomClass(stackSlot) {
  return MOBILE_FAB_BOTTOM[stackSlot] ?? MOBILE_FAB_BOTTOM[0];
}

/** @param {{ hasContactFab: boolean, isAdmin: boolean }} opts */
export function getMobileEditFabSlot({ hasContactFab, isAdmin }) {
  if (!isAdmin) return null;
  return hasContactFab ? 1 : 0;
}

/** @param {{ hasContactFab: boolean, isAdmin: boolean }} opts */
export function getMobileSessionFabSlot({ hasContactFab, isAdmin }) {
  const editSlot = getMobileEditFabSlot({ hasContactFab, isAdmin });
  if (editSlot != null) return editSlot + 1;
  return hasContactFab ? 1 : 0;
}

export const MOBILE_FAB_BUTTON_CLASS =
  "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:hidden border backdrop-blur-md shadow-md shadow-black/10 ring-1 ring-black/5 transition-[transform,background-color,border-color] duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
