import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ClienteData } from "./types";

/* ===========================
   Utilitário de classes
=========================== */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ===========================
   Formatação de valores
=========================== */
export function formatCurrency(
  value: number | null | undefined,
  showSymbol: boolean = true
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return showSymbol ? "R$ 0,00" : "0,00";
  }

  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return showSymbol ? formatted : formatted.replace("R$", "").trim();
}

export function formatSmallValueCurrency(
  value: number | null | undefined,
  digits: number = 5
): string {
  const safeValue =
    value === null || value === undefined || Number.isNaN(value) ? 0 : value;

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(safeValue);
}

export function formatNumber(
  value: number | null | undefined,
  decimalPlaces: number = 2
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0";
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}


/* ===========================
   Máscaras
=========================== */
export const maskTelefone = (value: string): string => {
  if (!value) return "";

  const onlyNums = value.replace(/\D/g, "");

  if (onlyNums.length <= 10) {
    return onlyNums
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 14);
  }

  return onlyNums
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);
};

export const maskCpfCnpj = (value: string): string => {
  if (!value) return "";

  const onlyNums = value.replace(/\D/g, "");

  if (onlyNums.length <= 11) {
    return onlyNums
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .slice(0, 14);
  }

  return onlyNums
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})/, "$1-$2")
    .slice(0, 18);
};

export const maskCnpj = (value: string): string => {
  if (!value) return "";

  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
};

export const maskCurrency = (value: string): string => {
  if (!value) return "";

  let v = value.replace(/\D/g, "");
  v = (parseInt(v || "0", 10) / 100).toFixed(2);
  v = v.replace(".", ",");
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");

  return "R$ " + v;
};

export const maskDecimal = (value: string): string => {
  if (!value) return '';

  let v = value.replace(/\D/g, ''); // Remove tudo que não é dígito
  v = v.replace(/^0+/, ''); // Remove zeros à esquerda

  if (v.length === 0) return ''; // Retorna vazio se não houver dígitos

  // Adiciona zeros à esquerda se necessário para formar os centavos
  if (v.length < 3) {
    v = v.padStart(3, '0');
  }
  
  const integerPart = v.slice(0, -2);
  const decimalPart = v.slice(-2);
  
  const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${formattedIntegerPart},${decimalPart}`;
};

export const maskDecimalWithAutoComma = (value: string): string => {
    if (!value) return "0,00";

    let v = value.replace(/\D/g, "");
    
    // Remove leading zeros
    v = v.replace(/^0+/, "");
    
    // Ensure at least one digit, default to '0' if empty
    if (v.length === 0) return "0,00";

    // Pad with leading zeros if less than 3 digits
    if (v.length < 3) {
      v = v.padStart(3, '0');
    }

    // Insert comma
    let integerPart = v.slice(0, -2);
    let decimalPart = v.slice(-2);

    // Format integer part with thousand separators
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${integerPart},${decimalPart}`;
};


export const maskInteger = (value: string): string =>
  value ? value.replace(/\D/g, "") : "";

/* ===========================
   Validação CPF / CNPJ
=========================== */
function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;

  return check === Number(cpf[10]);
}

function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calc = (length: number) => {
    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += Number(cnpj[length - i]) * pos--;
      if (pos < 2) pos = 9;
    }

    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };

  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

export function validateCpfCnpj(
  doc: string
): "valid" | "invalid" | "incomplete" {
  if (!doc) return "incomplete";

  const onlyNums = doc.replace(/\D/g, "");

  if (onlyNums.length > 11) {
    if (onlyNums.length < 14) return "incomplete";
    return validateCNPJ(onlyNums) ? "valid" : "invalid";
  }

  if (onlyNums.length < 11) return "incomplete";
  return validateCPF(onlyNums) ? "valid" : "invalid";
}

/* =================================
   Checagem de cliente duplicado
================================= */

export const normalizePhone = (value: string) =>
  value.replace(/\D/g, '').replace(/^55/, '');

export const normalizeEmail = (value: string) =>
  value.trim().toLowerCase();

export function findDuplicateClient(
  newClient: Partial<Omit<ClienteData, 'id' | 'userId'>>,
  existingClients: ClienteData[]
): ClienteData | null {
  const newPhones =
    newClient.telefones?.map(t => normalizePhone(t.numero)).filter(Boolean) ?? [];

  const newEmail = newClient.email
    ? normalizeEmail(newClient.email)
    : null;

  const newName = newClient.nome?.trim().toLowerCase();

  for (const client of existingClients) {
    // Verifica telefone
    const clientPhones =
      client.telefones?.map(t => normalizePhone(t.numero)).filter(Boolean) ?? [];

    if (
      newPhones.length > 0 &&
      newPhones.some(p => clientPhones.includes(p))
    ) {
      return client;
    }

    // Verifica email
    if (
      newEmail &&
      client.email &&
      normalizeEmail(client.email) === newEmail
    ) {
      return client;
    }

    // Verifica nome (se for o único campo preenchido)
    if (
      newName &&
      !newEmail &&
      newPhones.length === 0 &&
      client.nome.trim().toLowerCase() === newName
    ) {
        return client;
    }
  }

  return null;
}
