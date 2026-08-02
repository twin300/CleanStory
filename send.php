<?php

header('Content-Type: application/json; charset=utf-8');

function send_json($statusCode, array $payload)
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function env_value($key)
{
    if (defined($key) && trim((string) constant($key)) !== '') {
        return trim((string) constant($key));
    }

    $value = getenv($key);

    if (is_string($value) && trim($value) !== '') {
        return trim($value);
    }

    if (isset($_ENV[$key]) && trim((string) $_ENV[$key]) !== '') {
        return trim((string) $_ENV[$key]);
    }

    if (isset($_SERVER[$key]) && trim((string) $_SERVER[$key]) !== '') {
        return trim((string) $_SERVER[$key]);
    }

    return null;
}

function clean_text($value)
{
    return trim(strip_tags((string) ($value === null ? '' : $value)));
}

$configPaths = array(
    __DIR__ . '/send-config.php',
    dirname(__DIR__) . '/send-config.php',
    dirname(__DIR__) . '/send-config',
);

foreach ($configPaths as $configPath) {
    if (is_file($configPath)) {
        require $configPath;
        break;
    }
}

$token = env_value('TELEGRAM_BOT_TOKEN');
$chatId = env_value('TELEGRAM_CHAT_ID');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    send_json(200, [
        'ok' => true,
        'telegramConfigured' => $token !== null && $chatId !== null,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST');
    send_json(405, ['message' => 'Метод не поддерживается']);
}

if ($token === null || $chatId === null) {
    send_json(500, ['message' => 'Telegram не настроен']);
}

$rawBody = file_get_contents('php://input');

if ($rawBody === false || strlen($rawBody) > 10000) {
    send_json(400, ['message' => 'Некорректные данные заявки']);
}

$data = json_decode($rawBody, true);

if (!is_array($data)) {
    send_json(400, ['message' => 'Некорректные данные заявки']);
}

$phone = clean_text(isset($data['phone']) ? $data['phone'] : '');
$rooms = clean_text(isset($data['rooms']) ? $data['rooms'] : '');
$cleaningType = clean_text(isset($data['cleaningType']) ? $data['cleaningType'] : '');
$price = clean_text(isset($data['price']) ? $data['price'] : '');

if (strlen(preg_replace('/\D+/', '', $phone)) < 10) {
    send_json(400, ['message' => 'Укажите номер телефона']);
}

$message = implode("\n", [
    '<b>Новая заявка CleanStory</b>',
    '',
    '<b>Телефон:</b> ' . htmlspecialchars($phone, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
    '<b>Комнаты:</b> ' . htmlspecialchars($rooms, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
    '<b>Тип уборки:</b> ' . htmlspecialchars($cleaningType, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
    '<b>Стоимость:</b> от ' . htmlspecialchars($price, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
]);

$payload = json_encode([
    'chat_id' => $chatId,
    'text' => $message,
    'parse_mode' => 'HTML',
], JSON_UNESCAPED_UNICODE);

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\n",
        'content' => $payload,
        'ignore_errors' => true,
        'timeout' => 12,
    ],
]);

$telegramUrl = 'https://api.telegram.org/bot' . $token . '/sendMessage';

if (function_exists('curl_init')) {
    $curl = curl_init($telegramUrl);

    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
    ]);

    $telegramResponse = curl_exec($curl);
    curl_close($curl);
} else {
    $telegramResponse = file_get_contents($telegramUrl, false, $context);
}

if ($telegramResponse === false) {
    send_json(502, ['message' => 'Telegram не принял заявку']);
}

$telegramData = json_decode($telegramResponse, true);

if (!is_array($telegramData) || !isset($telegramData['ok']) || $telegramData['ok'] !== true) {
    send_json(502, [
        'message' => isset($telegramData['description']) ? $telegramData['description'] : 'Telegram не принял заявку',
        'code' => isset($telegramData['error_code']) ? $telegramData['error_code'] : 502,
    ]);
}

send_json(200, ['ok' => true]);
