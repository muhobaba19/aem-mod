const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dm-mesaj')
    .setDescription('Belirtilen kullanıcıya veya ana sunucudaki herkese DM üzerinden mesaj gönderir.')
    .addStringOption(option =>
      option.setName('hedef')
        .setDescription('Kişi ID\'si, kullanıcı etiketi veya herkese göndermek için "all" yazın')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('mesaj')
        .setDescription('Gönderilecek mesaj içeriği (Embedsiz)')
        .setRequired(true)
    ),

  async execute(interaction) {
    // 1. Yetki Kontrolü (Yönetici yetkisi olanlar veya rolleri yönet yetkisi olanlar kullanabilir)
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
        !interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ 
        content: '❌ Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz.', 
        ephemeral: true 
      });
    }

    const hedefGirdisi = interaction.options.getString('hedef').trim();
    const gonderilecekMesaj = interaction.options.getString('mesaj');

    // Yanıt süresini uzatıyoruz çünkü toplu mesaj gönderimi zaman alabilir
    await interaction.deferReply({ ephemeral: false });

    let basariliKullanicilar = [];
    let hataliKullanicilar = [];

    // 2. Senaryo: Herkese Toplu DM Gönderme (all)
    if (hedefGirdisi.toLowerCase() === 'all') {
      // Güvenlik amacıyla toplu mesaj işlemi sadece ana sunucuda çalıştırılabilir
      if (interaction.guild.id !== "1483383930852999250") {
        return interaction.editReply({ 
          content: '❌ Toplu DM gönderme işlemi sadece merkez ana sunucu üzerinde çalıştırılabilir.' 
        });
      }

      // Sunucudaki tüm üyeleri hafızaya çekiyoruz
      const tumUyeler = await interaction.guild.members.fetch();
      // Botları listeden ayıklıyoruz
      const gercekUyeler = tumUyeler.filter(m => !m.user.bot);

      for (const [id, member] of gercekUyeler) {
        try {
          await member.send(gonderilecekMesaj);
          basariliKullanicilar.push(`<@${id}>`);
        } catch {
          // Kullanıcının DM kutusu kapalıysa buraya düşer
          hataliKullanicilar.push(`<@${id}>`);
        }
      }

    // 3. Senaryo: Tek Bir Kişiye DM Gönderme
    } else {
      // Girdideki etiket işaretlerini temizleyerek saf ID elde ediyoruz
      const temizId = hedefGirdisi.replace(/[<@!>]/g, '');
      let hedefKullanici;

      try {
        hedefKullanici = await interaction.client.users.fetch(temizId);
      } catch {
        return interaction.editReply({ 
          content: '❌ Belirtilen kullanıcı bulunamadı. Lütfen geçerli bir ID veya etiket girin.' 
        });
      }

      try {
        await hedefKullanici.send(gonderilecekMesaj);
        basariliKullanicilar.push(`<@${hedefKullanici.id}>`);
      } catch {
        return interaction.editReply({ 
          content: `❌ <@${hedefKullanici.id}> isimli kullanıcının DM kutusu kapalı olduğu için mesaj iletilemedi.` 
        });
      }
    }

    // 4. Raporlama ve Onay Alanı (Herkese Açık)
    let onayMesaji = `✅ **DM Mesaj Sistemi Başarıyla Tamamlandı**\n\n`;
    onayMesaji += `📝 **Gönderilen Mesaj:** ${gonderilecekMesaj}\n\n`;
    
    if (basariliKullanicilar.length > 0) {
      onayMesaji += `📥 **Mesajın Başarıyla İletildiği Kişiler:**\n${basariliKullanicilar.join(', ')}`;
    }

    if (hataliKullanicilar.length > 0) {
      onayMesaji += `\n\n⚠️ **DM Kutusu Kapalı Olduğu İçin İletilemeyen Kişiler:**\n${hataliKullanicilar.join(', ')}`;
    }

    return interaction.editReply({ content: onayMesaji });
  },
};