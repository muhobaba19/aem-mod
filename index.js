const { Client, GatewayIntentBits, Collection } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const app = express();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Express 7/24 Aktiflik Alanı (Uptime Robot İçin)
app.get('/', (req, res) => res.send('👮 Ankara Emniyet Botu 7/24 Aktif!'));
app.listen(process.env.PORT || 3000, () => console.log(`🌐 Web sunucusu hazır.`));

// Koleksiyonları Tanımlıyoruz kanka
client.slashCommands = new Collection();
client.prefixCommands = new Collection();
global.whitelistRoles = new Set();
global.istismarTakip = new Map();

// 1. SLASH COMMANDS HANDLER
const slashPath = path.join(__dirname, 'commands', 'slash');
const slashFiles = fs.readdirSync(slashPath).filter(file => file.endsWith('.js'));
for (const file of slashFiles) {
  const command = require(path.join(slashPath, file));
  client.slashCommands.set(command.data.name, command);
}

// 2. PREFIX COMMANDS HANDLER
const prefixPath = path.join(__dirname, 'commands', 'prefix');
if (fs.existsSync(prefixPath)) {
  const prefixFiles = fs.readdirSync(prefixPath).filter(file => file.endsWith('.js'));
  for (const file of prefixFiles) {
    const command = require(path.join(prefixPath, file));
    client.prefixCommands.set(command.name, command);
  }
}

// 3. EVENTS HANDLER
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Eski tip prefixli mesaj dinleyicisi (İleride ekleyeceğin ünlemli komutlar için alt yapı)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(config.prefix)) return;
  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = client.prefixCommands.get(commandName);
  if (command) command.execute(message, args, client);
});

client.login(config.token);