export function formatCurrency(amount: number | string | null | undefined, currency: string = 'VND'): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '0 ₫';
  }

  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(numeric);
  }

  // Default VND
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '---';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '---';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function parseAmountNumber(val: string | number): number {
  if (typeof val === 'number') return val;
  const cleaned = val.replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function exportTransactionsToCSV(
  transactions: any[],
  accounts: any[],
  categories: any[],
  filename: string = 'transactions_export.csv'
): void {
  const headers = ['ID', 'Ngay Giao Dich', 'Loai', 'Noi Dung', 'So Tien (VND)', 'Phi', 'Tai Khoan', 'Danh Muc', 'Ghi Chu'];
  
  const rows = transactions.map((tx) => {
    const acc = accounts.find((a) => a.id === tx.account_id);
    const cat = categories.find((c) => c.id === tx.category_id);
    const typeLabel = tx.type === 'income' ? 'Thu nhap' : tx.type === 'expense' ? 'Chi tieu' : tx.type === 'transfer' ? 'Chuyen khoan' : 'Tra gop';
    
    return [
      `"${tx.id}"`,
      `"${tx.transaction_date}"`,
      `"${typeLabel}"`,
      `"${(tx.transaction_detail || '').replace(/"/g, '""')}"`,
      `"${tx.amount}"`,
      `"${tx.fee || 0}"`,
      `"${(acc?.account_name || '').replace(/"/g, '""')}"`,
      `"${(cat?.name || '').replace(/"/g, '""')}"`,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

