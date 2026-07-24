export type DoorhangerLayout = 'card' | 'topRow';
export type DoorhangerGravity = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export const DEFAULT_DOORHANGER_LAYOUT: DoorhangerLayout = 'card';
export const DEFAULT_DOORHANGER_GRAVITY: DoorhangerGravity = 'top-right';

export type DoorhangerSettings = {
    layout: DoorhangerLayout;
    gravity: DoorhangerGravity;
};

export const DEFAULT_DOORHANGER_SETTINGS: DoorhangerSettings = {
    layout: DEFAULT_DOORHANGER_LAYOUT,
    gravity: DEFAULT_DOORHANGER_GRAVITY
};
