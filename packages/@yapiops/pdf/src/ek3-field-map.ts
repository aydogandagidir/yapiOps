import type { Ek3FormData } from '@yapiops/ek3';

/**
 * Maps Ek-3 form fields onto the official PDF's AcroForm field names.
 *
 * The authoritative form is from Resmî Gazete 30/05/2019-30789 (Yapı Denetim
 * Hizmet Sözleşmesi Ek-3) — published by the Çevre, Şehircilik ve İklim
 * Değişikliği Bakanlığı. AcroForm field names are NOT defined by the regulation;
 * we standardize on the names below and overlay them onto the official template.
 *
 * If the official template does not expose AcroForm fields, the renderer falls
 * back to the HTML→PDF replica in `ek3-html-fallback.ts`.
 */
export type Ek3FieldMap = Record<string, string>;

const trNumber = (n: number, fractionDigits = 2): string =>
  new Intl.NumberFormat('tr-TR', { maximumFractionDigits: fractionDigits }).format(n);

export function buildEk3FieldMap(form: Ek3FormData): Ek3FieldMap {
  const { proje, yapi, insaat, sahibi, muteahhit, denetim } = form;

  const map: Ek3FieldMap = {
    // 3.1 Proje
    proje_adi: proje.ad,
    il: proje.il,
    ilce: proje.ilce,
    mahalle: proje.mahalle ?? '',
    pafta: proje.pafta ?? '',
    ada: proje.ada,
    parsel: proje.parsel,
    koordinat: proje.koordinat
      ? `${trNumber(proje.koordinat.lat, 6)}, ${trNumber(proje.koordinat.lng, 6)}`
      : '',
    imar_durumu: proje.imarDurumu ?? '',

    // 3.2 Yapı
    yapi_sinifi: yapi.sinif,
    kullanim_amaci: yapi.kullanimAmaci,
    toplam_alan: trNumber(yapi.toplamAlanM2),
    bodrum_kat: String(yapi.bodrumKat),
    zemin_ustu_kat: String(yapi.zeminUstuKat),
    toplam_yukseklik: trNumber(yapi.toplamYukseklikM),
    tasiyici_sistem: yapi.tasiyiciSistem,
    dts: String(yapi.dts),
    bys: String(yapi.bys),
    sds: yapi.sds != null ? trNumber(yapi.sds, 4) : '',
    sd1: yapi.sd1 != null ? trNumber(yapi.sd1, 4) : '',
    pga: yapi.pga != null ? trNumber(yapi.pga, 4) : '',

    // 3.3 İnşaat
    yapi_ruhsat_no: insaat.yapiRuhsatNo ?? '',
    yapi_ruhsat_tarihi: insaat.yapiRuhsatTarihi ?? '',
    insaat_baslama: insaat.baslamaTarihi,
    insaat_bitis: insaat.bitisTarihi,
    insaat_sure_gun: String(insaat.toplamSureGun),
    insaat_maliyet: trNumber(insaat.maliyetTry),

    // 3.4 Sahibi
    sahibi_ad_soyad: sahibi.adSoyad,
    sahibi_tckn: sahibi.tckn ?? '',
    sahibi_vkn: sahibi.vkn ?? '',
    sahibi_adres: sahibi.adres,
    sahibi_telefon: sahibi.telefon ?? '',
    sahibi_eposta: sahibi.eposta ?? '',

    // 3.5 Müteahhit
    muteahhit_unvan: muteahhit.unvan,
    muteahhit_vkn: muteahhit.vkn,
    muteahhit_yetki_belgesi_sinifi: muteahhit.yetkiBelgesiSinifi ?? '',
    muteahhit_yetki_belgesi_no: muteahhit.yetkiBelgesiNo ?? '',
    muteahhit_yetkili_adi: muteahhit.yetkili.adSoyad,
    muteahhit_yetkili_tckn: muteahhit.yetkili.tckn ?? '',
    muteahhit_adres: muteahhit.adres,
    muteahhit_telefon: muteahhit.telefon ?? '',
    muteahhit_eposta: muteahhit.eposta ?? '',

    // 3.6 Yapı denetim
    denetim_unvan: denetim.unvan,
    denetim_vkn: denetim.vkn,
    denetim_izin_belgesi_no: denetim.izinBelgesiNo,
    denetim_yetkili_adi: denetim.yetkili.adSoyad,
    denetim_adres: denetim.adres,
    denetim_telefon: denetim.telefon ?? '',
    denetim_eposta: denetim.eposta ?? '',
    denetim_sorumlu_muhendis: denetim.sorumluMuhendis.adSoyad,
    denetim_oda_sicil: denetim.sorumluMuhendis.odaSicilNo,
  };

  return map;
}
