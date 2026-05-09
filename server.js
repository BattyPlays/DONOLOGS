const express = require('express');
const { createCanvas, loadImage } = require('canvas');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1501968054995914754/HtrKcH8g_z_6AzoyUTWE9BhjVY45F5YgYVpTNczeCKdWpS8r3iWo6NBA_-PrRj0iY2rv";

app.use(express.json({ limit: '10mb' }));

function formatNumber(num) {
    num = parseInt(num) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function getStatus(amount) {
    amount = parseInt(amount) || 0;
    if (amount >= 10000000) return "A Starfall!?!?!!";
    if (amount >= 1000000) return "A Smite?!!";
    if (amount >= 100000) return "A Nuke?!";
    if (amount >= 10000) return "A Blimp!";
    if (amount >= 5000) return "A Biplane?!";
    return "Donation";
}

function getColor(amount) {
    amount = parseInt(amount) || 0;
    if (amount >= 10000000) return '#FF4DFB';
    if (amount >= 1000000) return '#0084FF';
    if (amount >= 100000) return '#F80000';
    if (amount >= 10000) return '#00E6FF';
    if (amount >= 5000) return '#0E6FF';
    return '#00FF47';
}

app.post('/donation', async (req, res) => {
    console.log('Received donation:', req.body);
    
    try {
        const { donatorUsername, donatorImage, raiserUsername, raiserImage, amount } = req.body;
        
        if (!donatorUsername || !raiserUsername || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext('2d');

        // Background
        const gradient = ctx.createLinearGradient(0, 0, 800, 400);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 400);

        // Border
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

        // Avatars
        try {
            const donatorAvatar = await loadImage(donatorImage || 'https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/420/420/Hat/Png');
            const receiverAvatar = await loadImage(raiserImage || 'https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/420/420/Hat/Png');

            ctx.save();
            ctx.beginPath();
            ctx.arc(200, 250, 60, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(donatorAvatar, 140, 190, 120, 120);
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            ctx.arc(600, 250, 60, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(receiverAvatar, 540, 190, 120, 120);
            ctx.restore();
        } catch (e) {
            console.log('Avatar load error:', e.message);
        }

        // Arrow
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px Arial';
        ctx.fillText('→', 400, 260);

        // Usernames
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText('@' + donatorUsername, 200, 340);
        ctx.fillText('@' + raiserUsername, 600, 340);

        const buffer = canvas.toBuffer('image/png');

        // Send to Discord
        const form = new FormData();
        form.append('file', buffer, { filename: 'donation.png', contentType: 'image/png' });
        form.append('payload_json', JSON.stringify({
            content: `**${donatorUsername}** donated **${formatNumber(amount)} R$** to **${raiserUsername}**!`
        }));

        const discordRes = await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        if (discordRes.ok) {
            console.log('Sent to Discord!');
            res.json({ success: true });
        } else {
            const errText = await discordRes.text();
            console.log('Discord error:', errText);
            res.json({ success: false, error: errText });
        }

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => res.send('Donation Image Server Running!'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
