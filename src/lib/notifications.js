// Notification Manager for Browser Push & Webhooks (Discord / Telegram)

const STORAGE_KEY = 'infinity_notifications_cfg';

export function getNotificationConfig() {
  if (typeof window === 'undefined') return { browserEnabled: false, discordUrl: '', telegramBotToken: '', telegramChatId: '' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading notification config:', e);
  }
  return {
    browserEnabled: false,
    notifyOnFilamentChange: true,
    notifyOnPrintComplete: true,
    discordUrl: '',
    telegramBotToken: '',
    telegramChatId: ''
  };
}

export function saveNotificationConfig(cfg) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.warn('Error saving notification config:', e);
  }
}

/**
 * Request permission for native Browser/Phone notifications
 */
export async function requestBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Notification permission error:', err);
    return 'denied';
  }
}

/**
 * Send browser system notification
 */
export function sendBrowserNotification(title, body, icon = '/logo.png') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      body,
      icon,
      badge: icon,
      vibrate: [200, 100, 200]
    });
  } catch (err) {
    console.warn('Error displaying browser notification:', err);
  }
}

/**
 * Send Discord Webhook message
 */
export async function sendDiscordWebhook(url, title, description, color = 0x4f46e5) {
  if (!url || !url.startsWith('http')) return false;

  try {
    const payload = {
      username: 'Infinity Layers 3D',
      avatar_url: 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/printer.png',
      embeds: [
        {
          title: `🖨️ ${title}`,
          description,
          color,
          timestamp: new Date().toISOString(),
          footer: { text: 'Infinity Layers G-Code Streamer' }
        }
      ]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.warn('Discord webhook failed:', err);
    return false;
  }
}

/**
 * Send Telegram Bot message
 */
export async function sendTelegramMessage(botToken, chatId, text) {
  if (!botToken || !chatId) return false;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🖨️ *Infinity Layers 3D*\n\n${text}`,
        parse_mode: 'Markdown'
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('Telegram webhook failed:', err);
    return false;
  }
}

/**
 * High-level notification dispatcher
 */
export async function dispatchPrintNotification(type, details = {}) {
  const cfg = getNotificationConfig();

  let title = '';
  let body = '';
  let color = 0x10b981; // green default

  if (type === 'filament_change') {
    if (!cfg.notifyOnFilamentChange) return;
    title = '🔔 Filament Change Required!';
    body = `Print is paused at Z=${details.z || '?'}mm (Layer ${details.layer || '?'}). Please swap filament and resume.`;
    color = 0xf59e0b; // amber
  } else if (type === 'print_complete') {
    if (!cfg.notifyOnPrintComplete) return;
    title = '✅ Print Complete!';
    body = `File "${details.fileName || 'Job'}" finished successfully in ${details.elapsedTime || 'due time'}.`;
    color = 0x10b981; // green
  } else if (type === 'test') {
    title = '🔔 Test Notification';
    body = 'Infinity Layers notifications are configured and working properly!';
    color = 0x6366f1; // indigo
  }

  // 1. Browser Native / Mobile Push Notification
  if (cfg.browserEnabled && Notification.permission === 'granted') {
    sendBrowserNotification(title, body);
  }

  // 2. Discord Webhook
  if (cfg.discordUrl) {
    await sendDiscordWebhook(cfg.discordUrl, title, body, color);
  }

  // 3. Telegram Webhook
  if (cfg.telegramBotToken && cfg.telegramChatId) {
    await sendTelegramMessage(cfg.telegramBotToken, cfg.telegramChatId, `*${title}*\n${body}`);
  }
}
