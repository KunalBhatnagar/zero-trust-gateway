// gateway/src/utils/alert.js

async function sendSlackAlert({ type, severity, ip, clientId }) {
  if (!process.env.SLACK_WEBHOOK_URL) return; // skip if not configured

  const emoji = { CRITICAL: '🚨', HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' };

  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `${emoji[severity]} *Threat Detected*`,
      blocks: [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Type:* ${type}\n*Severity:* ${severity}\n*IP:* ${ip}\n*Client:* ${clientId}`
        }
      }]
    })
  });
}

export { sendSlackAlert };