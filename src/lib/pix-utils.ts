
/**
 * Utilitário para gerar o Payload do Pix (Copia e Cola)
 * Baseado no padrão EMV QRCPS-MPM do Banco Central do Brasil
 */

export interface PixConfig {
  chave: string;
  beneficiario: string;
  cidade: string;
  valor: number;
  identificador?: string;
}

function crc16(data: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < data.length; i++) {
    let b = data.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      let bit = ((b >> (7 - j)) & 1) === 1;
      let c15 = ((crc >> 15) & 1) === 1;
      crc <<= 1;
      if (c15 !== bit) crc ^= polynomial;
    }
  }

  crc &= 0xffff;
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export function generatePixPayload({
  chave,
  beneficiario,
  cidade,
  valor,
  identificador = '***',
}: PixConfig): string {
  // Limpeza dos dados conforme regras do BACEN
  const cleanChave = chave.trim();
  const cleanBeneficiario = beneficiario
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove caracteres especiais
    .substring(0, 25);
    
  const cleanCidade = cidade
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .substring(0, 15);

  const cleanValor = valor.toFixed(2);
  
  // TxID (Identificador) deve ser alfanumérico e sem espaços para ser compatível com a maioria dos bancos
  const cleanId = identificador
    .replace(/[^a-zA-Z0-9]/g, '') 
    .substring(0, 25) || '***';

  const payload = [
    formatField('00', '01'), // Payload Format Indicator
    formatField(
      '26',
      formatField('00', 'br.gov.bcb.pix') + formatField('01', cleanChave)
    ), // Merchant Account Info
    formatField('52', '0000'), // Merchant Category Code
    formatField('53', '986'), // Transaction Currency (BRL)
    formatField('54', cleanValor), // Transaction Amount
    formatField('58', 'BR'), // Country Code
    formatField('59', cleanBeneficiario), // Merchant Name
    formatField('60', cleanCidade), // Merchant City
    formatField('62', formatField('05', cleanId)), // Additional Data Field (TxID)
    '6304', // CRC16 Indicator
  ].join('');

  return `${payload}${crc16(payload)}`;
}

export function getPixQRCodeUrl(payload: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    payload
  )}`;
}
