<?php

use App\Http\Controllers\Api\RobotController;
use Illuminate\Support\Facades\Route;

Route::prefix('robot')->group(function () {
    Route::get('config', [RobotController::class, 'config']);
    Route::get('estado', [RobotController::class, 'estado']);
    Route::get('sensores/distancia', [RobotController::class, 'distancia']);

    Route::post('goto', [RobotController::class, 'gotoMesa']);
    Route::post('regresar-base', [RobotController::class, 'regresarBase']);
    Route::post('emergencia', [RobotController::class, 'emergencia']);
    Route::post('reactivar', [RobotController::class, 'reactivar']);

    Route::prefix('manual')->group(function () {
        Route::post('avanzar', [RobotController::class, 'avanzar']);
        Route::post('retroceder', [RobotController::class, 'retroceder']);
        Route::post('izquierda', [RobotController::class, 'izquierda']);
        Route::post('derecha', [RobotController::class, 'derecha']);
        Route::post('detener', [RobotController::class, 'detener']);
        Route::post('velocidad', [RobotController::class, 'velocidad']);
    });

    Route::prefix('camara')->group(function () {
        Route::post('encender', [RobotController::class, 'camaraEncender']);
        Route::post('apagar', [RobotController::class, 'camaraApagar']);
    });

    Route::prefix('linterna')->group(function () {
        Route::post('encender', [RobotController::class, 'linternaEncender']);
        Route::post('apagar', [RobotController::class, 'linternaApagar']);
    });
});
