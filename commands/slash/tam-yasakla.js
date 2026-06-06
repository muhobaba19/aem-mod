const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const path = require('path');
const fs = require('fs');

const yasaklilarPath = path.resolve(process.cwd(), 'yasaklilar.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tam-yasakla')
    .setDescription('Kişiyi Ankara Emniyetine bağlı tüm sunuculardan yasaklar.')
    .addUserOption(option => option.setName('hedef').setDescription('Yasaklanacak kişi').setRequired(true))
    .addStringOption(option => option.setName('sebep').setDescription('Sebep').setRequired(true)),
    
  async execute(interaction, client) {
    // Yetki kontrolü
    const isAdmin = interaction.member.permissions.has(1n << 3n);
    const hasRole = interaction.member.roles.cache.some(r => config.yetkiliRoller.includes(r.id));
    
    if (!isAdmin && !hasRole) {
      return interaction.reply({ content: 'Rütbe veya Yetkiniz yetmiyor!', flags: 64 });
    }

    const hedef = interaction.options.getUser('hedef');
    const sebep = interaction.options.getString('sebep');

    if (hedef.id === interaction.user.id) {
      return interaction.reply({ content: 'Kendi kendini yasaklayamazsın, sakin ol.', flags: 64 });
    }

    await interaction.deferReply();

    // Emojisiz DM gönderme alanı kanka
    try { 
      await hedef.send(`@${interaction.user.username} tarafından Tüm Ankara Emniyet Müdürlüğü sunucularında yasaklandınız.\nSebep: ${sebep}`); 
    } catch {}

    let basarili = [];
    let sorunlar = [];

    // 🌟 DEĞİŞİKLİK: Config yerine botun olduğu TÜM sunucuları tarıyoruz kanka
    const tumSunucular = interaction.client.guilds.cache;

    for (const [guildId, g] of tumSunucular) {
      try {
        await g.members.ban(hedef.id, { reason: `Tam-Yasakla Protokolü | Sebep: ${sebep}` });
        basarili.push(g.name);
      } catch (err) {
        sorunlar.push(`**${g.name}** sunucusunda işlem yapılamadı, botun yetkisi yetersiz veya şahıs botun üstünde bir role sahip.`);
      }
    }

    // 🌟 HAFIZAYA KAYDETME MOTORU: /tekrar-yasakla komutunun okuyacağı yer kanka
    try {
      let veri = {};
      if (fs.existsSync(yasaklilarPath)) {
        veri = JSON.parse(fs.readFileSync(yasaklilarPath, 'utf8'));
      }
      veri[hedef.id] = {
        tag: hedef.tag,
        sebep: sebep
      };
      fs.writeFileSync(yasaklilarPath, JSON.stringify(veri, null, 2));
    } catch (e) {
      console.log("Yasaklilar.json dosyasına yazılırken hata oluştu kanka:", e);
    }

    let aciklama = `**İşlemler Tamamlandı**\n\n`;
    aciklama += `@${hedef.username} (${hedef.id}) isimli kişi aşağıdaki sunuculardan yasaklandı:\n\n`;
    
    if (basarili.length > 0) {
      aciklama += basarili.map(x => `${x}`).join('\n');
    } else {
      aciklama += `*Hiçbir sunucuda yasaklama uygulanamadı.*`;
    }

    aciklama += `\n\n\nSorunlar:\n\n`;
    if (sorunlar.length > 0) {
      aciklama += sorunlar.join('\n\n');
    } else {
      aciklama += `Sorun yok.`;
    }

    aciklama += `\n\n\nSebep: ${sebep}`;

    const embed = new EmbedBuilder()
      .setDescription(aciklama)
      .setColor(0xff0000); // Tam kırmızı çizgi

    return interaction.editReply({ embeds: [embed] });
  },
};