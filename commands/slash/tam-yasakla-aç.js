const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const path = require('path');
const fs = require('fs');

const yasaklilarPath = path.resolve(process.cwd(), 'yasaklilar.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tam-yasak-aç')
    .setDescription('Kişinin tüm AEM sunucularındaki yasağını kaldırır.')
    .addStringOption(option => option.setName('id').setDescription('Yasağı açılacak şahsın ID numarası').setRequired(true))
    .addStringOption(option => option.setName('sebep').setDescription('Yasağın kaldırılma gerekçesi').setRequired(true)),

  async execute(interaction, client) {
    // Yetki kontrolü
    const isAdmin = interaction.member.permissions.has(1n << 3n);
    const hasRole = interaction.member.roles.cache.some(r => config.yetkiliRoller.includes(r.id));

    if (!isAdmin && !hasRole) {
      return interaction.reply({ content: 'Bu komutu kullanmaya rolün yetmiyo dostum!', flags: 64 });
    }

    const hedefId = interaction.options.getString('id').trim();
    const sebep = interaction.options.getString('sebep');
    await interaction.deferReply();

    // Kullanıcıya DM gönderme alanı (Emojisiz)
    try {
      const hedefKullanici = await client.users.fetch(hedefId);
      if (hedefKullanici) {
        await hedefKullanici.send(`Ankara Emniyeti sunucularındaki yasağınız kaldırıldı.\nSebep: ${sebep}`);
      }
    } catch {}

    let basarili = [];
    let sorunlar = [];
    let fakeUser = { id: hedefId };

    // 🌟 DEĞİŞİKLİK: Config yerine botun olduğu TÜM sunucuları tarayıp ban kaldırıyoruz kanka
    const tumSunucular = interaction.client.guilds.cache;

    for (const [guildId, g] of tumSunucular) {
      try {
        await g.bans.remove(hedefId, `${interaction.user.tag} tarafından tam yasak kaldırıldı. Sebep: ${sebep}`);
        basarili.push(g.name);
        
        // Log webhook'una gönderme motoru
        await sendActionLog(client, g, fakeUser, interaction.user, 'UNBAN', sebep, g.name);
      } catch (err) {
        sorunlar.push(`**${g.name}** sunucusunda işlem yapılamadı, şahıs bu sunucuda zaten yasaklı değil veya botun yetkisi yetersiz.`);
      }
    }

    // 🌟 HAFIZADAN TEMİZLEME MOTORU: Yasağı açılan kişiyi veritabanından siliyoruz kanka
    try {
      if (fs.existsSync(yasaklilarPath)) {
        let veri = JSON.parse(fs.readFileSync(yasaklilarPath, 'utf8'));
        if (veri[hedefId]) {
          delete veri[hedefId];
          fs.writeFileSync(yasaklilarPath, JSON.stringify(veri, null, 2));
        }
      }
    } catch (e) {
      console.log("Yasaklilar.json dosyasından veri silinirken hata oluştu:", e);
    }

    let aciklama = `**İşlemler Tamamlandı**\n\n`;
    aciklama += `<@${hedefId}> (${hedefId}) isimli kişinin yasağı aşağıdaki sunuculardan kaldırıldı:\n\n`;
    
    if (basarili.length > 0) {
      aciklama += basarili.map(x => `${x}`).join('\n');
    } else {
      aciklama += `*Hiçbir sunucudan yasak kaldırılamadı.*`;
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
      .setColor(0xff0000); // İstediğin gibi kırmızı çizgi rapor düzeni

    return interaction.editReply({ embeds: [embed] });
  },
};

async function sendActionLog(client, guild, targetUser, executor, actionType, reason, serverName) {
  // Webhook için ana sunucu ayarı hala config'den çekiliyor kanka
  const anaSunucuSettings = config.sunucular ? config.sunucular.find(s => s.id === config.anaSunucuId) : null;
  if (!anaSunucuSettings || !anaSunucuSettings.webhook) return;

  const embed = new EmbedBuilder()
    .setTitle('Birinin Tam Yasağı Açıldı')
    .setColor(0x00ff00)
    .addFields(
      { name: 'Yetkili:', value: `<@${executor.id}>`, inline: true },
      { name: 'Yetkili ID:', value: executor.id, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: 'Açılan Kişi ID:', value: targetUser.id, inline: true },
      { name: 'Sebep:', value: reason },
      { name: 'Hangi Sunucu:', value: serverName }
    )
    .setTimestamp();

  try {
    const { WebhookClient } = require('discord.js');
    const wh = new WebhookClient({ url: anaSunucuSettings.webhook });
    await wh.send({ embeds: [embed] });
  } catch {}
}