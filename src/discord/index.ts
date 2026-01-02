/**
 * Discord webhook notifications
 * Sends post summaries to Discord channel
 */

export interface DiscordEmbed {
  title: string;
  description: string;
  url?: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  thumbnail?: { url: string };
  footer?: { text: string };
  timestamp?: string;
}

export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
}

/**
 * Send a message to Discord via webhook
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  message: DiscordMessage
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      console.error(`Discord webhook failed: ${res.status} ${res.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Discord webhook error:', error);
    return false;
  }
}

/**
 * Send a new post notification to Discord
 */
export async function notifyNewPost(
  webhookUrl: string,
  post: {
    title: string;
    excerpt: string;
    url: string;
    source: string;
    slot: string;
    imageUrl?: string;
  }
): Promise<boolean> {
  const slotEmojis: Record<string, string> = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌙',
  };

  const embed: DiscordEmbed = {
    title: `📰 ${post.title}`,
    description: post.excerpt.slice(0, 300) + (post.excerpt.length > 300 ? '...' : ''),
    url: post.url,
    color: 0x4ade80, // Green color
    fields: [
      {
        name: 'Source',
        value: post.source,
        inline: true,
      },
      {
        name: 'Slot',
        value: `${slotEmojis[post.slot] || '📅'} ${post.slot.charAt(0).toUpperCase() + post.slot.slice(1)}`,
        inline: true,
      },
    ],
    footer: {
      text: '🌟 Happy News Scheduler',
    },
    timestamp: new Date().toISOString(),
  };

  if (post.imageUrl) {
    embed.thumbnail = { url: post.imageUrl };
  }

  const message: DiscordMessage = {
    content: '**New Happy News Published!** 🎉',
    embeds: [embed],
  };

  return sendDiscordWebhook(webhookUrl, message);
}

/**
 * Send an error notification to Discord
 */
export async function notifyError(
  webhookUrl: string,
  error: {
    slot: string;
    message: string;
    articleTitle?: string;
  }
): Promise<boolean> {
  const embed: DiscordEmbed = {
    title: '⚠️ Publishing Error',
    description: error.message,
    color: 0xef4444, // Red color
    fields: [
      {
        name: 'Slot',
        value: error.slot,
        inline: true,
      },
    ],
    footer: {
      text: '🌟 Happy News Scheduler',
    },
    timestamp: new Date().toISOString(),
  };

  if (error.articleTitle) {
    embed.fields?.push({
      name: 'Article',
      value: error.articleTitle,
      inline: true,
    });
  }

  const message: DiscordMessage = {
    embeds: [embed],
  };

  return sendDiscordWebhook(webhookUrl, message);
}
