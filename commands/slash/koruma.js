const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('koruma-aç')
    .setDescription('Sunucunun güvenlik açıklarını tarar ve defans panelini gösterir.'),

  async execute(interaction, client) {
    // Sadece komutun atıldığı sunucudaki yönetici/yetkilileri kapsar
    await interaction.guild.roles.fetch();
    await interaction.guild.members.fetch();

    const yoneticiRoller = interaction.guild.roles.cache.filter(role => role.permissions.has(PermissionFlagsBits.Administrator) && role.id !== interaction.guild.roles.everyone.id);
    const supheliBotlar = interaction.guild.members.cache.filter(m => m.user.bot && !m.user.flags?.has('VerifiedBot'));
    
    let acikRoller = [];
    interaction.guild.roles.cache.forEach(role => {
      if (role.id === interaction.guild.roles.everyone.id) return;
      
      const yetkiler = role.permissions;
      // Rol yönetme, kanal yönetme veya sunucu yönetme yetkisi olan ve whitelistte olmayanları bulur kanka
      if (yetkiler.has(PermissionFlagsBits.ManageRoles) || yetkiler.has(PermissionFlagsBits.ManageChannels) || yetkiler.has(PermissionFlagsBits.ManageGuild)) {
        if (!global.whitelistRoles.has(role.id)) {
          acikRoller.push(role.name);
        }
      }
    });

    const embed = new EmbedBuilder()
      .setTitle('🛡️ AEM Teşkilat Güvenlik ve Defans Paneli')
      .setColor(0x0000ff)
      .addFields(
        { name: '📋 Whitelist Roller:', value: global.whitelistRoles.size > 0 ? Array.from(global.whitelistRoles).map(id => `<@&${id}>`).join(', ') : 'Hiç rol eklenmemiş kanka.' },
        { name: '⚠️ Tehlike Arz Eden Roller (Yönetici):', value: yoneticiRoller.size > 0 ? yoneticiRoller.map(r => r.name).join(', ') : 'Temiz, Tehlikeli rol yok.' },
        { name: '🤖 Şüpheli Botlar (Doğrulanmamış):', value: supheliBotlar.size > 0 ? supheliBotlar.map(b => b.user.tag).join(', ') : 'Şüpheli bot bulunamadı.' },
        { name: '🕳️ Sunucu Açığı Analizi:', value: acikRoller.length > 0 ? `⚠️ **Var!** Şu roller bana şüpheli geldi (Yetki açığı var): ${acikRoller.join(', ')}` : 'Sunucu açığı yok, her şey kontrol altında amirim!' }
      )
      .setFooter({ text: 'Ankara Emniyet Güvenlik Sistemi' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};