<?php
use App\Http\Controllers\SystemController;
use Illuminate\Support\Facades\Route;

// Lightweight probes for load balancers and uptime monitoring.
Route::get('/health', [SystemController::class, 'health']);
Route::get('/ready', [SystemController::class, 'ready']);
