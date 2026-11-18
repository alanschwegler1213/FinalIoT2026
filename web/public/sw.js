// Service worker mínimo: hace la web instalable. Sin caché offline a propósito,
// para no mostrar nunca datos de humedad viejos.
self.addEventListener("fetch", () => {});
