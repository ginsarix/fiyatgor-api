export const firmsConstraintErrors = {
  firms_dia_server_code_unique: "Bu sunucu kodu ile başka bir firma zaten var",
  firms_firm_code_unique:
    "Bu firma kodu (tanımlayıcı) ile başka bir firma zaten var",
};

export const diaLoginErrors = {
  rejected:
    "DIA girişi başarısız oldu, DIA kullanıcı adı, şifre ve API anahtarını kontrol edin",
  missingCredentials:
    "DIA bağlantı bilgileri eksik, DIA kullanıcı adı, şifre ve API anahtarını girin",
};

// shown when the settings were saved but DIA couldn't be reached to check the credentials
export const diaUnreachableWarning =
  "DIA'ya ulaşılamadığı için DIA giriş bilgileri doğrulanamadı";
