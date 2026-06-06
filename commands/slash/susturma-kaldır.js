const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('susturma-kaldır')
    .setDescription('Kullanıcının konuşma yasağını sonlandırır.')
    .addUserOption(opt => opt.setName('hedef').setDescription('Yasağı kaldırılacak kişi').setRequired(true))
    .addStringOption(opt => opt.setName('sebep').setDescription('Gerekçe').setRequired(false)),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({ content: '❌ Üyelerin susturmasını kaldırma yetkiniz bulunmuyor.', ephemeral: true });
    }

    const member = interaction.options.getMember('hedef');
    if (!member) {
      return interaction.reply({ content: '❌ Belirtilen kullanıcı bu sunucuda bulunamadı.', ephemeral: true });
    }

    const sebep = interaction.options.getString('sebep') || 'Belirtilmedi.';

    // Kullanıcıya DM gönderme alanı
    try {
      await member.send(`@${interaction.user.username} tarafından ${interaction.guild.name} sunucusundaki susturmanız kaldırıldı.\nSebep: ${sebep}`);
    } catch (err) {
      // Kullanıcının DM kutusu kapalıysa çökmemesi için hata bloklandı
    }

    try {
      await member.timeout(null, sebep);
      const embed = new EmbedBuilder()
        .setDescription(`✅ <@${member.id}> kullanıcısının konuşma yasağı kaldırıldı.`)
        .setColor(0x00ff00);
      return interaction.reply({ embeds: [embed] });
    } catch {
      return interaction.reply({ content: '❌ İşlem gerçekleştirilemedi.', ephemeral: true });
    }
  }
};