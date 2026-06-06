const { EmbedBuilder, WebhookClient } = require('discord.js');
const config = require('../config.json');

// Sunucuların anlık davet verilerini hafızada tutmak için harita
const davetHafizasi = new Map();

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const targetSunucu = config.sunucular.find(s => s.id === member.guild.id);
    if (!targetSunucu) return;

    // Sunucunun eski davet listesini hafızadan çekip yenisiyle karşılaştırıyoruz
    const eskiDavetler = davetHafizasi.get(member.guild.id);
    let davetEden = 'Bilinmiyor / Özel URL';
    let kullanılanKod = 'Bulunamadı';

    try {
      const yeniDavetler = await member.guild.invites.fetch();
      davetHafizasi.set(member.guild.id, yeniDavetler);

      if (eskiDavetler) {
        const kullanılanDavet = yeniDavetler.find(inv => {
          const eski = eskiDavetler.get(inv.code);
          return eski && inv.uses > eski.uses;
        });

        if (kullanılanDavet) {
          davetEden = `<@${kullanılanDavet.inviter.id}> (ID: ${kullanılanDavet.inviter.id})`;
          kullanılanKod = kullanılanDavet.code;
        }
      }
    } catch (err) {
      // Davetleri yönet yetkisi yoksa veya Özel URL kullanıldıysa buraya düşer
      if (member.guild.features.includes('VANITY_URL')) {
        davetEden = 'Sunucu Özel Bağlantısı (Vanity URL)';
        kullanılanKod = 'Özel Bağlantı';
      }
    }

    // Profil fotoğrafını ve süreleri çekiyoruz
    const profilFoto = member.user.displayAvatarURL({ dynamic: true, size: 256 });
    const hesapKurulus = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
    const sunucuGiris = `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`;

    const embed = new EmbedBuilder()
      .setTitle('📥 Yeni Giriş / İstihbarat Kaydı')
      .setColor(0x00ff00)
      .setThumbnail(profilFoto)
      .setDescription(`**Sunucuya Yeni Bir Kullanıcı Katıldı!**`)
      .addFields(
        { name: '👤 Kullanıcı Adı / Etiket:', value: `${member.user.tag} - <@${member.id}>`, inline: false },
        { name: '🆔 Kullanıcı ID Numarası:', value: `${member.id}`, inline: true },
        { name: '🔗 Kullanılan Davet Kodu:', value: `\`${kullanılanKod}\``, inline: true },
        { name: '👤 Davet Eden Yetkili:', value: davetEden, inline: false },
        { name: '⏳ Hesap Oluşturma Tarihi:', value: hesapKurulus, inline: true },
        { name: '📅 Sunucuya Katılım Anı:', value: sunucuGiris, inline: true }
      )
      .setTimestamp();

    try {
      const webhook = new WebhookClient({ url: targetSunucu.webhook });
      await webhook.send({ embeds: [embed] });
    } catch {}
  },
  // Bot açıldığında mevcut davetleri hafızaya almak için hazır fonksiyon
  async cacheInvites(client) {
    for (const s of config.sunucular) {
      const guild = client.guilds.cache.get(s.id);
      if (!guild) continue;
      try {
        const invites = await guild.invites.fetch();
        davetHafizasi.set(guild.id, invites);
      } catch {}
    }
  }
};