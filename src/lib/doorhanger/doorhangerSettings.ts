export type DoorhangerLayout = 'card' | 'topRow';
export type DoorhangerGravity = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export const DOORHANGER_LAYOUTS: readonly DoorhangerLayout[] = ['card', 'topRow'] as const;
export const DOORHANGER_GRAVITIES: readonly DoorhangerGravity[] = [
    'top-right',
    'top-left',
    'bottom-right',
    'bottom-left'
] as const;

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

export const isDoorhangerLayout = (value: unknown): value is DoorhangerLayout => {
    return typeof value === 'string' && (DOORHANGER_LAYOUTS as readonly string[]).includes(value);
};

export const isDoorhangerGravity = (value: unknown): value is DoorhangerGravity => {
    return typeof value === 'string' && (DOORHANGER_GRAVITIES as readonly string[]).includes(value);
};

export const normalizeDoorhangerSettings = (
    layout: unknown,
    gravity: unknown
): DoorhangerSettings => {
    return {
        layout: isDoorhangerLayout(layout) ? layout : DEFAULT_DOORHANGER_LAYOUT,
        gravity: isDoorhangerGravity(gravity) ? gravity : DEFAULT_DOORHANGER_GRAVITY
    };
};
