const { EmbedBuilder, WebhookClient } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: 'guildAuditLogEntryCreate',
  async execute(auditLogEntry, guild) {
    const targetSunucu = config.sunucular.find(s => s.id === guild.id);
    if (!targetSunucu) return;

    const { action, executorId, targetId, reason, changes } = auditLogEntry;
    let actionName = 'Bilinmeyen İşlem';
    let color = 0x34495e;
    let kritikIslem = false;
    let detaylar = '';

    // Discord API Tüm Denetim Kaydı Kod Haritası
    const auditMap = {
      1: { name: 'Sunucu Ayarları Güncellendi', color: 0xf1c40f },
      10: { name: 'Kanal Oluşturuldu', color: 0x2ecc71, kritik: true },
      11: { name: 'Kanal Güncellendi / Düzenlendi', color: 0x3498db },
      12: { name: 'Kanal Silindi', color: 0xe74c3c, kritik: true },
      13: { name: 'Kanal İzinleri Değiştirildi (Overwrites)', color: 0xe67e22 },
      20: { name: 'Kullanıcı Sunucudan Atıldı (Kick)', color: 0xe67e22 },
      21: { name: 'Prune İşlemi (Toplu Temizlik)', color: 0x95a5a6 },
      22: { name: 'Kullanıcı Yasaklandı (Ban)', color: 0xc0392b },
      23: { name: 'Kullanıcı Yasağı Kaldırıldı', color: 0x2ecc71 },
      24: { name: 'Konuşma Yasağı Süresi Değiştirildi (Susturma)', color: 0x9b59b6 },
      25: { name: 'Sahte/Güvenli Rol İşlemi Tahlili', color: 0x1abc9c },
      26: { name: 'Kullanıcı Hareket Ettirildi (Ses Odası)', color: 0x7f8c8d },
      27: { name: 'Kullanıcı Sesten Atıldı', color: 0x7f8c8d },
      30: { name: 'Yeni Rol Oluşturuldu', color: 0x2ecc71, kritik: true },
      31: { name: 'Rol Güncellendi / İzin Değişikliği', color: 0x3498db },
      32: { name: 'Rol Silindi', color: 0xe74c3c, kritik: true },
      40: { name: 'Davet Bağlantısı Oluşturuldu', color: 0x1abc9c },
      41: { name: 'Davet Bağlantısı Silindi', color: 0xd35400 },
      50: { name: 'WebHook Oluşturuldu', color: 0x9b59b6, kritik: true },
      51: { name: 'WebHook Güncellendi', color: 0x34495e },
      52: { name: 'WebHook Silindi', color: 0xc0392b, kritik: true },
      60: { name: 'Emoji Oluşturuldu', color: 0x2ecc71 },
      62: { name: 'Emoji Silindi', color: 0xe74c3c },
      72: { name: 'Mesaj Silme (Başka Bir Yetkili Tarafından)', color: 0xe74c3c },
      76: { name: 'Uygulama / Entegrasyon Eklendi', color: 0x1abc9c },
      80: { name: 'Etkinlik Başlatıldı', color: 0x3498db },
      82: { name: 'Etkinlik İptal Edildi / Silindi', color: 0x95a5a6 },
      90: { name: '🛡️ Sunucu Güvenlik Seviyesi Güncellendi', color: 0xf1c40f }
    };

    if (auditMap[action]) {
      actionName = auditMap[action].name;
      color = auditMap[action].color;
      if (auditMap[action].kritik) kritikIslem = true;
    }

    // Değişiklik günlüğü verilerini metne dökme
    if (changes && changes.length > 0) {
      detaylar = changes.map(c => `• **Değişen Alan:** \`${c.key}\`\n  **Eski Hali:** \`${c.old ?? 'Yok'}\`\n  **Yeni Hali:** \`${c.new ?? 'Yok'}\``).join('\n');
    } else {
      detaylar = 'Doğrudan işlem gerçekleştirildi (Parametre değişikliği yok).';
    }

    // Gelişmiş İstismar (Abuse) Filtresi ve Etiketleme Sistemi
    if (kritikIslem) {
      const suAn = Date.now();
      // Küresel Map kontrolü VS Code uyarısı vermemesi için güvenli hale getirildi
      if (!global.istismarTakip) {
        global.istismarTakip = new Map();
      }
      
      if (!global.istismarTakip.has(executorId)) {
        global.istismarTakip.set(executorId, []);
      }
      
      const gecmis = global.istismarTakip.get(executorId);
      const filtrelenmisGecmis = gecmis.filter(t => suAn - t < 300000); // Son 5 dakika
      filtrelenmisGecmis.push(suAn);
      global.istismarTakip.set(executorId, filtrelenmisGecmis);

      if (filtrelenmisGecmis.length > 3) {
        try {
          const webhook = new WebhookClient({ url: targetSunucu.webhook });
          await webhook.send({ 
            content: `⚠️⚠️ <@1266802478616154220> **KRİTİK İSTİSMAR VE SUİSTİMAL ALARMI!** <@${executorId}> isimli yetkili son 5 dakika içerisinde 3'ten fazla kritik yapılandırma işlemi gerçekleştirdi! Sistem takibe aldı.`
          });
        } catch (err) { 
          // Hata durumunda konsola basma, sessizce geç
        }
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`🚨 Denetim Kaydı Gelişmiş Veri Akışı`)
      .setColor(color)
      .setDescription(`**Sunucu:** ${guild.name}`)
      .addFields(
        { name: '🛠️ Gerçekleştirilen Eylem:', value: `\`${actionName}\` (Kod: ${action})`, inline: false },
        { name: '👤 İşlemi Tetikleyen Yetkili:', value: executorId ? `<@${executorId}> (ID: ${executorId})` : 'Bilinmiyor', inline: true },
        { name: '🎯 Hedef Unsur / ID:', value: targetId ? `ID: ${targetId} (<@${targetId}>)` : 'Mevcut Değil', inline: true },
        { name: '📝 Alınan Teknik Değişiklik Notları:', value: detaylar.substring(0, 1024), inline: false },
        { name: '📁 Belirtilen Gerekçe (Reason):', value: reason || 'Gerekçe girilmemiş.' }
      )
      .setTimestamp();

    try {
      const webhook = new WebhookClient({ url: targetSunucu.webhook });
      await webhook.send({ embeds: [embed] });
    } catch (err) {
      // Webhook gönderim hatalarını yoksay
    }
  },
};