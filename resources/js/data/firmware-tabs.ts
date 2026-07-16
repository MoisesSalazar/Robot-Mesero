/**
 * Fragmentos didácticos del firmware ESP32-CAM (robot.cpp).
 * Comentados en español para explicar en clase / presentación.
 * El archivo original también embebe jsQR y una página HTML grande;
 * aquí mostramos solo la lógica del robot.
 */

export type FirmwareTab = {
    id: string;
    label: string;
    title: string;
    summary: string;
    code: string;
};

export const firmwareTabs: FirmwareTab[] = [
    {
        id: 'resumen',
        label: 'Resumen',
        title: '¿Qué hace este firmware?',
        summary:
            'El ESP32-CAM crea su propia red Wi‑Fi, sirve una página web, transmite video, enciende la linterna, mide distancia con el HC‑SR04 y entrega fotos JPEG para leer códigos QR.',
        code: `/*
 * ROBOT MESERO — Firmware ESP32-CAM (AI-Thinker)
 * Archivo fuente: robot.cpp
 *
 * Flujo general:
 *  1) setup() inicia cámara, sensor ultrasónico y Wi‑Fi Access Point
 *  2) iniciarServidores() abre HTTP en el puerto 80 (y stream de video)
 *  3) El navegador (o Laravel) llama rutas como:
 *       GET /            → página de control
 *       GET /stream      → video MJPEG
 *       GET /captura     → foto JPEG (para QR)
 *       GET /distancia   → JSON { ok, cm }
 *       GET /linterna/on | /linterna/off
 *  4) loop() queda libre (el servidor HTTP atiende en segundo plano)
 */

#include "esp_camera.h"      // Driver de la cámara OV2640
#include <WiFi.h>            // Red Wi‑Fi del ESP32
#include "esp_http_server.h" // Servidor HTTP embebido

// Credenciales del Access Point que crea el robot
const char* WIFI_NOMBRE = "ROBOT_ESP32";
const char* WIFI_CLAVE  = "12345678";
// IP típica del AP: http://192.168.4.1
`,
    },
    {
        id: 'pines',
        label: 'Pines',
        title: 'Mapa de pines (AI-Thinker)',
        summary:
            'Define a qué GPIO está conectada la cámara, la linterna (flash) y el sensor ultrasónico. El ECHO del HC‑SR04 debe pasar por un divisor de voltaje 5V→3.3V.',
        code: `// =====================================================
// PINES DE LA CÁMARA (placa AI-Thinker ESP32-CAM)
// Cada #define asocia una señal de la cámara a un GPIO
// =====================================================

#define PWDN_GPIO_NUM     32   // Apagado de cámara
#define RESET_GPIO_NUM    -1   // Sin reset por GPIO
#define XCLK_GPIO_NUM      0   // Reloj de la cámara
#define SIOD_GPIO_NUM     26   // I2C datos (SCCB)
#define SIOC_GPIO_NUM     27   // I2C reloj (SCCB)

// Bus de datos de imagen (8 bits)
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5

#define VSYNC_GPIO_NUM    25   // Sincronización vertical
#define HREF_GPIO_NUM     23   // Línea válida
#define PCLK_GPIO_NUM     22   // Reloj de píxel

// =====================================================
// LINTERNA (LED flash blanco integrado)
// =====================================================
#define FLASH_GPIO_NUM     4   // HIGH = encendida, LOW = apagada

// =====================================================
// SENSOR ULTRASÓNICO HC-SR04
// TRIG puede ir directo; ECHO necesita divisor de voltaje
// =====================================================
#define ULTRASONICO_TRIG_PIN 13  // Dispara el pulso ultrasónico
#define ULTRASONICO_ECHO_PIN 14  // Recibe el eco (ya bajado a 3.3V)
`,
    },
    {
        id: 'ultrasonico',
        label: 'Ultrasónico',
        title: 'HC-SR04: medición de distancia',
        summary:
            'Mide cuántos centímetros hay delante del robot. Laravel y la web usan GET /distancia → JSON. Si cm < 20, se considera obstáculo.',
        code: `// =====================================================
// INICIALIZACIÓN DEL SENSOR
// =====================================================
void iniciarUltrasonico() {
  pinMode(ULTRASONICO_TRIG_PIN, OUTPUT); // TRIG = salida
  pinMode(ULTRASONICO_ECHO_PIN, INPUT);  // ECHO = entrada
  digitalWrite(ULTRASONICO_TRIG_PIN, LOW);
}

// =====================================================
// MEDICIÓN EN CENTÍMETROS
// 1) Pulso de 10 µs en TRIG
// 2) Se mide cuánto dura el ECHO en HIGH
// 3) distancia = tiempo * velocidad_sonido / 2
//    (se divide entre 2 porque el sonido va y vuelve)
// =====================================================
float medirDistanciaCm() {
  digitalWrite(ULTRASONICO_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONICO_TRIG_PIN, HIGH);
  delayMicroseconds(10);                 // pulso de disparo
  digitalWrite(ULTRASONICO_TRIG_PIN, LOW);

  // Espera el eco (timeout 30 ms ≈ ~5 m máximo)
  long duracion = pulseIn(ULTRASONICO_ECHO_PIN, HIGH, 30000);

  if (duracion <= 0) {
    return -1.0f;                        // sin lectura válida
  }

  // 0.034 cm/µs ≈ velocidad del sonido; /2 ida y vuelta
  return duracion * 0.034f / 2.0f;
}

// Handler HTTP: GET /distancia
static esp_err_t distanciaHandler(httpd_req_t* req) {
  float distanciaCm = medirDistanciaCm();
  char respuesta[64];

  if (distanciaCm < 0.0f) {
    snprintf(respuesta, sizeof(respuesta), "{\\"ok\\":false}");
  } else {
    // Ejemplo: {"ok":true,"cm":42.5}
    snprintf(respuesta, sizeof(respuesta),
             "{\\"ok\\":true,\\"cm\\":%.1f}", distanciaCm);
  }

  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, respuesta, HTTPD_RESP_USE_STRLEN);
}
`,
    },
    {
        id: 'linterna',
        label: 'Linterna',
        title: 'Flash / linterna (GPIO 4)',
        summary:
            'Enciende o apaga el LED de la ESP32-CAM. Rutas: GET /linterna/on y GET /linterna/off.',
        code: `// =====================================================
// ENCENDER LINTERNA  →  GET /linterna/on
// =====================================================
static esp_err_t encenderLinternaHandler(httpd_req_t* req) {
  digitalWrite(FLASH_GPIO_NUM, HIGH);   // LED flash ON
  Serial.println("Linterna encendida");

  httpd_resp_set_type(req, "text/plain");
  return httpd_resp_send(req, "Linterna encendida", HTTPD_RESP_USE_STRLEN);
}

// =====================================================
// APAGAR LINTERNA  →  GET /linterna/off
// =====================================================
static esp_err_t apagarLinternaHandler(httpd_req_t* req) {
  digitalWrite(FLASH_GPIO_NUM, LOW);    // LED flash OFF
  Serial.println("Linterna apagada");

  httpd_resp_set_type(req, "text/plain");
  return httpd_resp_send(req, "Linterna apagada", HTTPD_RESP_USE_STRLEN);
}
`,
    },
    {
        id: 'camara',
        label: 'Cámara',
        title: 'Inicio de cámara y captura QR',
        summary:
            'Configura la OV2640 en JPEG QVGA. GET /captura devuelve una foto para que jsQR (en el navegador) lea el código de la mesa.',
        code: `// =====================================================
// INICIAR CÁMARA (resumen de iniciarCamara)
// =====================================================
bool iniciarCamara() {
  camera_config_t config = {};

  // Asigna todos los pines Y2..Y9, XCLK, PCLK, etc.
  config.pin_d0 = Y2_GPIO_NUM;
  // ... (resto de pines de la placa AI-Thinker)

  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size   = FRAMESIZE_QVGA; // 320x240 (rápido para QR)
  config.jpeg_quality = 12;             // menor = mejor calidad

  if (psramFound()) {
    config.fb_count = 2;                // doble buffer en PSRAM
    config.fb_location = CAMERA_FB_IN_PSRAM;
  } else {
    config.fb_count = 1;                // un frame en DRAM
  }

  return esp_camera_init(&config) == ESP_OK;
}

// =====================================================
// CAPTURA DE UNA FOTO  →  GET /captura
// Laravel / navegador usa esta imagen para detectar QR
// =====================================================
static esp_err_t capturaHandler(httpd_req_t* req) {
  camera_fb_t* frame = esp_camera_fb_get(); // toma un frame

  if (!frame) {
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }

  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  esp_err_t resultado = httpd_resp_send(
    req,
    reinterpret_cast<const char*>(frame->buf),
    frame->len
  );

  esp_camera_fb_return(frame); // libera el buffer
  return resultado;
}
`,
    },
    {
        id: 'http',
        label: 'Rutas HTTP',
        title: 'Servidor web: registro de endpoints',
        summary:
            'Aquí se “publican” las URLs que Laravel o el celular pueden llamar. Es el contrato real del ESP32.',
        code: `// =====================================================
// REGISTRO DE RUTAS HTTP (puerto 80)
// =====================================================
void iniciarServidores() {
  httpd_config_t configWeb = HTTPD_DEFAULT_CONFIG();
  configWeb.server_port = 80;
  configWeb.max_uri_handlers = 13;

  // Página principal de control
  httpd_uri_t paginaUri = {
    .uri = "/", .method = HTTP_GET,
    .handler = paginaPrincipalHandler
  };

  // Linterna
  httpd_uri_t linternaOnUri  = { .uri = "/linterna/on",  .method = HTTP_GET, .handler = encenderLinternaHandler };
  httpd_uri_t linternaOffUri = { .uri = "/linterna/off", .method = HTTP_GET, .handler = apagarLinternaHandler };

  // Video continuo (MJPEG)
  httpd_uri_t streamWebUri = { .uri = "/stream", .method = HTTP_GET, .handler = streamHandler };

  // Foto única para QR
  httpd_uri_t capturaUri = { .uri = "/captura", .method = HTTP_GET, .handler = capturaHandler };

  // Librería jsQR servida desde la flash del ESP32
  httpd_uri_t jsqrUri = { .uri = "/jsqr.js", .method = HTTP_GET, .handler = jsqrHandler };

  // Distancia ultrasónica (JSON)
  httpd_uri_t distanciaUri = { .uri = "/distancia", .method = HTTP_GET, .handler = distanciaHandler };

  if (httpd_start(&servidorWeb, &configWeb) == ESP_OK) {
    httpd_register_uri_handler(servidorWeb, &paginaUri);
    httpd_register_uri_handler(servidorWeb, &linternaOnUri);
    httpd_register_uri_handler(servidorWeb, &linternaOffUri);
    httpd_register_uri_handler(servidorWeb, &streamWebUri);
    httpd_register_uri_handler(servidorWeb, &capturaUri);
    httpd_register_uri_handler(servidorWeb, &jsqrUri);
    httpd_register_uri_handler(servidorWeb, &distanciaUri);
    Serial.println("Servidor web iniciado");
  }
}

/*
 * Relación con Laravel (esta plataforma):
 *   ROBOT_MODE=real
 *   ESP32_BASE_URL=http://192.168.4.1
 *
 * Laravel /api/robot/* puede reenviar a estas rutas del ESP32.
 */
`,
    },
    {
        id: 'setup',
        label: 'Setup',
        title: 'setup() y loop()',
        summary:
            'Arranque del robot: Serial, linterna, ultrasónico, cámara, Access Point Wi‑Fi y servidores HTTP. El loop solo espera; el HTTP trabaja solo.',
        code: `// =====================================================
// ARRANQUE DEL ROBOT
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("Iniciando ESP32-CAM");

  // Linterna apagada al inicio
  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, LOW);

  // Sensor de obstáculos
  iniciarUltrasonico();
  Serial.println("HC-SR04 listo en GPIO13 (TRIG) y GPIO14 (ECHO)");

  // Cámara (necesaria para QR y stream)
  if (!iniciarCamara()) {
    Serial.println("No se pudo iniciar la cámara");
    return;
  }

  // Crea red Wi‑Fi propia (el celular/PC se conecta a ella)
  WiFi.mode(WIFI_AP);
  bool wifiCreado = WiFi.softAP(WIFI_NOMBRE, WIFI_CLAVE);

  if (!wifiCreado) {
    Serial.println("No se pudo crear la red Wi‑Fi");
    return;
  }

  delay(500);
  iniciarServidores();   // HTTP + stream

  Serial.print("Red Wi‑Fi: ");
  Serial.println(WIFI_NOMBRE);
  Serial.print("IP: ");
  Serial.println(WiFi.softAPIP()); // normalmente 192.168.4.1
  Serial.println("Abrir: http://192.168.4.1");
}

// =====================================================
// LOOP PRINCIPAL
// El servidor HTTP atiende peticiones en tareas internas.
// Aquí no hace falta lógica pesada.
// =====================================================
void loop() {
  delay(1000);
}
`,
    },
];
