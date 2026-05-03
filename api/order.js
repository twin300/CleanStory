const sendJson = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

const readBody = (request) =>
  new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 10000) {
        reject(new Error("Слишком большая заявка"));
        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Некорректные данные заявки"));
      }
    });

    request.on("error", reject);
  });

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { message: "Метод не поддерживается" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return sendJson(response, 500, { message: "Telegram не настроен" });
  }

  try {
    const { phone, rooms, cleaningType, price } = await readBody(request);

    if (!phone || String(phone).trim().length < 7) {
      return sendJson(response, 400, { message: "Укажите номер телефона" });
    }

    const text = [
      "<b>Новая заявка CleanStory</b>",
      "",
      `<b>Телефон:</b> ${escapeHtml(phone)}`,
      `<b>Комнаты:</b> ${escapeHtml(rooms)}`,
      `<b>Тип уборки:</b> ${escapeHtml(cleaningType)}`,
      `<b>Стоимость:</b> от ${escapeHtml(price)}`,
    ].join("\n");

    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    if (!telegramResponse.ok) {
      return sendJson(response, 502, { message: "Telegram не принял заявку" });
    }

    return sendJson(response, 200, { ok: true });
  } catch (error) {
    return sendJson(response, 400, { message: error.message || "Не удалось отправить заявку" });
  }
};
