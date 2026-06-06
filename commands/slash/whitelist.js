const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist-rol')
    .setDescription('Koruma sistemi beyaz liste işlemlerini yönetir.')
    .addSubcommand(sub => 
      sub.setName('aç').setDescription('Koruma sistemine güvenli rol ekler.').addRoleOption(opt => opt.setName('rol').setDescription('Eklenecek Rol').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('kapa').setDescription('Güvenli rolden çıkartır.').addRoleOption(opt => opt.setName('rol').setDescription('Çıkarılacak Rol').setRequired(true))
    ),

  async execute(interaction, client) {
    const isAdmin = interaction.member.permissions.has(1n << 3n);
    const hasRole = interaction.member.roles.cache.some(r => config.yetkiliRoller.includes(r.id));

    if (!isAdmin && !hasRole) {
      return interaction.reply({ content: '❌ Whitelist yönetmek için yetkin yok amirim!', ephemeral: true });
    }

    const altKomut = interaction.options.getSubcommand();
    const rol = interaction.options.getRole('rol');

    if (altKomut === 'aç') {
      global.whitelistRoles.add(rol.id);
      return interaction.reply({ content: `✅ **${rol.name}** rolü koruma beyaz listesine (whitelist) başarıyla eklendi kanka.` });
    } else if (altKomut === 'kapa') {
      global.whitelistRoles.delete(rol.id);
      return interaction.reply({ content: `❌ **${rol.name}** rolü koruma beyaz listesinden başarıyla çıkartıldı.` });
    }
  },
};