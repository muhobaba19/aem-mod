const { EmbedBuilder, WebhookClient, InteractionType } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Sadece uygulamalı slash komutlarını filtrele
    if (interaction.type !== InteractionType.ApplicationCommand) return;

    const command = client.slashCommands.get(interaction.commandName);
    if (!command) return;

    // --- Bütün Komutları Yakalayan Webhook Log Sistemi ---
    try {
      if (config.komutLogWebhook && config.komutLogWebhook !== "https://discord.com/api/webhooks/1507744014483587232/RIPo7ZoZYzxjUJJ-xyg8RYQ8bl9_Qq5CPFKtRK7lbmI9jq3r6wFFj28DFSo88_4lA73O") {
        const webhook = new WebhookClient({ url: config.komutLogWebhook });

        // Kullanılan komutun eğer varsa parametrelerini de metne ekleyelim kanka, tam gör ne yazıldığını
        let komutDetay = `/${interaction.commandName}`;
        const secenekler = interaction.options.data;
        if (secenekler.length > 0) {
          const parametreler = secenekler.map(opt => `${opt.name}:${opt.value}`).join(' ');
          komutDetay += ` ${parametreler}`;
        }

        const logEmbed = new EmbedBuilder()
          .setTitle('🚨 Bot Komut Log Sistemi')
          .setColor(0xff0000) // İstediğin gibi tam kırmızı
          .addFields(
            { name: '👤 Yetkili:', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
            { name: '🆔 Yetkili ID:', value: `\`${interaction.user.id}\``, inline: true },
            { name: '💻 Kullandığı Komut:', value: `\`${komutDetay}\``, inline: false },
            { name: '🏰 Sunucu Adı:', value: `\`${interaction.guild ? interaction.guild.name : 'Direkt Mesaj (DM)'}\``, inline: true },
            { name: '📺 Kanal:', value: interaction.channel ? `<#${interaction.channel.id}> (\`${interaction.channel.name}\`)` : '`DM Kanalı`', inline: true }
          )
          .setTimestamp();

        await webhook.send({ embeds: [logEmbed] });
      }
    } catch (err) {
      console.error('Komut log webhook gönderimi sırasında hata oluştu:', err);
    }
    // ----------------------------------------------------

    // Komutun asıl işlevini yerine getiren standart Discord.js yürütücüsü
    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ Komut çalıştırılırken bir hata oluştu!', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Komut çalıştırılırken bir hata oluştu!', ephemeral: true });
      }
    }
  },
};