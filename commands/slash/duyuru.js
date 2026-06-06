const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duyuru')
    .setDescription('Sadece yetkili rollerin kullanabileceği gelişmiş duyuru komutu.')
    .addChannelOption(option => 
      option.setName('kanal')
        .setDescription('Duyurunun gönderileceği kanal')
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName('metin')
        .setDescription('Duyuruya eklenecek ana metin içeriği')
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName('imza')
        .setDescription('İnce yazı ile alt tarafa eklenecek imza metni (Boş bırakılırsa sizi etiketler)')
        .setRequired(false)
    ),

  async execute(interaction) {
    // 1. Sadece Ana Sunucu Kontrolü
    if (interaction.guild.id !== "1483383930852999250") {
      return interaction.reply({ 
        content: '❌ Bu komut sadece ana sunucu üzerinde çalıştırılabilir.', 
        ephemeral: true 
      });
    }

    // 2. Gelişmiş Yetki ve Rol Hiyerarşisi Filtresi
    const izinliRoller = [
      "1483923909387485315",
      "1483923813359161344",
      "1497730010939920585",
      "1483923686804160625",
      "1483923497540517919"
    ];

    const yoneticiYetkisi = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    
    // İzin verilen en düşük pozisyondaki rolü bulmak için guild hiyerarşisini tarıyoruz
    let yetkiOnay = false;
    if (yoneticiYetkisi) {
      yetkiOnay = true;
    } else {
      // Kullanıcının rollerinden herhangi biri listede mi kontrol et
      const listedeVarMi = interaction.member.roles.cache.some(r => izinliRoller.includes(r.id));
      if (listedeVarMi) {
        yetkiOnay = true;
      } else {
        // Kullanıcının en yüksek rol pozisyonunu, izinli en düşük rol pozisyonu ile kıyasla
        const guildIzinliRoller = interaction.guild.roles.cache.filter(r => izinliRoller.includes(r.id));
        if (guildIzinliRoller.size > 0) {
          const enDusukIzinliPozisyon = Math.min(...guildIzinliRoller.map(r => r.position));
          if (interaction.member.roles.highest.position >= enDusukIzinliPozisyon) {
            yetkiOnay = true;
          }
        }
      }
    }

    if (!yetkiOnay) {
      return interaction.reply({ 
        content: '❌ Bu komutu kullanmak için gerekli rütbeye veya hiyerarşik üstünlüğe sahip değilsiniz.', 
        ephemeral: true 
      });
    }

    // 3. Parametrelerin Alınması ve Değerlendirilmesi
    const hedefKanal = interaction.options.getChannel('kanal');
    const anaMetin = interaction.options.getString('metin');
    const imzaGirdisi = interaction.options.getString('imza');

    // Botun hedef kanala mesaj gönderme yetkisini kontrol ediyoruz
    if (!hedefKanal.viewable || !hedefKanal.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
      return interaction.reply({ 
        content: '❌ Belirtilen kanalı göremiyorum veya oraya mesaj gönderme yetkim bulunmuyor.', 
        ephemeral: true 
      });
    }

    // 4. Embed Tasarımı ve İmza Senaryoları
    const embed = new EmbedBuilder()
      .setTitle('📢 | Duyuru Sistemi')
      .setDescription(anaMetin.replace(/\\n/g, '\n')) // Kod içi satır atlamalarını destekler
      .setColor(0x00ffff)
      .setTimestamp();

    if (imzaGirdisi) {
      // İmza girildiyse altbilgiye ince yazı şeklinde ekler
      embed.setFooter({ text: `${imzaGirdisi}` });
    } else {
      // İmza boş bırakıldıysa embed metninin sonuna komutu kullanan kişiyi ekler
      embed.setFields({ name: 'Duyuruyu Yayınlayan:', value: `<@${interaction.user.id}>` });
    }

    // 5. Kitlesel Etiket Yönetimi (Embed Dışı Mesaj)
    const etiketSatiri = `@everyone @here <@&1483926242452443288>`;

    try {
      await hedefKanal.send({ 
        content: etiketSatiri, 
        embeds: [embed] 
      });

      return interaction.reply({ 
        content: `✅ Duyuru başarıyla <#${hedefKanal.id}> kanalında yayınlandı.`, 
        ephemeral: true 
      });
    } catch (err) {
      return interaction.reply({ 
        content: '❌ Duyuru gönderilirken teknik bir hata meydana geldi.', 
        ephemeral: true 
      });
    }
  },
};