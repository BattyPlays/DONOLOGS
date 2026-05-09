const express = require('express');
const { createCanvas, loadImage, registerFont } = require('canvas');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Discord Webhook URL
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1501968054995914754/HtrKcH8g_z_6AzoyUTWE9BhjVY45F5YgYVpTNczeCKdWpS8r3iWo6NBA_-PrRj0iY2rv";

app.use(express.json({ limit: '10mb' }));

// Helper to format numbers
function formatNumber(num) {
    num = parseInt(num) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Helper to get status text
function getStatus(amount) {
    amount = parseInt(amount) || 0;
    if (amount >= 10000000) return "A Starfall!?!?!!";
    if (amount >= 1000000) return "A Smite?!!";
    if (amount >= 100000) return "A Nuke?!";
    if (amount >= 10000) return "A Blimp!";
    if (amount >= 5000) return "A Biplane?!";
    return "Donation";
}

// Helper to get color based on amount
function getColor(amount) {
    amount = parseInt(amount) || 0;
    if (amount >= 10000000) return '#FF4DFB'; // Wings - Pink
    if (amount >= 1000000) return '#0084FF';   // Smite - Blue
    if (amount >= 100000) return '#F80000';   // Nuke - Red
    if (amount >= 10000) return '#00E6FF';    // Blimp - Cyan
    if (amount >= 5000) return '#0E6FF';      // Biplane
    return '#00FF47';                          // Normal - Green
}

app.post('/donation', async (req, res) => {
    console.log('Received donation request:', req.body);
    
    try {
        const { donatorUsername, donatorImage, raiserUsername, raiserImage, amount } = req.body;
        
        if (!donatorUsername || !raiserUsername || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create canvas (800x400 donation card)
        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext('2d');

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 800, 400);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 400);

        // Rounded border
        ctx.strokeStyle = getColor(amount);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(10, 10, 780, 380, 20);
        ctx.stroke();

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(getStatus(amount), 400, 50);

        // Amount
        ctx.fillStyle = getColor(amount);
        ctx.font = 'bold 48px Arial';
        ctx.fillText(formatNumber(amount) + ' R$', 400, 120);

        // Load and draw avatars
        try {
            const donatorAvatar = await loadImage(donatorImage || 'https://www.roblox.com/headshot-thumbnail/image?userId=1&width=150&height=150&format=png');
            const receiverAvatar = await loadImage(raiserImage || 'https://www.roblox.com/headshot-thumbnail/image?userId=1&width=150&height=150&format=png');

            // Donator avatar (left side)
            ctx.save();
            ctx.beginPath();
            ctx.arc(200, 250, 60, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(donatorAvatar, 140, 190, 120, 120);
            ctx.restore();

            // Receiver avatar (right side)
            ctx.save();
            ctx.beginPath();
            ctx.arc(600, 250, 60, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(receiverAvatar, 540, 190, 120, 120);
            ctx.restore();
        } catch (imgErr) {
            console.log('Could not load avatars, using placeholders');
        }

        // Arrow in middle
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px Arial';
        ctx.fillText('→', 400, 260);

        // Usernames
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('@' + donatorUsername, 200, 340);
        ctx.fillText('@' + raiserUsername, 600, 340);

        // Convert to buffer
        const buffer = canvas.toBuffer('image/png');

        // Send to Discord webhook
        const formData = new FormData();
        formData.append('file', new Blob([buffer], { type: 'image/png' }), 'donation.png');
        formData.append('payload_json', JSON.stringify({
            content: `**${donatorUsername}** donated **${formatNumber(amount)} R$** to **${raiserUsername}**!`
        }));

        const discordRes = await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            body: formData
        });

        if (discordRes.ok) {
            console.log('Successfully sent to Discord');
            res.json({ success: true, message: 'Donation card sent to Discord' });
        } else {
            console.log('Discord error:', await discordRes.text());
            res.json({ success: true, message: 'Image generated but Discord send failed' });
        }

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Donation Image Server is running!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});