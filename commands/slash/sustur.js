const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sustur')
    .setDescription('Kullanıcıya belirtilen süre boyunca konuşma yasağı uygular.')
    .addUserOption(opt => opt.setName('hedef').setDescription('Susturulacak kişi').setRequired(true))
    .addStringOption(opt => opt.setName('sure').setDescription('Örnek: 1 saat 30 dakika / 45 saniye').setRequired(true))
    .addStringOption(opt => opt.setName('sebep').setDescription('Gerekçe').setRequired(false)),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Üyeleri zamanaşımına uğratma yetkiniz bulunmuyor.', ephemeral: true });
    }

    const member = interaction.options.getMember('hedef');
    if (!member) {
      return interaction.reply({ content: '❌ Belirtilen kullanıcı bu sunucuda bulunamadı.', ephemeral: true });
    }

    const sureMetni = interaction.options.getString('sure').toLowerCase();
    const sebep = interaction.options.getString('sebep') || 'Gerekçe belirtilmedi.';

    let toplamMilisaniye = 0;
    const regex = /(\d+)\s*(saat|dakika|saniye|gün)/g;
    let match;
    let gecersizSure = true;

    while ((match = regex.exec(sureMetni)) !== null) {
      gecersizSure = false;
      const miktar = parseInt(match[1]);
      const birim = match[2];

      if (birim === 'gün') toplamMilisaniye += miktar * 24 * 60 * 60 * 1000;
      else if (birim === 'saat') toplamMilisaniye += miktar * 60 * 60 * 1000;
      else if (birim === 'dakika') toplamMilisaniye += miktar * 60 * 1000;
      else if (birim === 'saniye') toplamMilisaniye += miktar * 1000;
    }

    if (gecersizSure || toplamMilisaniye <= 0) {
      return interaction.reply({ content: '❌ Geçersiz zaman biçimi. Örnek kullanım: `1 saat 15 dakika` veya `30 saniye`', ephemeral: true });
    }

    // Kullanıcıya DM gönderme alanı (Mute atılmadan hemen önce veya sonra)
    try {
      await member.send(`@${interaction.user.username} tarafından ${interaction.guild.name} sunucusunda ${sureMetni} boyunca susturuldunuz.\nSebep: ${sebep}`);
    } catch (err) {
      // Kullanıcının DM kutusu kapalıysa botun çökmemesi için hatayı sessizce geçiyoruz
    }

    try {
      await member.timeout(toplamMilisaniye, sebep);
      const embed = new EmbedBuilder()
        .setDescription(`✅ <@${member.id}> kullanıcısı **${sureMetni}** boyunca susturuldu.\nGerekçe: ${sebep}`)
        .setColor(0xffaa00);
      return interaction.reply({ embeds: [embed] });
    } catch {
      return interaction.reply({ content: '❌ Kullanıcı susturulamadı. Bot yetki hiyerarşisini kontrol edin.', ephemeral: true });
    }
  }
};