const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tam-yasak-sorgu')
    .setDescription('Bir kişinin AEM sunucularından banlı olup olmadığını gösterir.')
    .addStringOption(option => option.setName('id').setDescription('Sorgulanacak ID numarası').setRequired(true)),

  async execute(interaction, client) {
    const isAdmin = interaction.member.permissions.has(1n << 3n);
    const hasRole = interaction.member.roles.cache.some(r => config.yetkiliRoller.includes(r.id));

    if (!isAdmin && !hasRole) {
      return interaction.reply({ content: '❌ Tam yasak sorgusu yapmak için yetkin yetmiyor kanka!', ephemeral: true });
    }

    const hedefId = interaction.options.getString('id');
    await interaction.deferReply();

    let durum = [];
    let sebepler = [];

    for (const s of config.sunucular) {
      const g = client.guilds.cache.get(s.id);
      if (!g) { 
        durum.push(`⚪ **${s.isim}**: Bot sunucuda yok.`); 
        continue; 
      }
      try {
        // Burada ban bilgisini çekerken içindeki sebebi de alıyoruz kanka
        const banBilgisi = await g.bans.fetch(hedefId);
        durum.push(`🔴 **${s.isim}**: **YASAKLI**`);
        
        const banSebep = banBilgisi.reason || 'Sebep belirtilmemiş.';
        sebepler.push(`• **${s.isim}**: ${banSebep}`);
      } catch {
        durum.push(`🟢 **${s.isim}**: Temiz (Yasak yok)`);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🔍 Tam Yasak Sorgu')
      .setColor(0x00ffff)
      .setFooter({ text: 'AEM - Moderasyon Sistemi' })
      .setTimestamp();

    // Üst kısımda her zaman sunucuların durumu listelenecek
    let embedIcerik = `**Sorgulanan Şahıs ID:** ${hedefId}\n\n${durum.join('\n')}`;

    // Eğer en az bir sunucuda banı varsa alta sebepleri ekliyoruz kanka
    if (sebepler.length > 0) {
      embedIcerik += `\n\n**📝 Yasaklanma Sebepleri:**\n${sebepler.join('\n')}`;
    } else {
      embedIcerik += `\n\n**📝 Yasaklanma Sebepleri:**\n• Herhangi bir sunucuda aktif yasağı bulunmuyor.`;
    }

    embed.setDescription(embedIcerik);

    return interaction.editReply({ embeds: [embed] });
  },
};