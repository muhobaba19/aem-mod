const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('takma-ad-değiştir')
    .setDescription('Kullanıcının sunucu içi ismini günceller.')
    .addUserOption(opt => opt.setName('kullanici').setDescription('İsmi değişecek kişi').setRequired(true))
    .addStringOption(opt => opt.setName('yeni-isim').setDescription('Belirlenecek yeni isim').setRequired(true)),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      return interaction.reply({ content: '❌ Bu komutu kullanmak için Kullanıcı Adlarını Yönet yetkiniz olmalıdır.', ephemeral: true });
    }

    const member = interaction.options.getMember('kullanici');
    const yeniIsim = interaction.options.getString('yeni-isim');

    try {
      await member.setNickname(yeniIsim);
      const embed = new EmbedBuilder()
        .setDescription(`✅ <@${member.id}> kullanıcısının yeni ismi **${yeniIsim}** olarak güncellendi.`)
        .setColor(0x00ffff);
      return interaction.reply({ embeds: [embed] });
    } catch {
      return interaction.reply({ content: '❌ Kullanıcının ismi değiştirilemedi. Botun yetki sırası yetersiz olabilir.', ephemeral: true });
    }
  }
};