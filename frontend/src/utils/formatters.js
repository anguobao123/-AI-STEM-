export function formatPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return `${Math.round(value * 100)}%`;
}

export function formatNumber(value, digits = 4) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return Number(value).toFixed(digits).replace(/\.?0+$/, "");
}

export function formatLoss(value) {
  return formatNumber(value, 6);
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function safeText(value, fallback = "-") {
  if (value == null || value === "") {
    return fallback;
  }
  return String(value);
}
