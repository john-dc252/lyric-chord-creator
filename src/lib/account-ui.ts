import { createSignal } from 'solid-js';

/** Account / sign-in dialog visibility, so any page can open it. */
export const [isAccountDialogOpen, setAccountDialogOpen] = createSignal(false, {
  name: 'account_dialog_open',
});
