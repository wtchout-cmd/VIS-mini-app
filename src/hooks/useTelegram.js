/**
 * useTelegram — access Telegram Mini App context safely.
 * Works in both Telegram and regular browser (for dev/testing).
 */

// Client mapping — mirrors what's in n8n Code in JavaScript1
const CLIENT_MAP = {
  5533782068: 'ClientA',
  8461621547: 'ClientB',
};

export const useTelegram = () => {
  const tg = window.Telegram?.WebApp ?? null;
  const user = tg?.initDataUnsafe?.user ?? null;
  const userId = user?.id ?? null;

  return {
    tg,
    user,
    userId,
    username: user?.username ?? user?.first_name ?? 'dispatch',
    clientPrefix: CLIENT_MAP[userId] ?? 'defaultClient',
    initData: tg?.initData ?? '',
    isInTelegram: !!tg,

    /** Call once on app mount */
    init: () => {
      if (!tg) return;
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#0f1419');
      tg.setBackgroundColor('#0f1419');
    },

    /** Haptic feedback helpers */
    haptic: {
      light: () => tg?.HapticFeedback?.impactOccurred('light'),
      medium: () => tg?.HapticFeedback?.impactOccurred('medium'),
      success: () => tg?.HapticFeedback?.notificationOccurred('success'),
      error: () => tg?.HapticFeedback?.notificationOccurred('error'),
    },
  };
};
