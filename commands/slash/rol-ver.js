const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rol-ver')
    .setDescription('Belirtilen kullanıcıya rol tanımlar.')
    .addUserOption(opt => opt.setName('kullanici').setDescription('Rol verilecek kişi').setRequired(true))
    .addStringOption(opt => opt.setName('rol-girdisi').setDescription('Rol adı, ID numarası veya etiket').setRequired(true)),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles) && 
        !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && 
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Bu işlemi gerçekleştirmek için yetkiniz yetersizdir.', ephemeral: true });
    }

    const member = interaction.options.getMember('kullanici');
    const rolGirdisi = interaction.options.getString('rol-girdisi').trim();
    
    let targetRole;
    if (rolGirdisi.startsWith('<@&') && rolGirdisi.endsWith('>')) {
      const roleId = rolGirdisi.replace(/[<@&>]/g, '');
      targetRole = interaction.guild.roles.cache.get(roleId);
    } else {
      targetRole = interaction.guild.roles.cache.get(rolGirdisi) || 
                   interaction.guild.roles.cache.find(r => r.name.toLowerCase() === rolGirdisi.toLowerCase());
    }

    if (!targetRole) return interaction.reply({ content: '❌ Belirtilen rol bulunamadı.', ephemeral: true });
    
    if (interaction.guild.members.me.roles.highest.position <= targetRole.position) {
      return interaction.reply({ content: '❌ Botun yetkisi bu rolü vermeye yetmiyor.', ephemeral: true });
    }

    try {
      await member.roles.add(targetRole);
      const embed = new EmbedBuilder()
        .setDescription(`✅ <@${member.id}> isimli kullanıcıya **${targetRole.name}** rolü başarıyla tanımlandı.`)
        .setColor(0x00ff00);
      return interaction.reply({ embeds: [embed] });
    } catch {
      return interaction.reply({ content: '❌ Rol eklenirken teknik bir sorun oluştu.', ephemeral: true });
    }
  }
};