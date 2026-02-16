function isEnabled() {
  return String(process.env.WHATSAPP_ENABLED || 'false').toLowerCase() === 'true';
}

function sanitizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D+/g, '');
  return digits.length >= 10 ? digits : null;
}

function fmtDateTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  return d.toLocaleString('pt-BR');
}

function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(String(v).includes('T') ? v : `${v}T00:00:00`);
  return d.toLocaleDateString('pt-BR');
}

async function sendWhatsAppEmprestimoConfirmado({ toPhone, nome, equipamento, retirada, devolucaoPrevista, quantidade }) {
  if (!isEnabled()) return { skipped: true, reason: 'WHATSAPP_ENABLED=false' };

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error('WhatsApp não configurado (WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID).');
  }

  const to = sanitizePhone(toPhone);
  if (!to) {
    throw new Error('Telefone inválido para WhatsApp. Use formato internacional (ex: +55 11 99999-9999).');
  }

  const bodyText =
    `Olá ${nome || 'solicitante'}! ✅\n` +
    `Seu empréstimo foi realizado com sucesso.\n\n` +
    `📦 Equipamento: ${equipamento?.nome || '—'}\n` +
    `🔢 Quantidade: ${Number(quantidade || 1)}\n` +
    `🗓️ Retirada: ${fmtDateTime(retirada)}\n` +
    `📅 Devolução prevista: ${fmtDate(devolucaoPrevista)}\n\n` +
    `— Sistema de Empréstimos`;

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: bodyText }
    })
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data?.error?.message || `Erro HTTP ${resp.status}`;
    throw new Error(msg);
  }
  return data;
}

module.exports = { sendWhatsAppEmprestimoConfirmado, sanitizePhone, isEnabled };
