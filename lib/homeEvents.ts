type CollapseCallback = () => void;
let _callback: CollapseCallback | null = null;

export const homeEvents = {
  register: (cb: CollapseCallback) => { _callback = cb; },
  unregister: () => { _callback = null; },
  collapse: () => { _callback?.(); },
};
