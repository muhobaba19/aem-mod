const { REST, Routes, ActivityType } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const config = require('../config.json');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`👮 ${client.user.tag} Handler sistemiyle göreve başladı!`);
    
    // 1. Durum Mesajı Ayarlama (İsteğe Bağlı - Botun boş durmaması için)
    client.user.setActivity('AEM Moderasyon Sistemi', { type: ActivityType.Watching });

    // 2. Senin Orijinal Slash Komut Senkronizasyon Altyapın
    const rest = new REST({ version: '10' }).setToken(config.token);
    try {
      const commandsBody = client.slashCommands.map(cmd => cmd.data.toJSON());
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.anaSunucuId),
        { body: commandsBody }
      );
      console.log('⚡ Tüm slash komutları ana sunucuya senkronize edildi kanka.');
    } catch (error) {
      console.error('Slash komutlar yüklenirken hata oluştu:', error);
    }

    // 3. İstediğin Otomatik Ses Kanalı Bağlantısı ve Çökme Koruması
    const sesKanalId = "1504644626244440104";

    try {
      const guild = client.guilds.cache.get(config.anaSunucuId);
      if (!guild) {
        console.log("⚠️ Otomatik ses bağlantısı başarısız: Ana sunucu bulunamadı.");
        return;
      }

      const sesKanali = guild.channels.cache.get(sesKanalId);
      if (!sesKanali) {
        console.log("⚠️ Otomatik ses bağlantısı başarısız: Belirtilen ses kanalı bulunamadı.");
        return;
      }

      // Ses kanalına bağlantıyı kuruyoruz
      joinVoiceChannel({
        channelId: sesKanali.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfMute: false, // Botun mikrofonu açık kalsın
        selfDeaf: true   // Bot sunucudaki sesleri dinleyip işlemciyi yormasın (Sağırlaştırma)
      });

      console.log(`🔊 Bot, "${guild.name}" sunucusundaki [${sesKanali.name}] ses kanalına başarıyla giriş yaptı.`);

    } catch (err) {
      // Python veya harici kütüphane eksikliklerinde botun tamamen kapanmasını önleyen emniyet kilidi
      console.error("🚨 Ses kanalına bağlanırken teknik bir sorun oluştu fakat botun çökmesi engellendi:", err.message);
    }

    // 4. Giriş İstihbaratı Davet Kodlarını Hafızaya Alma Motoru
    try {
      const memberAddEvent = require('./guildMemberAdd');
      if (memberAddEvent && typeof memberAddEvent.cacheInvites === 'function') {
        await memberAddEvent.cacheInvites(client);
        console.log("🔗 Giriş istihbaratı için mevcut davet kodları hafızaya alındı.");
      }
    } catch (e) {
      // Dosya henüz tam entegre edilmediyse sistemin durmaması için boş geçilir
    }
  },
};