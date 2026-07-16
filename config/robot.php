<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Modo del robot
    |--------------------------------------------------------------------------
    | simulation = respuestas locales (demo)
    | real = reenvía comandos al ESP32 en ESP32_BASE_URL
    */
    'mode' => env('ROBOT_MODE', 'simulation'),

    /*
    |--------------------------------------------------------------------------
    | URL base del ESP32 (sin slash final)
    | Ejemplo: http://192.168.1.50
    */
    'esp32_base_url' => env('ESP32_BASE_URL', 'http://192.168.4.1'),

    /*
    |--------------------------------------------------------------------------
    | Timeout HTTP hacia el ESP32 (segundos)
    */
    'timeout' => (int) env('ESP32_TIMEOUT', 3),

    /*
    |--------------------------------------------------------------------------
    | Mapeo de mesas → código QR esperado por la cámara
    */
    'mesas' => [
        1 => 'M1',
        2 => 'M2',
        3 => 'M3',
        4 => 'M4',
    ],
];
